import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-linkedin-oauth2';
import { EnvUtil } from '../../../libs/env.util';
import { UserService } from '../../user/user.service';

/**
 * LinkedIn OAuth Strategy
 *
 * Implements LinkedIn OAuth 2.0 authentication using Passport.
 * This strategy handles the OAuth flow for LinkedIn sign-in:
 * 1. User clicks "Sign in with LinkedIn"
 * 2. User is redirected to LinkedIn's OAuth consent screen
 * 3. User authorizes the app
 * 4. LinkedIn redirects back with authorization code
 * 5. Strategy exchanges code for user profile
 * 6. validate() method processes the profile and creates/updates user
 *
 * @see https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication
 */
@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
	constructor(private readonly userService: UserService) {
		super({
			clientID: EnvUtil.getLinkedInClientId(),
			clientSecret: EnvUtil.getLinkedInClientSecret(),
			callbackURL: EnvUtil.getLinkedInCallbackUrl(),
			scope: ['openid', 'profile', 'email'], // Request access to email and basic profile
			passReqToCallback: false,
		});
	}

	/**
	 * Validate LinkedIn OAuth profile and create/update user
	 *
	 * This method is called automatically by Passport after successful OAuth:
	 * - Extracts user information from LinkedIn profile
	 * - Calls UserService to find or create user
	 * - Returns user object that will be attached to request
	 *
	 * @param accessToken - LinkedIn access token (can be used to call LinkedIn APIs)
	 * @param refreshToken - LinkedIn refresh token (for long-lived access)
	 * @param profile - LinkedIn user profile containing id, name, email, photos
	 * @param done - Passport callback to return user or error
	 *
	 * @returns User object via callback
	 */
	async validate(accessToken: string, refreshToken: string, profile: Profile, done: Function): Promise<void> {
		try {
			// Extract user data from LinkedIn profile
			const email = profile.emails?.[0]?.value;
			const firstName = profile.name?.givenName || '';
			const lastName = profile.name?.familyName || '';
			const avatarUrl = profile.photos?.[0]?.value || '';
			const profileUrl = profile._json?.publicProfileUrl || `https://www.linkedin.com/in/${profile.id}`;

			if (!email) {
				// Email is required - LinkedIn should always provide it
				return done(new Error('Email not provided by LinkedIn'), undefined);
			}

			// Find or create user with OAuth credentials
			const user = await this.userService.validateOAuthLogin('linkedin', profile.id, {
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
