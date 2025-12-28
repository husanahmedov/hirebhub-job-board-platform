import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RegisterUserInput, User } from '../../libs/dto/user';
import { Model } from 'mongoose';

@Injectable()
export class UserService {
	constructor(@InjectModel('User') private userModel: Model<User>) {}

	public async register(input: RegisterUserInput): Promise<User> {
		const newUser = new this.userModel(input);
		return await newUser.save();
	}
}
