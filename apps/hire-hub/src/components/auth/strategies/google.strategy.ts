import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { EnvUtil } from '../../../libs/env.util';
import { UserService } from '../../user/user.service';

/**
 * Google OAuth Strategy
 *
 * Implements Google OAuth 2.0 authentication using Passport.
 * This strategy handles the OAuth flow for Google sign-in:
 * 1. User clicks "Sign in with Google"
 * 2. User is redirected to Google's OAuth consent screen
 * 3. User authorizes the app
 * 4. Google redirects back with authorization code
 * 5. Strategy exchanges code for user profile
 * 6. validate() method processes the profile and creates/updates user
 *
 * @see https://developers.google.com/identity/protocols/oauth2
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    
    constructor(private readonly userService: UserService) {
        super({
            clientID: EnvUtil.getGoogleClientId(),
			clientSecret: EnvUtil.getGoogleClientSecret(),
			callbackURL: EnvUtil.getGoogleCallbackUrl(),
			scope: ['email', 'profile'], // Request access to email and profile data
			passReqToCallback: false,
		});
	}
    
	/**
     * Validate Google OAuth profile and create/update user
    *
    * This method is called automatically by Passport after successful OAuth:
    * - Extracts user information from Google profile
    * - Calls UserService to find or create user
    * - Returns user object that will be attached to request
    *
    * @param accessToken - Google access token (can be used to call Google APIs)
    * @param refreshToken - Google refresh token (for long-lived access)
    * @param profile - Google user profile containing id, name, email, photos
    * @param done - Passport callback to return user or error
    *
    * @returns User object via callback
    */
   async validate(accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback): Promise<void> {
		try {
			console.log('🔍 Google OAuth validate called');
			console.log('Profile received:', JSON.stringify(profile, null, 2));

			const email = profile.emails?.[0]?.value;
			const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User';
			const lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '';
			const avatarUrl = profile.photos?.[0]?.value || '';
			const profileUrl = profile.profileUrl || `https://plus.google.com/${profile.id}`;

			console.log('📧 Extracted data:', { email, firstName, lastName, avatarUrl });

			if (!email) {
				console.error('❌ No email provided by Google');
				return done(new Error('Email not provided by Google'), undefined);
			}

			console.log('🔄 Calling validateOAuthLogin...');
			const user = await this.userService.validateOAuthLogin('google', profile.id, {
				email,
				firstName,
				lastName,
				avatarUrl,
				profileUrl,
			});

			console.log('✅ User validated:', user.email);
			done(null, user);
		} catch (error: any) {
			console.error('❌ Error in Google strategy validate:', error);
			done(error, undefined);
		}
	}
}
