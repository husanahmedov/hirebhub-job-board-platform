/**
 * Environment Configuration Utility
 *
 * Provides validation and type-safe access to environment variables.
 * This utility ensures all required environment variables are present
 * and properly formatted before the application starts.
 *
 * @module EnvUtil
 */

/**
 * Interface defining required environment variables for the application
 */
export interface EnvironmentConfig {
	/** Node environment (development, production, test) */
	NODE_ENV: 'development' | 'production' | 'test';
	/** Main application port */
	HIREHUB_PORT: number;
	/** Batch service port */
	HIREHUB_BATCH_PORT: number;
	/** MongoDB connection string for development */
	MONGO_DEV?: string;
	/** MongoDB connection string for production */
	MONGO_PROD?: string;
	/** JWT secret key */
	JWT_SECRET?: string;
	/** JWT refresh secret key */
	JWT_REFRESH_SECRET?: string;
	/** CORS origin */
	CORS_ORIGIN?: string;
	/** Google OAuth Client ID */
	GOOGLE_CLIENT_ID?: string;
	/** Google OAuth Client Secret */
	GOOGLE_CLIENT_SECRET?: string;
	/** Google OAuth Callback URL */
	GOOGLE_CALLBACK_URL?: string;
	/** LinkedIn OAuth Client ID */
	LINKEDIN_CLIENT_ID?: string;
	/** LinkedIn OAuth Client Secret */
	LINKEDIN_CLIENT_SECRET?: string;
	/** LinkedIn OAuth Callback URL */
	LINKEDIN_CALLBACK_URL?: string;
	/** GitHub OAuth Client ID */
	GITHUB_CLIENT_ID?: string;
	/** GitHub OAuth Client Secret */
	GITHUB_CLIENT_SECRET?: string;
	/** GitHub OAuth Callback URL */
	GITHUB_CALLBACK_URL?: string;
	/** Frontend URL for OAuth redirects */
	FRONTEND_URL?: string;
}

/**
 * Environment Utility Class
 *
 * Provides methods to validate and retrieve environment variables safely.
 * All methods are static and can be used without instantiation.
 *
 * @example
 * ```typescript
 * // Validate environment on startup
 * EnvUtil.validate();
 *
 * // Get environment variable
 * const port = EnvUtil.getPort();
 * ```
 */
export class EnvUtil {
	/**
	 * Validate all required environment variables
	 * Throws an error if any required variable is missing or invalid
	 *
	 * @throws {Error} If validation fails
	 *
	 * @example
	 * ```typescript
	 * try {
	 *   EnvUtil.validate();
	 * } catch (error) {
	 *   process.exit(1);
	 * }
	 * ```
	 */
	public static validate(): void {
		const errors: string[] = [];

		// Validate NODE_ENV
		const nodeEnv = process.env.NODE_ENV;
		if (!nodeEnv) {
			errors.push('NODE_ENV is not set (should be: development, production, or test)');
		} else if (!['development', 'production', 'test'].includes(nodeEnv)) {
			errors.push(`NODE_ENV has invalid value: ${nodeEnv} (should be: development, production, or test)`);
		}

		// Validate database connection based on environment
		if (nodeEnv === 'production' && !process.env.MONGO_PROD) {
			errors.push('MONGO_PROD is required in production environment');
		}
		if (nodeEnv === 'development' && !process.env.MONGO_DEV) {
			errors.push('MONGO_DEV is required in development environment');
		}

		// Validate ports
		const hireHubPort = process.env.HIREHUB_PORT;
		if (hireHubPort && isNaN(Number(hireHubPort))) {
			errors.push(`HIREHUB_PORT must be a valid number, got: ${hireHubPort}`);
		}

		const batchPort = process.env.HIREHUB_BATCH_PORT;
		if (batchPort && isNaN(Number(batchPort))) {
			errors.push(`HIREHUB_BATCH_PORT must be a valid number, got: ${batchPort}`);
		}

		// Check for JWT secret in production
		if (nodeEnv === 'production' && !process.env.JWT_SECRET) {
			errors.push('JWT_SECRET is required in production environment');
		}

		// If there are errors, log them and throw
		if (errors.length > 0) {
			throw new Error('Environment validation failed. Check the logs above.');
		}
	}

	/**
	 * Get the current environment
	 * @returns The current NODE_ENV value
	 */
	public static getEnvironment(): string {
		return process.env.NODE_ENV ?? 'development';
	}

	/**
	 * Check if the application is running in production
	 * @returns True if in production mode
	 */
	public static isProduction(): boolean {
		return process.env.NODE_ENV === 'production';
	}

	/**
	 * Check if the application is running in development
	 * @returns True if in development mode
	 */
	public static isDevelopment(): boolean {
		return process.env.NODE_ENV === 'development';
	}

	/**
	 * Check if the application is running in test mode
	 * @returns True if in test mode
	 */
	public static isTest(): boolean {
		return process.env.NODE_ENV === 'test';
	}

	/**
	 * Get the main application port
	 * @returns The configured port number
	 */
	public static getPort(): number {
		return parseInt(process.env.HIREHUB_PORT ?? '3000', 10);
	}

	/**
	 * Get the batch service port
	 * @returns The configured batch service port number
	 */
	public static getBatchPort(): number {
		return parseInt(process.env.HIREHUB_BATCH_PORT ?? '3001', 10);
	}

	/**
	 * Get the MongoDB connection string for the current environment
	 * @returns The MongoDB connection URI
	 * @throws {Error} If the connection string is not configured
	 */
	public static getMongoUri(): string {
		const uri = this.isProduction() ? process.env.MONGO_PROD : process.env.MONGO_DEV;

		if (!uri) {
			throw new Error(`MongoDB URI not configured for ${this.getEnvironment()} environment`);
		}

		return uri;
	}

	/**
	 * Get the JWT secret
	 * @returns The JWT secret or a default value for development
	 */
	public static getJwtSecret(): string {
		if (this.isProduction() && !process.env.JWT_SECRET) {
			throw new Error('JWT_SECRET is required in production');
		}
		return process.env.JWT_SECRET ?? 'dev-secret-key-change-in-production';
	}

	/**
	 * Get the CORS origin
	 * @returns The CORS origin or wildcard for development
	 */
	public static getCorsOrigin(): string {
		return process.env.CORS_ORIGIN ?? (this.isProduction() ? '' : '*');
	}

	/**
	 * Get the JWT refresh secret
	 * @returns The JWT refresh secret or a default value for development
	 */
	public static getJwtRefreshSecret(): string {
		if (this.isProduction() && !process.env.JWT_REFRESH_SECRET) {
			throw new Error('JWT_REFRESH_SECRET is required in production');
		}
		return process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-key-change-in-production';
	}

	/**
	 * Get the frontend URL for OAuth redirects
	 * @returns The frontend URL
	 */
	public static getFrontendUrl(): string {
		return process.env.FRONTEND_URL ?? (this.isDevelopment() ? 'http://localhost:3000' : '');
	}

	// ============================================================
	// OAuth Configuration Methods
	// ============================================================

	/**
	 * Get Google OAuth Client ID
	 * @returns The Google OAuth Client ID
	 */
	public static getGoogleClientId(): string {
		const clientId = process.env.GOOGLE_CLIENT_ID_2;
		if (!clientId && this.isProduction()) {
			throw new Error('GOOGLE_CLIENT_ID is not configured');
		}
		return clientId ?? '';
	}

	/**
	 * Get Google OAuth Client Secret
	 * @returns The Google OAuth Client Secret
	 */
	public static getGoogleClientSecret(): string {
		const clientSecret = process.env.GOOGLE_CLIENT_SECRET_2;
		if (!clientSecret && this.isProduction()) {
			throw new Error('GOOGLE_CLIENT_SECRET is not configured');
		}
		return clientSecret ?? '';
	}

	/**
	 * Get Google OAuth Callback URL
	 * @returns The Google OAuth Callback URL
	 */
	public static getGoogleCallbackUrl(): string {
		return process.env.GOOGLE_CALLBACK_URL ?? `http://localhost:8080/auth/google/callback`;
	}

	/**
	 * Get LinkedIn OAuth Client ID
	 * @returns The LinkedIn OAuth Client ID
	 */
	public static getLinkedInClientId(): string {
		const clientId = process.env.LINKEDIN_CLIENT_ID;
		if (!clientId && this.isProduction()) {
			throw new Error('LINKEDIN_CLIENT_ID is not configured');
		}
		return clientId ?? '';
	}

	/**
	 * Get LinkedIn OAuth Client Secret
	 * @returns The LinkedIn OAuth Client Secret
	 */
	public static getLinkedInClientSecret(): string {
		const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
		if (!clientSecret && this.isProduction()) {
			throw new Error('LINKEDIN_CLIENT_SECRET is not configured');
		}
		return clientSecret ?? '';
	}

	/**
	 * Get LinkedIn OAuth Callback URL
	 * @returns The LinkedIn OAuth Callback URL
	 */
	public static getLinkedInCallbackUrl(): string {
		return process.env.LINKEDIN_CALLBACK_URL ?? `http://localhost:${this.getPort()}/auth/linkedin/callback`;
	}

	/**
	 * Get GitHub OAuth Client ID
	 * @returns The GitHub OAuth Client ID
	 */
	public static getGitHubClientId(): string {
		const clientId = process.env.GITHUB_CLIENT_ID;
		if (!clientId && this.isProduction()) {
			throw new Error('GITHUB_CLIENT_ID is not configured');
		}
		return clientId ?? '';
	}

	/**
	 * Get GitHub OAuth Client Secret
	 * @returns The GitHub OAuth Client Secret
	 */
	public static getGitHubClientSecret(): string {
		const clientSecret = process.env.GITHUB_CLIENT_SECRET;
		if (!clientSecret && this.isProduction()) {
			throw new Error('GITHUB_CLIENT_SECRET is not configured');
		}
		return clientSecret ?? '';
	}

	/**
	 * Get GitHub OAuth Callback URL
	 * @returns The GitHub OAuth Callback URL
	 */
	public static getGitHubCallbackUrl(): string {
		return process.env.GITHUB_CALLBACK_URL ?? `http://localhost:${this.getPort()}/auth/github/callback`;
	}

	/**
	 * Check if OAuth is configured for a specific provider
	 * @param provider The OAuth provider name (google, linkedin, github)
	 * @returns True if the provider is configured
	 */
	public static isOAuthConfigured(provider: 'google' | 'linkedin' | 'github'): boolean {
		switch (provider) {
			case 'google':
				return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
			case 'linkedin':
				return !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
			case 'github':
				return !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
			default:
				return false;
		}
	}

	/**
	 * Print environment configuration summary
	 * Useful for debugging and verification
	 */
	public static printSummary(): void {
		// Only show sensitive info in development
		if (this.isDevelopment()) {
		}
	}

	/**
	 * Get SMTP host for email sending
	 * @returns The SMTP host
	 */
	public static getSmtpHost(): string {
		return process.env.SMTP_HOST ?? 'smtp.gmail.com';
	}

	/**
	 * Get SMTP port for email sending
	 * @returns The SMTP port
	 */
	public static getSmtpPort(): number {
		return parseInt(process.env.SMTP_PORT ?? '587', 10);
	}

	/**
	 * Get SMTP user for email authentication
	 * @returns The SMTP user
	 */
	public static getSmtpUser(): string {
		if (this.isProduction() && !process.env.SMTP_USER) {
			throw new Error('SMTP_USER is required in production');
		}
		return process.env.SMTP_USER ?? '';
	}

	/**
	 * Get SMTP password for email authentication
	 * @returns The SMTP password
	 */
	public static getSmtpPassword(): string {
		if (this.isProduction() && !process.env.SMTP_PASSWORD) {
			throw new Error('SMTP_PASSWORD is required in production');
		}
		return process.env.SMTP_PASSWORD ?? '';
	}

	/**
	 * Get email sender address
	 * @returns The sender email address
	 */
	public static getEmailFrom(): string {
		return process.env.EMAIL_FROM ?? 'noreply@hirehub.com';
	}

	/**
	 * Get all environment variables as a typed config object
	 * @returns Typed environment configuration
	 */
	public static getConfig(): EnvironmentConfig {
		return {
			NODE_ENV: this.getEnvironment() as any,
			HIREHUB_PORT: this.getPort(),
			HIREHUB_BATCH_PORT: this.getBatchPort(),
			MONGO_DEV: process.env.MONGO_DEV,
			MONGO_PROD: process.env.MONGO_PROD,
			JWT_SECRET: process.env.JWT_SECRET,
			JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
			CORS_ORIGIN: process.env.CORS_ORIGIN,
			GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
			GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
			GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
			LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
			LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
			LINKEDIN_CALLBACK_URL: process.env.LINKEDIN_CALLBACK_URL,
			GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
			GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
			GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL,
			FRONTEND_URL: process.env.FRONTEND_URL,
		};
	}
}
