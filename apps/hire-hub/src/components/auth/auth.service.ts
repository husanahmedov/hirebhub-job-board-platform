import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../libs';
import { shapeIntoMongoObjectId } from '../../libs/config';

import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
	constructor(private readonly jwtService: JwtService) {}

	public async hashPassword(password: string): Promise<string> {
		const salt = await bcrypt.genSalt(10);
		return await bcrypt.hash(password, salt);
	}

	public async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
		return await bcrypt.compare(password, hashedPassword);
	}

	public async createToken(data: any): Promise<string> {
		// Convert to plain object with virtuals if it's a Mongoose document
		const userData = data.toObject ? data.toObject() : data;

		// create payload without sensitive data
		const { passwordHash, ...payload } = userData;
		return await this.jwtService.signAsync(payload);
	}

	public async verifyToken(token: string): Promise<User> {
		const user = await this.jwtService.verifyAsync<User>(token);
		user._id = shapeIntoMongoObjectId(user._id);

		// Convert date strings back to Date objects
		if (user.createdAt && typeof user.createdAt === 'string') {
			user.createdAt = new Date(user.createdAt);
		}
		if (user.updatedAt && typeof user.updatedAt === 'string') {
			user.updatedAt = new Date(user.updatedAt);
		}
		if (user.deletedAt && typeof user.deletedAt === 'string') {
			user.deletedAt = new Date(user.deletedAt);
		}

		return user;
	}
}
