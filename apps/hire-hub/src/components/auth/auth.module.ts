import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { LinkedInStrategy } from './strategies/linkedin.strategy';
import { GitHubStrategy } from './strategies/github.strategy';
import { EnvUtil } from '../../libs/';
import { UserModule } from '../user/user.module';
import { CheckUserStatus } from '../../libs/check-user-status';

/**
 * Authentication Module
 *
 * Handles all authentication-related functionality:
 * - JWT token generation and verification
 * - Password hashing and comparison
 * - OAuth strategies (Google, LinkedIn, GitHub)
 * - REST endpoints for OAuth flows
 *
 * @module AuthModule
 */
@Module({
	imports: [
		// Passport for OAuth strategies
		PassportModule.register({ defaultStrategy: 'jwt' }),

		// JWT for token generation (access tokens)
		// NOTE -Refresh tokens use a separate secret configured in AuthService
		JwtModule.register({
			secret: `${EnvUtil.getJwtSecret()}`,
			signOptions: { expiresIn: '1h' }, // 1 hour
		}),

		// UserModule for UserService (needed by OAuth strategies)
		// Using forwardRef to resolve circular dependency
		forwardRef(() => UserModule),
	],
	controllers: [AuthController],
	providers: [AuthService, GoogleStrategy, LinkedInStrategy, GitHubStrategy],
	exports: [AuthService, PassportModule],
})
export class AuthModule {}
