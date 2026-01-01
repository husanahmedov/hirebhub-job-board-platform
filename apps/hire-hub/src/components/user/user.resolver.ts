import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { UserService } from './user.service';
import { RegisterUserInput, User } from '../../libs/dto/user';
import { LoginUserInput, PublicUser, UpdateUserInput, UserRole } from '../../libs';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthUser } from '../auth/decorators/authUser.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import type { ObjectId } from 'mongoose';

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

	/**
	 * Update authenticated user's own profile data
	 *
	 * This mutation allows a logged-in user to update their own profile information.
	 * Users can modify their basic details like name, email, and profile data, but cannot
	 * change privileged fields such as role or account status (admin-only operations).
	 *
	 * @param input - The update data with optional fields to modify
	 * @param userId - The authenticated user's ID (automatically extracted from JWT token)
	 * @returns Promise<PublicUser> - The updated user object without sensitive data
	 *
	 * @throws {UserNotFoundException} - If the authenticated user doesn't exist
	 * @throws {UserAlreadyExistsException} - If the new email is already taken
	 * @throws {DatabaseException} - If validation fails or database error occurs
	 * @throws {InternalServerErrorException} - If update fails for unexpected reasons
	 *
	 * @security
	 * - Requires authentication (AuthGuard)
	 * - Requires CANDIDATE role (RolesGuard)
	 * - Users can only update their own profile
	 * - Cannot modify role, status, or other privileged fields
	 *
	 * @example
	 * mutation {
	 *   updateUserByUser(input: {
	 *     firstName: "Jane"
	 *     lastName: "Smith"
	 *     email: "jane.smith@example.com"
	 *     profile: {
	 *       location: { city: "San Francisco", region: "CA", country: USA }
	 *     }
	 *   }) {
	 *     _id
	 *     email
	 *     fullName
	 *     status
	 *     profile {
	 *       location {
	 *         city
	 *         region
	 *         country
	 *       }
	 *     }
	 *     updatedAt
	 *   }
	 * }
	 */
	@Roles(UserRole.CANDIDATE)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Mutation(() => PublicUser, {
		description: "Update authenticated user's own profile data (name, email, profile)",
	})
	public async updateUserByUser(
		@Args('input', { type: () => UpdateUserInput, description: 'User update data with optional fields' })
		input: UpdateUserInput,
		@AuthUser('_id') userId: ObjectId,
	): Promise<PublicUser> {
		console.log(`--- @mutation() Update User by User is called: ${userId} ---`);
		return await this.userService.updateUserByUser(userId, input);
	}

	/**
	 * Update any user's profile data by admin (privileged operation)
	 *
	 * This mutation allows an administrator to update any user's profile information,
	 * including privileged fields like account status and role. This is useful for
	 * account management, moderation, and administrative tasks.
	 *
	 * @param targetUserId - The ID of the user to update
	 * @param input - The update data with optional fields to modify
	 * @returns Promise<PublicUser> - The updated user object without sensitive data
	 *
	 * @throws {UserNotFoundException} - If the target user doesn't exist
	 * @throws {UserAlreadyExistsException} - If the new email is already taken
	 * @throws {DatabaseException} - If validation fails or database error occurs
	 * @throws {InternalServerErrorException} - If update fails for unexpected reasons
	 *
	 * @security
	 * - Requires authentication (AuthGuard)
	 * - Requires ADMIN role (RolesGuard)
	 * - Admin can update any user including privileged fields
	 * - Cannot modify password (requires separate endpoint)
	 *
	 * @example
	 * mutation {
	 *   updateUserByAdmin(
	 *     targetUserId: "507f1f77bcf86cd799439011"
	 *     input: {
	 *       status: SUSPENDED
	 *       email: "updated@example.com"
	 *     }
	 *   ) {
	 *     _id
	 *     email
	 *     fullName
	 *     status
	 *     role
	 *     updatedAt
	 *   }
	 * }
	 */
	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Mutation(() => PublicUser, {
		description: "Admin update any user's profile data including privileged fields (status, role)",
	})
	public async updateUserByAdmin(
		@Args('targetUserId', { type: () => String, description: 'The ID of the user to update' })
		targetUserId: string,
		@Args('input', { type: () => UpdateUserInput, description: 'User update data with optional fields' })
		input: UpdateUserInput,
	): Promise<PublicUser> {
		console.log(`--- @mutation() Update User by Admin is called for user: ${targetUserId} ---`);
		const objectId = shapeIntoMongoObjectId(targetUserId);
		return await this.userService.updateUserByAdmin(objectId, input);
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
