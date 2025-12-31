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
} from '../../libs';

@Injectable()
export class UserService {
	constructor(@InjectModel('User') private userModel: Model<User>) {}

	public async register(input: RegisterUserInput): Promise<User> {
		try {
			// Check if user already exists
			const existingUser = await this.userModel.findOne({ email: input.email });
			if (existingUser) {
				throw new UserAlreadyExistsException({ email: input.email });
			}

			// Create new user
			const newUser = new this.userModel(input);
			const savedUser = await newUser.save();

			return savedUser;
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
					passwordHash: input.passwordHash,
				})
				.select('+passwordHash')
				.exec();
			if (!user) {
				throw new UserNotFoundException(`User has not been found with given email ${input.email}`);
			}
			const isMatch = (user as User).passwordHash === input.passwordHash;
			if (!isMatch) {
				throw new InvalidCredentialsException({
					message: 'Your password or email is wrong',
					input: { email: input.email },
				});
			}
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
