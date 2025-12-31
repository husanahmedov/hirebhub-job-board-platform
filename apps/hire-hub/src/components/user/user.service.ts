import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RegisterUserInput, User } from '../../libs/dto/user';
import { Model } from 'mongoose';
import {
	LoggerUtil,
	UserCreationFailedException,
	UserAlreadyExistsException,
	DatabaseException,
	ErrorCode,
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

			LoggerUtil.success('User registered successfully', `Email: ${savedUser.email}`);
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

			// Log and throw generic error
			LoggerUtil.error('User Registration Failed', error);
			throw new UserCreationFailedException({
				originalError: error.message,
				input: { email: input.email },
			});
		}
	}
}
