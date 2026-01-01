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

	@Mutation(() => User)
	public async register(@Args('input') input: RegisterUserInput): Promise<User> {
		return this.userService.register(input);
	}

	@Mutation(() => User)
	public async login(@Args('input') input: LoginUserInput): Promise<User> {
		return this.userService.login(input);
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
