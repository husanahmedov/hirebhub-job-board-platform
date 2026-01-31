import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { SessionOutput } from '../../libs/dto/sessions/output';

import type { ObjectId } from 'mongoose';
import { SessionInput } from '../../libs/dto/sessions/input';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Injectable()
export class SessionsService {
	constructor(@InjectModel('Session') private sessionModel: Model<SessionOutput>) {}

	async createSession(
		userId: string,
		deviceInfo: SessionInput,
		jwtToken: string,
		ipAddress: string,
		location: any,
	): Promise<SessionOutput> {
		const tokenHash = this.hashToken(jwtToken);
		const shapedUserId = shapeIntoMongoObjectId(userId);

		// Create a new session for this login
		const session = new this.sessionModel({
			userId: shapedUserId,
			token: tokenHash,
			deviceName: deviceInfo.deviceName,
			deviceType: deviceInfo.deviceType,
			browser: deviceInfo.browser,
			os: deviceInfo.os,
			ipAddress: ipAddress,
			location: location,
			lastUsedAt: new Date(),
			expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
			isActive: true,
		});

		return await session.save();
	}

	/***
	 * API: GET USER SESSIONS
	 ***/
	async getUserSessions(userId: ObjectId, currentToken?: string): Promise<SessionOutput[]> {
		const sessions = await this.sessionModel
			.find({
				userId,
				expiresAt: { $gt: new Date() },
			})
			.sort({ lastUsedAt: -1 })
			.exec();

		// If currentToken is provided, mark the current session and sort it to the top
		if (currentToken) {
			const currentTokenHash = this.hashToken(currentToken);
			const mappedSessions = sessions.map((session) => {
				const sessionObj = session.toObject() as any;
				return {
					...sessionObj,
					isCurrent: sessionObj.token === currentTokenHash,
				};
			});

			// Sort to put current session first
			return mappedSessions.sort((a, b) => {
				if (a.isCurrent) return -1;
				if (b.isCurrent) return 1;
				return 0;
			});
		}

		return sessions.map((session) => session.toObject());
	}

	/***
	 * API: GET SESSION BY ID
	 ***/
	async getSessionById(sessionId: string): Promise<SessionOutput | null> {
		return await this.sessionModel
			.findOne({
				_id: sessionId,
				isActive: true,
			})
			.exec();
	}

	/***
	 * FEATURE: UPDATE SESSION ACTIVITY
	 ***/
	async updateSessionActivity(token: string, newToken: string): Promise<void> {
		const tokenHash = this.hashToken(token); // old token
		const newTokenHash = this.hashToken(newToken); // new token
		try {
			const isValid = await this.validateSession(token);
			if (isValid) {
				await this.sessionModel
					.updateOne({ token: tokenHash }, { lastUsedAt: new Date(), token: newTokenHash, isActive: true })
					.exec();
			}
		} catch (error) {
			// Invalid session, do nothing
		}
	}

	/***
	 * SECURITY: REVOKE SESSION
	 ***/
	async revokeSession(userId: ObjectId, token: string): Promise<void> {
		const tokenHash = this.hashToken(token);
		await this.sessionModel.deleteOne({ token: tokenHash, userId }).exec();
	}

	/***
	 * SECURITY: REVOKE ALL SESSIONS
	 ***/
	async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
		const query: any = { userId, isActive: true };

		if (exceptSessionId) {
			query._id = { $ne: exceptSessionId };
		}

		await this.sessionModel.updateMany(query, { isActive: false }).exec();
	}

	/***
	 * PERFORMANCE: CLEANUP EXPIRED SESSIONS
	 ***/
	async cleanupExpiredSessions(): Promise<void> {
		await this.sessionModel
			.deleteMany({
				expiresAt: { $lt: new Date() },
			})
			.exec();
	}

	/***
	 * SECURITY: VALIDATE SESSION
	 ***/
	async validateSession(token: string): Promise<SessionOutput | null> {
		const tokenHash = this.hashToken(token);
		return await this.sessionModel
			.findOne({
				token: tokenHash,
			})
			.exec();
	}

	// ============================================
	// * HASH TOKEN
	//INFO - Hashes the JWT token using SHA-256 for secure storage
	// ============================================
	private hashToken(token: string): string {
		return crypto.createHash('sha256').update(token).digest('hex');
	}
}
