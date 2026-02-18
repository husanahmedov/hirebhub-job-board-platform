import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { MessageResponse, SessionOutput } from '../../libs/dto/sessions/output';

import type { ObjectId } from 'mongoose';
import { SessionInput } from '../../libs/dto/sessions/input';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Injectable()
export class SessionsService {
	constructor(@InjectModel('Session') private sessionModel: Model<SessionOutput>) {}

	/******************************************************
	 * [SERVICE]: CREATE SESSION
	 * @param userId - The ID of the user for whom the session is being created
	 * @param deviceInfo - Information about the device from which the user is logging in (e.g., device name, type, browser, OS)
	 * @param jwtToken - The JWT token associated with this session (will be hashed before storage)
	 * @param ipAddress - The IP address from which the login is occurring
	 * @param location - Geographical location information derived from the IP address
	 * @returns The details of the created session, including its ID and metadata
	 * * This method is called during the login process to create a new session record in the database.
	 ******************************************************/
	async createSession(
		userId: string,
		deviceInfo: SessionInput,
		jwtToken: string,
		ipAddress: string,
		location: any,
	): Promise<SessionOutput> {
		const tokenHash = this.hashToken(jwtToken);
		const shapedUserId = shapeIntoMongoObjectId(userId);

		// prevent duplicate sessions when user logs in multiple times from the same device within a short period
		const existingSession = await this.sessionModel.findOne({
			userId: shapedUserId,
			deviceName: deviceInfo.deviceName,
			deviceType: deviceInfo.deviceType,
			browser: deviceInfo.browser,
			os: deviceInfo.os,
			ipAddress: ipAddress,
			expiresAt: { $gt: new Date() },
		});

		if (existingSession) {
			// Update the existing session's lastUsedAt and token
			existingSession.lastUsedAt = new Date();
			existingSession.token = tokenHash;
			existingSession.isActive = true;
			const updatedSession = await existingSession.save();
			const sessionObj = updatedSession.toObject() as any;
			return {
				...sessionObj,
				id: sessionObj._id?.toString(),
				isCurrent: false,
			} as SessionOutput;
		}

		const existingSessionsCount = await this.sessionModel.countDocuments({
			userId: shapedUserId,
			expiresAt: { $gt: new Date() },
		});

		// if max sessions are 5, delete the oldest session if user already has 5 active sessions
		if (existingSessionsCount >= 5) {
			const oldestSession = await this.sessionModel
				.findOne({
					userId: shapedUserId,
					expiresAt: { $gt: new Date() },
				})
				.sort({ lastUsedAt: 1 })
				.exec();

			if (oldestSession) {
				await this.sessionModel.deleteOne({ _id: oldestSession._id }).exec();
			}
		}

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

		const savedSession = await session.save();
		const sessionObj = savedSession.toObject() as any;
		return {
			...sessionObj,
			id: sessionObj._id?.toString(),
			isCurrent: false,
		} as SessionOutput;
	}

	/******************************************************
	 * [SERVICE]: GET USER SESSIONS
	 * @param userId - The ID of the user whose sessions to retrieve
	 * @param currentToken - (Optional) The current session token to identify and mark the active session
	 * @returns A list of active sessions for the user, with the current session marked if token is provided
	 * * This method is used to display active sessions in the user's account settings and can also
	 * *  be used internally for session management features.
	 ******************************************************/
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
					id: sessionObj._id?.toString(),
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

		return sessions.map((session) => {
			const sessionObj = session.toObject() as any;
			return {
				...sessionObj,
				id: sessionObj._id?.toString(),
				isCurrent: false,
			};
		});
	}

	/**************************************************************
	 * [SERVICE]: GET SESSION BY ID
	 * @param sessionId - The ID of the session to retrieve
	 * @returns The session details if found and active, or null if not found/expired/revoked
	 * * This method is used internally to validate sessions and can also be exposed via API
	 * *  for session management features.
	 ***************************************************************/
	async getSessionById(sessionId: string): Promise<SessionOutput | null> {
		const session = await this.sessionModel
			.findOne({
				_id: sessionId,
				isActive: true,
			})
			.exec();

		if (!session) {
			return null;
		}

		// Convert Mongoose document to plain object and map _id to id
		const sessionObj = session.toObject() as any;
		return {
			...sessionObj,
			id: sessionObj._id?.toString(),
			isCurrent: false,
		} as SessionOutput;
	}

	/***************************************************************
	 * FEATURE: UPDATE SESSION ACTIVITY
	 * @param token - The raw session token to identify which session to update
	 * @param newToken - (Optional) A new token to replace the old one (e.g., after refresh)
	 * * This method can be called whenever a session is validated to update its lastUsedAt
	 * * timestamp, ensuring that idle timeout is based on actual activity.
	 ***************************************************************/
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

	/****************************************************************
	 * [SERVICE]: REVOKE SESSION
	 * * Revokes a specific session by its ID, ensuring that only the owner of the session can revoke it.
	 * @param userId - The ID of the user who owns the session
	 * @param sessionId - The ID of the session to revoke
	 ****************************************************************/
	async revokeSession(userId: ObjectId, _id: string): Promise<MessageResponse> {
		await this.sessionModel.deleteOne({ _id, userId }).exec();
		return { message: 'Session revoked successfully', success: true };
	}

	/**************************************************************
	 * [SERVICE]: REVOKE ALL SESSIONS
	 * @param userId - The ID of the user whose sessions should be revoked
	 * @param exceptSessionToken - (Optional) A session token to exclude from revocation (e.g., current session)
	 ************************************************************/
	async revokeAllSessions(userId: ObjectId, exceptSessionToken?: string): Promise<MessageResponse> {
		const query: any = { userId };

		try {
			if (exceptSessionToken) {
				query.token = { $ne: this.hashToken(exceptSessionToken) };
			}

			await this.sessionModel.deleteMany(query).exec();
			return { message: 'All sessions revoked successfully', success: true };
		} catch (error) {
			throw new NotFoundException('No active sessions found to revoke.');
		}
	}

	/*************************************************************
	 * [SERVICE]: CLEANUP EXPIRED SESSIONS
	 * * This method can be called periodically (e.g., via a scheduled job) to
	 * * remove expired sessions from the database,
	 * * ensuring that the session store remains clean and performant.
	 ************************************************************/
	async cleanupExpiredSessions(): Promise<void> {
		await this.sessionModel
			.deleteMany({
				expiresAt: { $lt: new Date() },
			})
			.exec();
	}

	/*****************************************************************
	 * [SERVICE]: VALIDATE SESSION
	 * @param token - The raw session token to validate
	 * @returns The session details if valid, or null if invalid/expired/revoked
	 *****************************************************************/
	async validateSession(token: string): Promise<SessionOutput | null> {
		const tokenHash = this.hashToken(token);
		const session = await this.sessionModel
			.findOne({
				token: tokenHash,
			})
			.exec();

		if (!session) {
			return null;
		}

		// Convert Mongoose document to plain object and map _id to id
		const sessionObj = session.toObject() as any;
		return {
			...sessionObj,
			id: sessionObj._id?.toString(),
			isCurrent: false,
		} as SessionOutput;
	}

	/*****************************************************************
	 * [SERVICE]: HASH TOKEN
	 * * Hashes the session token using SHA-256 before storing it in the database for security.
	 * * This ensures that even if the database is compromised, the actual tokens cannot be easily retrieved or misused.
	 *****************************************************************
	 * @param token - The raw session token to be hashed
	 * @returns The SHA-256 hash of the token
	 *****************************************************************
	 * Note: This method is critical for security. Always ensure that tokens are hashed before storage and never log raw tokens.
	 *****************************************************************/
	private hashToken(token: string): string {
		return crypto.createHash('sha256').update(token).digest('hex');
	}
}
