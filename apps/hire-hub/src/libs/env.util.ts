/**
 * Environment Configuration Utility
 *
 * Provides validation and type-safe access to environment variables.
 * This utility ensures all required environment variables are present
 * and properly formatted before the application starts.
 *
 * @module EnvUtil
 */

import { LoggerUtil } from './logger.util';

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
	/** CORS origin */
	CORS_ORIGIN?: string;
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
	 *   LoggerUtil.success('Environment validated successfully');
	 * } catch (error) {
	 *   LoggerUtil.error('Environment validation failed', error);
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
			LoggerUtil.error('Environment Validation Failed', errors.join('\n  • '));
			throw new Error('Environment validation failed. Check the logs above.');
		}

		LoggerUtil.success('Environment variables validated');
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
	 * Print environment configuration summary
	 * Useful for debugging and verification
	 */
	public static printSummary(): void {
		LoggerUtil.info('Environment', this.getEnvironment());
		LoggerUtil.info('Main Port', String(this.getPort()));
		LoggerUtil.info('Batch Port', String(this.getBatchPort()));
		LoggerUtil.info('CORS Origin', this.getCorsOrigin() || 'Not set');

		// Only show sensitive info in development
		if (this.isDevelopment()) {
			LoggerUtil.debug('JWT Secret', this.getJwtSecret());
			LoggerUtil.debug('MongoDB URI', this.getMongoUri());
		}
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
			CORS_ORIGIN: process.env.CORS_ORIGIN,
		};
	}
}
