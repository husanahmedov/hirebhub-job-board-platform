import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UserService } from './user.service';
import { RegisterUserInput, User } from '../../libs/dto/user';
import { LoginUserInput, PublicUser } from '../../libs';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthUser } from '../auth/decorators/authUser.decorator';

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
	@Mutation(() => PublicUser)
	public async checkAuthenticatedUser(@AuthUser() user: PublicUser): Promise<PublicUser> {
		console.info('--- @resolver() Authentication [checkAuthenticatedUser] ---');
		return {
			...user,
			message: 'User is authenticated',
		};
	}
}
