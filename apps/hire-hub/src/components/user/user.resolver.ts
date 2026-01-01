import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UserService } from './user.service';
import { RegisterUserInput, User } from '../../libs/dto/user';
import { LoginUserInput } from '../../libs';

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
}