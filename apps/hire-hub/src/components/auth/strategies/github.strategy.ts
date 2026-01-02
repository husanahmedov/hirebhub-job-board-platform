import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { EnvUtil } from '../../../libs/env.util';
import { UserService } from '../../user/user.service';

/**
 * GitHub OAuth Strategy
 *
 * Implements GitHub OAuth 2.0 authentication using Passport.
 * This strategy handles the OAuth flow for GitHub sign-in:
 * 1. User clicks "Sign in with GitHub"
 * 2. User is redirected to GitHub's OAuth consent screen
 * 3. User authorizes the app
 * 4. GitHub redirects back with authorization code
 * 5. Strategy exchanges code for user profile
 * 6. validate() method processes the profile and creates/updates user
 *
 * @see https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps
 */
@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
	constructor(private readonly userService: UserService) {
		super({
			clientID: EnvUtil.getGitHubClientId(),
			clientSecret: EnvUtil.getGitHubClientSecret(),
			callbackURL: EnvUtil.getGitHubCallbackUrl(),
			scope: ['user:email'], // Request access to user email
			passReqToCallback: false,
		});
	}

	/**
	 * Validate GitHub OAuth profile and create/update user
	 *
	 * This method is called automatically by Passport after successful OAuth:
	 * - Extracts user information from GitHub profile
	 * - Calls UserService to find or create user
	 * - Returns user object that will be attached to request
	 *
	 * @param accessToken - GitHub access token (can be used to call GitHub APIs)
	 * @param refreshToken - GitHub refresh token (usually not provided by GitHub)
	 * @param profile - GitHub user profile containing id, username, email, photos
	 * @param done - Passport callback to return user or error
	 *
	 * @returns User object via callback
	 */
	async validate(accessToken: string, refreshToken: string, profile: Profile, done: Function): Promise<void> {
		try {
			// Extract user data from GitHub profile
			const email = profile.emails?.[0]?.value;

			// GitHub may not always provide name fields
			const displayName = profile.displayName || profile.username || '';
			const nameParts = displayName.split(' ');
			const firstName = nameParts[0] || profile.username || 'GitHub';
			const lastName = nameParts.slice(1).join(' ') || 'User';

			const avatarUrl = profile.photos?.[0]?.value || '';
			const profileUrl = profile.profileUrl || `https://github.com/${profile.username}`;

			if (!email) {
				// Email is required but GitHub might not provide it if user's email is private
				return done(
					new Error('Email not provided by GitHub. Please make your email public in GitHub settings.'),
					undefined,
				);
			}

			// Find or create user with OAuth credentials
			const user = await this.userService.validateOAuthLogin('github', profile.id, {
				email,
				firstName,
				lastName,
				avatarUrl,
				profileUrl,
			});

			// Return user to Passport (will be attached to req.user)
			done(null, user);
		} catch (error) {
			// Pass error to Passport error handler
			done(error as Error, undefined);
		}
	}
}
