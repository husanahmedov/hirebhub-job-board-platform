# Rate Limiting with Custom Throttle Guard

This guide explains how to use the custom throttle guard to implement rate limiting in your GraphQL resolvers.

## Overview

The custom throttle guard provides:

- ✅ **Customizable rate limits** per resolver
- ✅ **GraphQL support** (works with Apollo Server)
- ✅ **IP-based tracking** (can be extended to user-based)
- ✅ **Custom error messages**
- ✅ **Easy decorator syntax**

## Setup

The throttle guard is already configured globally in `app.module.ts`:

```typescript
ThrottlerModule.forRoot({
	throttlers: [
		{
			name: 'default',
			ttl: 60000, // 60 seconds
			limit: 100, // 100 requests per minute (global default)
		},
	],
});
```

## Usage in Resolvers

### Basic Usage

Apply throttling to any resolver using the `@Throttle` decorator and `@UseGuards`:

```typescript
import { UseGuards } from '@nestjs/common';
import { Query } from '@nestjs/graphql';
import { CustomThrottleGuard } from '../auth/guards/throttle.guard';
import { Throttle } from '../auth/decorators/throttle.decorator';

@Resolver()
export class UserResolver {
	// Allow 10 requests per 60 seconds
	@UseGuards(CustomThrottleGuard)
	@Throttle({ ttl: 60, limit: 10 })
	@Query(() => User)
	async getUser() {
		// Your code here
	}
}
```

### Advanced Examples

#### 1. Strict Rate Limiting for Sensitive Operations

```typescript
// Login: 3 attempts per 15 seconds
@UseGuards(CustomThrottleGuard)
@Throttle({
  ttl: 15,
  limit: 3,
  message: 'Too many login attempts. Please wait 15 seconds and try again.'
})
@Mutation(() => AuthResponse)
async login(@Args('input') input: LoginInput) {
  return this.authService.login(input);
}
```

#### 2. Moderate Rate Limiting for Regular Operations

```typescript
// Profile updates: 20 per minute
@UseGuards(CustomThrottleGuard)
@Throttle({ ttl: 60, limit: 20 })
@Mutation(() => User)
async updateProfile(@Args('input') input: UpdateProfileInput) {
  return this.userService.updateProfile(input);
}
```

#### 3. Generous Rate Limiting for Reads

```typescript
// Public data: 100 requests per minute
@UseGuards(CustomThrottleGuard)
@Throttle({ ttl: 60, limit: 100 })
@Query(() => [Job])
async getJobs() {
  return this.jobService.findAll();
}
```

#### 4. Very Strict for Security Operations

```typescript
// Password reset: 2 attempts per 5 minutes
@UseGuards(CustomThrottleGuard)
@Throttle({
  ttl: 300,  // 5 minutes
  limit: 2,
  message: 'Too many password reset attempts. Please try again in 5 minutes.'
})
@Mutation(() => MessageResponse)
async resetPassword(@Args('email') email: string) {
  return this.authService.resetPassword(email);
}
```

#### 5. High Traffic Endpoints

```typescript
// Search: 200 requests per minute
@UseGuards(CustomThrottleGuard)
@Throttle({ ttl: 60, limit: 200 })
@Query(() => SearchResults)
async search(@Args('query') query: string) {
  return this.searchService.search(query);
}
```

## Configuration Options

### ThrottleOptions

| Property  | Type     | Description                                      | Default |
| --------- | -------- | ------------------------------------------------ | ------- |
| `ttl`     | `number` | Time window in **seconds**                       | 60      |
| `limit`   | `number` | Max requests within the time window              | 10      |
| `message` | `string` | Custom error message when rate limit is exceeded | Auto    |

## How It Works

1. **IP-based tracking**: Requests are tracked by IP address
2. **Sliding window**: Uses a sliding time window for accurate rate limiting
3. **In-memory storage**: By default, uses in-memory storage (can be Redis)
4. **GraphQL compatible**: Extracts HTTP context from GraphQL execution context

## Error Response

When rate limit is exceeded, the user receives:

```json
{
	"errors": [
		{
			"message": "Too many login attempts. Please wait 15 seconds and try again.",
			"extensions": {
				"code": "THROTTLER_EXCEPTION",
				"statusCode": 429
			}
		}
	]
}
```

## Best Practices

### ✅ DO

- Use strict limits (1-5 per minute) for authentication endpoints
- Use moderate limits (10-30 per minute) for mutations
- Use generous limits (50-200 per minute) for queries
- Add custom messages for user-facing endpoints
- Consider user experience when setting limits

### ❌ DON'T

- Don't set limits too low (frustrates legitimate users)
- Don't use the same limit for all endpoints
- Don't forget to test your limits
- Don't ignore rate limit errors in your frontend

## Recommended Limits by Endpoint Type

| Endpoint Type           | TTL (seconds) | Limit   | Example                    |
| ----------------------- | ------------- | ------- | -------------------------- |
| **Authentication**      | 15-60         | 3-5     | Login, Register            |
| **Password Operations** | 300-600       | 2-3     | Reset Password, Change PW  |
| **Email Operations**    | 60-120        | 5-10    | Resend Verification        |
| **Profile Updates**     | 60            | 10-20   | Update Profile             |
| **File Uploads**        | 60            | 5-10    | Avatar Upload              |
| **Data Creation**       | 60            | 20-50   | Create Job, Create Company |
| **Data Reads**          | 60            | 50-200  | Get Users, Get Jobs        |
| **Search**              | 60            | 100-300 | Search Endpoint            |

## Combining with Other Guards

You can combine throttle guard with other guards:

```typescript
@UseGuards(AuthGuard, RolesGuard, CustomThrottleGuard)
@Throttle({ ttl: 60, limit: 10 })
@Roles(UserRole.ADMIN)
@Mutation(() => User)
async deleteUser(@Args('id') id: string) {
  return this.userService.delete(id);
}
```

**Order matters**: Place `CustomThrottleGuard` last to check rate limits after authentication/authorization.

## Testing

Test your rate limits in development:

```bash
# Using curl (replace with your GraphQL endpoint)
for i in {1..15}; do
  curl -X POST http://localhost:3000/graphql \
    -H "Content-Type: application/json" \
    -d '{"query":"{ getUser { id } }"}' \
    && echo " - Request $i"
done
```

After exceeding the limit, you should see throttle errors.

## Monitoring

Log throttle events for monitoring:

```typescript
protected throwThrottlingException(context: ExecutionContext): void {
  const handler = context.getHandler().name;
  console.warn(`Rate limit exceeded for ${handler}`);

  // Send to monitoring service
  // this.metricsService.recordThrottleEvent(handler);

  super.throwThrottlingException(context);
}
```

## Advanced: User-Based Throttling

To track by user ID instead of IP:

```typescript
protected async getTracker(req: Record<string, any>): Promise<string> {
  // Get user from request context
  const userId = req.user?.id;

  if (userId) {
    return `user-${userId}`;
  }

  // Fall back to IP for unauthenticated requests
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  return `ip-${ip}`;
}
```

## Advanced: Redis Storage (for distributed systems)

For production with multiple servers, use Redis:

```typescript
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';

// In app.module.ts
const redis = new Redis({
	host: process.env.REDIS_HOST,
	port: process.env.REDIS_PORT,
});

ThrottlerModule.forRoot({
	throttlers: [{ name: 'default', ttl: 60000, limit: 100 }],
	storage: new ThrottlerStorageRedisService(redis),
});
```

## Troubleshooting

### Issue: "Cannot find module '@nestjs/throttler'"

**Solution**: Install the package

```bash
npm install @nestjs/throttler
```

### Issue: Throttle not working

**Solution**: Make sure:

1. `ThrottlerModule` is imported in `app.module.ts`
2. `@UseGuards(CustomThrottleGuard)` is added to the resolver
3. `@Throttle()` decorator is present

### Issue: Getting throttled too quickly

**Solution**: Increase the `limit` or `ttl` in your `@Throttle()` decorator

## Summary

The custom throttle guard provides flexible, easy-to-use rate limiting for your GraphQL API. Use it to protect your endpoints from abuse while maintaining a good user experience.

**Quick Reference**:

- `@Throttle({ ttl: 60, limit: 10 })` - 10 requests per minute
- Combine with `@UseGuards(CustomThrottleGuard)`
- Customize message with `message` property
- Monitor and adjust limits based on usage patterns
