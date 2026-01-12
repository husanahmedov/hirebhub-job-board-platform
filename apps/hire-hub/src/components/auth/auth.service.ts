import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, TokenExpiredException } from '../../libs';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { EnvUtil } from '../../libs/env.util';

import * as bcrypt from 'bcryptjs';

/**
 * Token expiration times
 */
const ACCESS_TOKEN_EXPIRATION = '1d'; // 1 day
const REFRESH_TOKEN_EXPIRATION = '7d'; // 7 days

@Injectable()
export class AuthService {
	constructor(private readonly jwtService: JwtService) {}

	/**
	 * Hash a password using bcrypt
	 * @param password - Plain text password
	 * @returns Hashed password
	 */
	public async hashPassword(password: string): Promise<string> {
		const salt = await bcrypt.genSalt(10);
		return await bcrypt.hash(password, salt);
	}

	/**
	 * Compare a plain text password with a hashed password
	 * @param password - Plain text password
	 * @param hashedPassword - Hashed password to compare against
	 * @returns True if passwords match
	 */
	public async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
		return await bcrypt.compare(password, hashedPassword);
	}

	/**
	 * Create an access token (short-lived)
	 * @param data - User data or Mongoose document
	 * @returns JWT access token
	 */
	public async createToken(data: any): Promise<string> {
		// Convert to plain object with virtuals if it's a Mongoose document
		const userData = data.toObject ? data.toObject() : data;

		// create payload without sensitive data
		const { passwordHash, refreshToken, ...payload } = userData;

		return await this.jwtService.signAsync(payload, {
			secret: EnvUtil.getJwtSecret(),
			expiresIn: ACCESS_TOKEN_EXPIRATION,
		});
	}

	/**
	 * Create a refresh token (long-lived)
	 * @param data - User data or Mongoose document
	 * @returns JWT refresh token
	 */
	public async createRefreshToken(data: any): Promise<string> {
		// Convert to plain object with virtuals if it's a Mongoose document
		const userData = data.toObject ? data.toObject() : data;

		// Create minimal payload for refresh token (only user ID and email)
		const payload = {
			_id: userData._id,
			email: userData.email,
		};

		return await this.jwtService.signAsync(payload, {
			secret: EnvUtil.getJwtRefreshSecret(),
			expiresIn: REFRESH_TOKEN_EXPIRATION,
		});
	}

	/**
	 * Verify an access token
	 * @param token - JWT access token
	 * @returns Decoded user data
	 */
	public async verifyToken(token: string): Promise<User> {
		try {
			const user = await this.jwtService.verifyAsync<User>(token, {
				secret: EnvUtil.getJwtSecret(),
			});

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
		} catch (error) {
			throw new TokenExpiredException('Invalid or expired access token');
		}
	}

	/**
	 * Verify a refresh token
	 * @param token - JWT refresh token
	 * @returns Decoded minimal user data (id, email)
	 */
	public async verifyRefreshToken(token: string): Promise<{ _id: any; email: string }> {
		const payload = await this.jwtService.verifyAsync<{ _id: any; email: string }>(token, {
			secret: EnvUtil.getJwtRefreshSecret(),
		});
		payload._id = shapeIntoMongoObjectId(payload._id);
		return payload;
	}

	/**
	 * Get access token expiration date
	 * @returns Date when access token expires
	 */
	public getAccessTokenExpiration(): Date {
		// Convert '1d' to milliseconds: 1 * 24 * 60 * 60 * 1000
		const expirationMs = 1 * 24 * 60 * 60 * 1000;
		return new Date(Date.now() + expirationMs);
	}

	/**
	 * Get refresh token expiration date
	 * @returns Date when refresh token expires
	 */
	public getRefreshTokenExpiration(): Date {
		// Convert '7d' to milliseconds: 7 * 24 * 60 * 60 * 1000
		const expirationMs = 7 * 24 * 60 * 60 * 1000;
		return new Date(Date.now() + expirationMs);
	}

	/**
	 * Hash a refresh token for secure storage in database
	 * @param refreshToken - Plain refresh token
	 * @returns Hashed refresh token
	 */
	public async hashRefreshToken(refreshToken: string): Promise<string> {
		const salt = await bcrypt.genSalt(10);
		return await bcrypt.hash(refreshToken, salt);
	}

	/**
	 * Compare a refresh token with its hashed version
	 * @param refreshToken - Plain refresh token
	 * @param hashedRefreshToken - Hashed refresh token from database
	 * @returns True if tokens match
	 */
	public async compareRefreshToken(refreshToken: string, hashedRefreshToken: string): Promise<boolean> {
		return await bcrypt.compare(refreshToken, hashedRefreshToken);
	}
}
