import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { UserService } from './user.service';
import { RegisterUserInput, User } from '../../libs/dto/user';
import { LoginUserInput, PublicUser, UserRole } from '../../libs';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthUser } from '../auth/decorators/authUser.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Resolver()
export class UserResolver {
	constructor(private readonly userService: UserService) {}

	/**
	 * Register a new user account
	 *
	 * This mutation creates a new user account in the system with the provided registration data.
	 * It validates all input fields, checks for existing users, hashes the password, and returns
	 * the newly created user with an access token for immediate authentication.
	 *
	 * @param input - The registration data including email, password, name, role, and profile
	 * @returns Promise<User> - The newly created user object with access token
	 *
	 * @throws {UserAlreadyExistsException} - If email is already registered
	 * @throws {DatabaseException} - If validation fails or database error occurs
	 * @throws {UserCreationFailedException} - If user creation fails for any other reason
	 *
	 * @example
	 * mutation {
	 *   register(input: {
	 *     email: "john@example.com"
	 *     passwordHash: "SecurePass123!"
	 *     firstName: "John"
	 *     lastName: "Doe"
	 *     role: JOB_SEEKER
	 *     profile: { location: { city: "NYC", region: "NY", country: USA } }
	 *   }) {
	 *     _id
	 *     email
	 *     fullName
	 *     accessToken
	 *   }
	 * }
	 */
	@Mutation(() => User, {
		description: 'Register a new user account with email, password, and profile information',
	})
	public async register(
		@Args('input', { type: () => RegisterUserInput, description: 'User registration data' })
		input: RegisterUserInput,
	): Promise<User> {
		return await this.userService.register(input);
	}

	/**
	 * Authenticate and login an existing user
	 *
	 * This mutation authenticates a user with their email and password credentials.
	 * It validates the credentials, checks account status, and returns the user
	 * object with a fresh access token for authenticated API requests.
	 *
	 * @param input - Login credentials containing email and password
	 * @returns Promise<User> - The authenticated user object with access token
	 *
	 * @throws {UserNotFoundException} - If no user exists with the provided email
	 * @throws {InvalidCredentialsException} - If password doesn't match
	 * @throws {UserDeactivatedException} - If user account has been deactivated
	 * @throws {UserSuspendedException} - If user account has been suspended
	 * @throws {InternalServerErrorException} - If login fails for unexpected reasons
	 *
	 * @example
	 * mutation {
	 *   login(input: {
	 *     email: "john@example.com"
	 *     passwordHash: "SecurePass123!"
	 *   }) {
	 *     _id
	 *     email
	 *     fullName
	 *     role
	 *     status
	 *     accessToken
	 *     createdAt
	 *   }
	 * }
	 */
	@Mutation(() => User, {
		description: 'Authenticate user with email and password, returns user with access token',
	})
	public async login(
		@Args('input', { type: () => LoginUserInput, description: 'User login credentials (email and password)' })
		input: LoginUserInput,
	): Promise<User> {
		return await this.userService.login(input);
	}

	@UseGuards(AuthGuard)
	@Query(() => PublicUser)
	public async checkAuthenticatedUser(@AuthUser() user: PublicUser): Promise<PublicUser> {
		console.info('--- @resolver() Authentication [checkAuthenticatedUser] ---');
		return {
			...user,
			message: 'User is authenticated',
		};
	}

	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Query(() => PublicUser)
	public async checkAuthRoles(@AuthUser() user: PublicUser): Promise<PublicUser> {
		console.log('--- @query() Check auth Roles is queried: ${user} ---');
		return {
			...user,
			message: 'User has proper roles to access this resource',
		};
	}
}
