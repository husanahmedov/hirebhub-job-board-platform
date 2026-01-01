import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RegisterUserInput, User } from '../../libs/dto/user';
import { Model } from 'mongoose';
import {
	UserCreationFailedException,
	UserAlreadyExistsException,
	DatabaseException,
	ErrorCode,
	LoginUserInput,
	UserNotFoundException,
	InvalidCredentialsException,
	UserStatus,
	UserDeactivatedException,
	UserSuspendedException,
} from '../../libs';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UserService {
	constructor(
		@InjectModel('User') private userModel: Model<User>,
		private readonly authService: AuthService,
	) {}

	public async register(input: RegisterUserInput): Promise<User> {
		input.passwordHash = await this.authService.hashPassword(input.passwordHash);
		try {
			// Check if user already exists
			const existingUser = await this.userModel.findOne({ email: input.email });
			if (existingUser) {
				throw new UserAlreadyExistsException({ email: input.email });
			}

			// Create new user
			const newUser = await this.userModel.create(input);
			newUser.accessToken = await this.authService.createToken(newUser);

			return newUser;
		} catch (error) {
			// If it's already one of our custom exceptions, re-throw it
			if (error instanceof UserAlreadyExistsException) {
				throw error;
			}

			// Handle MongoDB duplicate key error
			if (error.name === 'MongoServerError' && error.code === 11000) {
				const field = Object.keys(error.keyValue || {})[0];
				throw new UserAlreadyExistsException({ field, value: error.keyValue[field] });
			}

			// Handle validation errors
			if (error.name === 'ValidationError') {
				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, error.errors);
			}

			// Throw generic error
			throw new UserCreationFailedException({
				originalError: error.message,
				input: { email: input.email },
			});
		}
	}

	public async login(input: LoginUserInput): Promise<User> {
		try {
			const user = await this.userModel
				.findOne({
					email: input.email,
				})
				.select('+passwordHash')
				.exec();
			if (!user) {
				throw new UserNotFoundException(`User has not been found with given email ${input.email}`);
			}
			if (user.status === UserStatus.DEACTIVATED) {
				throw new UserDeactivatedException(`'User has been deactivated ${input.email}`);
			}
			if (user.status === UserStatus.SUSPENDED) {
				throw new UserSuspendedException(`'User has been suspended ${input.email}`);
			}
			const isMatch = await this.authService.comparePassword(input.passwordHash, user.passwordHash as string);
			if (!isMatch) {
				throw new InvalidCredentialsException({
					message: 'Your password or email is wrong',
					input: { email: input.email },
				});
			}
			user.accessToken = await this.authService.createToken(user);
			return user;
		} catch (error) {
			if (error instanceof UserNotFoundException) {
				throw error;
			}
			if (error instanceof InvalidCredentialsException) {
				throw error;
			}
			throw new InternalServerErrorException('An error occurred during login');
		}
	}
}
