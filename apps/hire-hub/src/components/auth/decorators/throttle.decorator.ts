import { SetMetadata } from '@nestjs/common';

export const THROTTLE_METADATA_KEY = 'throttle';

/**
 * Throttle decorator metadata interface
 */
export interface ThrottleOptions {
	/**
	 * Time window in seconds
	 * @default 60
	 */
	ttl: number;

	/**
	 * Maximum number of requests within the time window
	 * @default 10
	 */
	limit: number;

	/**
	 * Custom error message when throttled
	 * @optional
	 */
	message?: string;
}

/**
 * Custom Throttle decorator for rate limiting GraphQL resolvers
 *
 * @param options - Throttle configuration options
 * @returns Decorator function
 *
 * @example
 * // Allow 5 requests per 60 seconds
 * @Throttle({ ttl: 60, limit: 5 })
 * @Query(() => User)
 * async getUsers() { ... }
 *
 * @example
 * // Allow 3 login attempts per 15 seconds
 * @Throttle({ ttl: 15, limit: 3, message: 'Too many login attempts' })
 * @Mutation(() => AuthResponse)
 * async login() { ... }
 *
 * @example
 * // Allow 100 requests per 60 seconds (high traffic endpoint)
 * @Throttle({ ttl: 60, limit: 100 })
 * @Query(() => [Product])
 * async getProducts() { ... }
 */
export const Throttle = (options: ThrottleOptions) => SetMetadata(THROTTLE_METADATA_KEY, options);
