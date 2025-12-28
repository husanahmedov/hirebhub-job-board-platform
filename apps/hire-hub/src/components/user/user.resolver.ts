import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UserService } from './user.service';
import { RegisterUserInput, User } from '../../libs/dto/user';
import { LoggerUtil } from '../../libs';

@Resolver()
export class UserResolver {
	constructor(private readonly userService: UserService) {}

	@Mutation(() => User)
	public async register(@Args('input') input: RegisterUserInput): Promise<User> {
		try {
			return await this.userService.register(input);
		} catch (error) {
			LoggerUtil.error('Error registering user', error);
			throw new Error('Failed to register user');
		}
	}
}
