import { ExecutionContext, Injectable, Inject } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard, ThrottlerException, ThrottlerStorage, ThrottlerRequest } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { THROTTLE_METADATA_KEY, ThrottleOptions } from '../decorators/throttle.decorator';

/**
 * Custom Throttle Guard for GraphQL resolvers
 *
 * This guard extends NestJS ThrottlerGuard to work with GraphQL context
 * and supports custom throttle limits per resolver using the @Throttle decorator
 *
 * Features:
 * - Works with GraphQL context (HTTP context extraction)
 * - Customizable rate limits per resolver
 * - Custom error messages
 * - IP-based rate limiting
 * - Compatible with NestJS throttler storage (in-memory, Redis, etc.)
 *
 * @example Usage in resolver:
 * ```typescript
 * @UseGuards(CustomThrottleGuard)
 * @Throttle({ ttl: 60, limit: 5 })
 * @Query(() => User)
 * async getSensitiveData() { ... }
 * ```
 */
@Injectable()
export class ThrottleGuard extends ThrottlerGuard {
	constructor(@Inject(ThrottlerStorage) throttlerStorage: ThrottlerStorage, @Inject(Reflector) reflector: Reflector) {
		super(
			{
				throttlers: [
					{
						name: 'default',
						ttl: 60000,
						limit: 10,
					},
				],
			},
			throttlerStorage,
			reflector,
		);
	}

	/**
	 * Extract HTTP request/response from GraphQL context
	 * This is needed because GraphQL wraps the HTTP context
	 */
	getRequestResponse(context: ExecutionContext) {
		const gqlCtx = GqlExecutionContext.create(context);
		const ctx = gqlCtx.getContext();
		return { req: ctx.req, res: ctx.res };
	}

	protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
		console.log('🚀 handleRequest CALLED with props:', requestProps);
		const throttleOptions = await this.preventGuard(requestProps.context);
		requestProps.ttl = throttleOptions.ttl;
		requestProps.limit = throttleOptions.limit;
		console.log('🚀 Updated requestProps with throttle options:', requestProps);
		return super.handleRequest(requestProps);
	}

	/**
	 * Get custom throttle configuration from decorator metadata
	 * If @Throttle decorator is used, returns its config
	 * Otherwise, returns default throttle settings
	 */
	protected async preventGuard(context: ExecutionContext): Promise<{
		ttl: number;
		limit: number;
		name?: string;
	}> {
		console.log('🔧 getThrottlerOptions CALLED');
		// Get custom throttle options from @Throttle decorator
		const throttleOptions = this.reflector.get<ThrottleOptions>(THROTTLE_METADATA_KEY, context.getHandler());
		console.log('🔧 throttleOptions from decorator:', throttleOptions);
		if (throttleOptions) {
			// Convert seconds to milliseconds for consistency with NestJS throttler
			const config = {
				name: 'custom',
				ttl: throttleOptions.ttl * 1000,
				limit: throttleOptions.limit,
			};
			console.log('🔧 Returning custom config:', config);
			return config;
		}

		// Return default if no custom decorator
		console.log('🔧 Returning default config');
		return {
			name: 'default',
			ttl: 60000, // 60 seconds
			limit: 10,
		};
	}

	/**
	 * Generate tracking key for rate limiting
	 * Uses IP address as the identifier
	 * Can be customized to use user ID, API key, etc.
	 */
	protected async getTracker(req: Record<string, any>): Promise<string> {
		console.log('🎯 getTracker CALLED');
		// Extract IP address (handle proxies)
		const ip =
			req.headers['x-forwarded-for']?.split(',')[0] ||
			req.headers['x-real-ip'] ||
			req.ip ||
			req.connection?.remoteAddress ||
			'unknown';

		const tracker = ip.replace('::ffff:', '');
		console.log('🎯 Tracker (IP):', tracker);
		return tracker;
	}

	/**
	 * Custom error thrown when rate limit is exceeded
	 * Uses custom message from @Throttle decorator if provided
	 */
	protected async throwThrottlingException(context: ExecutionContext): Promise<void> {
		console.log('❌ throwThrottlingException CALLED - Rate limit exceeded!');
		const throttleOptions = this.reflector.get<ThrottleOptions>(THROTTLE_METADATA_KEY, context.getHandler());

		const message =
			throttleOptions?.message || `Too many requests. Please try again in ${throttleOptions?.ttl || 60} seconds.`;

		console.log('❌ Throwing error with message:', message);
		throw new ThrottlerException(message);
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		console.log('🚀 ThrottleGuard.canActivate CALLED');
		try {
			const result = await super.canActivate(context);
			console.log('✅ ThrottleGuard passed, result:', result);
			return result;
		} catch (error) {
			console.log('❌ ThrottleGuard failed with error:', error.message);
			throw error;
		}
	}
}
