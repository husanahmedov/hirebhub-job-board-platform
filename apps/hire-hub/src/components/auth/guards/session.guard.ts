import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { SessionsService } from '../../sessions/sessions.service';
import { UnAuthenticatedException } from '../../../libs';

@Injectable()
export class SessionGuard implements CanActivate {
	// Idle timeout in days (30 days of inactivity = session invalid)
	private readonly IDLE_TIMEOUT_DAYS = 30;

	constructor(private sessionsService: SessionsService) {}

	async canActivate(context: ExecutionContext | any): Promise<boolean> {
		let request;

		// Extract request based on context type (GraphQL or HTTP)
		if (context.contextType === 'graphql') {
			request = context.getArgByIndex(2).req;
		} else if (context.contextType === 'http') {
			request = context.switchToHttp().getRequest();
		} else {
			return false;
		}

		// Extract refresh token from headers
		// You can use either authorization header or a custom header like 'x-refresh-token'
		const refreshToken = this.extractRefreshToken(request);

		if (!refreshToken) {
			throw context.contextType === 'graphql'
				? new UnAuthenticatedException('No session token provided. Please log in again.')
				: new HttpException('No session token provided. Please log in again.', 401);
		}

		// Validate session in database
		const session = await this.sessionsService.validateSession(refreshToken);
        

		if (!session) {
			throw context.contextType === 'graphql'
				? new UnAuthenticatedException('Session not found. Please log in again.')
				: new HttpException('Session not found. Please log in again.', 401);
		}

		// Check if session is active (not revoked)
		if (!session.isActive) {
			throw context.contextType === 'graphql'
				? new UnAuthenticatedException('Your session has been revoked. Please log in again.')
				: new HttpException('Your session has been revoked. Please log in again.', 401);
		}

		// Check if session has expired
		if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
			throw context.contextType === 'graphql'
				? new UnAuthenticatedException('Your session has expired. Please log in again.')
				: new HttpException('Your session has expired. Please log in again.', 401);
		}

		// Check idle timeout (if session hasn't been used in X days)
		const idleTimeoutMs = this.IDLE_TIMEOUT_DAYS * 24 * 60 * 60 * 1000;
		const lastUsedAt = new Date(session.lastUsedAt!);
		const now = new Date();

		if (now.getTime() - lastUsedAt.getTime() > idleTimeoutMs) {
			throw context.contextType === 'graphql'
				? new UnAuthenticatedException(
						`Your session has been inactive for more than ${this.IDLE_TIMEOUT_DAYS} days. Please log in again.`,
					)
				: new HttpException(
						`Your session has been inactive for more than ${this.IDLE_TIMEOUT_DAYS} days. Please log in again.`,
						401,
					);
		}

		// TODO: Optionally update lastUsedAt here (async, fire-and-forget)
		// this.sessionsService.updateLastActivity(session.id).catch(() => {});

		// Attach session to request context for use in resolvers
		request.session = session;

		return true;
	}

	/**
	 * Extract refresh token from request headers
	 * Supports multiple header formats:
	 * - Authorization: Bearer {token}
	 * - x-refresh-token: {token}
	 */
	private extractRefreshToken(request: any): string | null {
		// Option 1: Check custom header for refresh token
		const customHeader = request.headers['x-refresh-token'];
		if (customHeader) {
			return customHeader;
		}

		// Option 2: Extract from Authorization header (if using Bearer token)
		const authHeader = request.headers.authorization;
		if (authHeader && authHeader.startsWith('Bearer ')) {
			return authHeader.split(' ')[1];
		}

		// Option 3: Check cookies (if you store refresh token in httpOnly cookie)
		const cookieToken = request.cookies?.refreshToken;
		if (cookieToken) {
			return cookieToken;
		}

		return customHeader;
	}
}
