import { Controller, Get, Req, Res, UseGuards, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import type { User } from '../../libs';
import { EnvUtil } from '../../libs/env.util';

/**
 * Authentication Controller
 *
 * Handles REST endpoints for OAuth authentication flows.
 * OAuth requires HTTP redirects which are incompatible with GraphQL,
 * so we use traditional REST endpoints for OAuth flows.
 *
 * After successful OAuth authentication, the user is redirected to the
 * frontend with JWT tokens in the URL query parameters.
 *
 * @controller /auth
 */
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	// ============================================================
	// Google OAuth Endpoints
	// ============================================================

	/**
	 * Initiate Google OAuth flow
	 *
	 * Redirects user to Google's OAuth consent screen.
	 * After user authorizes, Google redirects back to /auth/google/callback
	 *
	 * @route GET /auth/google
	 * @access Public
	 */
	@Get('google')
	@UseGuards(AuthGuard('google'))
	async googleLogin() {
		// This route initiates the Google OAuth flow
		// The actual redirect is handled by Passport
	}

	/**
	 * Google OAuth callback handler
	 *
	 * Receives authorization code from Google, exchanges it for user profile,
	 * creates/updates user, generates JWT tokens, and redirects to frontend.
	 *
	 * @route GET /auth/google/callback
	 * @access Public (called by Google OAuth)
	 */
	@Get('google/callback')
	@UseGuards(AuthGuard('google'))
	async googleCallback(@Req() req: Request & { user: User }, @Res() res: Response) {
		return this.handleOAuthCallback(req, res, 'google');
	}

	// ============================================================
	// LinkedIn OAuth Endpoints
	// ============================================================

	/**
	 * Initiate LinkedIn OAuth flow
	 *
	 * Redirects user to LinkedIn's OAuth consent screen.
	 * After user authorizes, LinkedIn redirects back to /auth/linkedin/callback
	 *
	 * @route GET /auth/linkedin
	 * @access Public
	 */
	@Get('linkedin')
	@UseGuards(AuthGuard('linkedin'))
	async linkedinLogin() {
		// This route initiates the LinkedIn OAuth flow
		// The actual redirect is handled by Passport
	}

	/**
	 * LinkedIn OAuth callback handler
	 *
	 * Receives authorization code from LinkedIn, exchanges it for user profile,
	 * creates/updates user, generates JWT tokens, and redirects to frontend.
	 *
	 * @route GET /auth/linkedin/callback
	 * @access Public (called by LinkedIn OAuth)
	 */
	@Get('linkedin/callback')
	@UseGuards(AuthGuard('linkedin'))
	async linkedinCallback(@Req() req: Request & { user: User }, @Res() res: Response) {
		return this.handleOAuthCallback(req, res, 'linkedin');
	}

	// ============================================================
	// GitHub OAuth Endpoints
	// ============================================================

	/**
	 * Initiate GitHub OAuth flow
	 *
	 * Redirects user to GitHub's OAuth consent screen.
	 * After user authorizes, GitHub redirects back to /auth/github/callback
	 *
	 * @route GET /auth/github
	 * @access Public
	 */
	@Get('github')
	@UseGuards(AuthGuard('github'))
	async githubLogin() {
		// This route initiates the GitHub OAuth flow
		// The actual redirect is handled by Passport
	}

	/**
	 * GitHub OAuth callback handler
	 *
	 * Receives authorization code from GitHub, exchanges it for user profile,
	 * creates/updates user, generates JWT tokens, and redirects to frontend.
	 *
	 * @route GET /auth/github/callback
	 * @access Public (called by GitHub OAuth)
	 */
	@Get('github/callback')
	@UseGuards(AuthGuard('github'))
	async githubCallback(@Req() req: Request & { user: User }, @Res() res: Response) {
		return this.handleOAuthCallback(req, res, 'github');
	}

	// ============================================================
	// Helper Methods
	// ============================================================

	/**
	 * Handle OAuth callback for all providers
	 *
	 * Generates JWT tokens and redirects to frontend with tokens in URL.
	 *
	 * @param req - Express request with user object attached by Passport
	 * @param res - Express response for redirect
	 * @param provider - OAuth provider name for logging
	 */
	private async handleOAuthCallback(req: Request & { user: User }, res: Response, provider: string) {
		try {
			const user = req.user;
			if (!user) {
				// User not found - OAuth validation failed
				console.error(`OAuth callback failed: No user object from ${provider}`);
				return res.redirect(`http://localhost:8080/auth/error?message=Authentication failed&provider=${provider}`);
			}

			// Generate JWT access token (short-lived)
			const accessToken = await this.authService.createToken(user);

			// Generate JWT refresh token (long-lived)
			const refreshToken = await this.authService.createRefreshToken(user);

			// Hash refresh token before storing
			const hashedRefreshToken = await this.authService.hashRefreshToken(refreshToken);

			// Store hashed refresh token in database
			// Note: We need to import and use userModel here, or create a method in UserService
			// For now, we'll pass it in the URL and let the frontend handle storage

			// Get token expiration times
			const accessTokenExpiresAt = this.authService.getAccessTokenExpiration();
			const refreshTokenExpiresAt = this.authService.getRefreshTokenExpiration();

			// Log successful OAuth authentication
			console.log(`✅ OAuth authentication successful: ${provider} - User: ${user.email}`);

			// Redirect to frontend with tokens in URL
			// Frontend should:
			// 1. Extract tokens from URL
			// 2. Store them securely (httpOnly cookies or secure storage)
			// 3. Remove tokens from URL (for security)
			// 4. Redirect to dashboard/home page
			const redirectUrl = new URL(`http://localhost:3000/auth/google/callback`);
			const userData = {
				firstName: user.firstName || '',
				lastName: user.lastName || '',
				email: user.email || '',
				avatarUrl: user.profile?.avatarUrl || '',
				fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
				createdAt: user.createdAt ? user.createdAt.toISOString() : '',
				updatedAt: user.updatedAt ? user.updatedAt.toISOString() : '',
				oauthProviders: user.oauthProviders || [],
				status: user.status || 'active',
				emailVerified: user.emailVerified || false,
				accessToken: accessToken,
				refreshToken: refreshToken,
				accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
				refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
			};
			redirectUrl.searchParams.set('user', encodeURIComponent(JSON.stringify(userData)));

			redirectUrl.searchParams.set('provider', provider);

			return res.redirect(redirectUrl.toString());
		} catch (error: any) {
			// Handle errors during token generation or redirect
			console.error(`Error during OAuth callback (${provider}):`, {
				error: error.message,
				stack: error.stack,
				user: req.user?.email || 'unknown',
			});

			return res.redirect(`http://localhost:8080/auth/error?message=Token generation failed&provider=${provider}`);
		}
	}

	// ============================================================
	// Health Check Endpoint
	// ============================================================

	/**
	 * Health check endpoint to verify OAuth configuration
	 *
	 * Returns status of each OAuth provider configuration.
	 *
	 * @route GET /auth/status
	 * @access Public
	 */
	@Get('status')
	async getAuthStatus() {
		return {
			status: 'ok',
			providers: {
				google: {
					configured: EnvUtil.isOAuthConfigured('google'),
					loginUrl: EnvUtil.isOAuthConfigured('google') ? '/auth/google' : null,
				},
				linkedin: {
					configured: EnvUtil.isOAuthConfigured('linkedin'),
					loginUrl: EnvUtil.isOAuthConfigured('linkedin') ? '/auth/linkedin' : null,
				},
				github: {
					configured: EnvUtil.isOAuthConfigured('github'),
					loginUrl: EnvUtil.isOAuthConfigured('github') ? '/auth/github' : null,
				},
			},
		};
	}
}
