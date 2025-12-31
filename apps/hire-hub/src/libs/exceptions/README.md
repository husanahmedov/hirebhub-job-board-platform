# GraphQL Exception Handling

This directory contains the custom GraphQL exception system for the HireHub application.

## Overview

All exceptions in this application are designed specifically for GraphQL and extend `BaseGraphQLException`, which in turn extends `GraphQLError`. This ensures consistent error formatting and proper integration with Apollo Server.

## Base Exception

**`BaseGraphQLException`** - The foundation for all custom exceptions

- Extends `GraphQLError` for proper GraphQL integration
- Automatically includes error code, timestamp, and optional details
- Consistent error structure across the entire API

```typescript
throw new BaseGraphQLException(
	ErrorCode.USER_NOT_FOUND,
	'Custom message (optional)',
	{ userId: '123' }, // details (optional)
);
```

## Custom Exceptions

All custom exceptions are located in `custom.exceptions.ts` and include:

### User Exceptions

- `UserNotFoundException`
- `UserAlreadyExistsException`
- `UserCreationFailedException`
- `InvalidCredentialsException`

### Authentication Exceptions

- `UnauthorizedException`
- `ForbiddenException`

### Resource Exceptions

- `CompanyNotFoundException`
- `JobNotFoundException`
- `ApplicationNotFoundException`
- `ApplicationAlreadyExistsException`
- `ResumeNotFoundException`
- `BookmarkNotFoundException`
- `BookmarkAlreadyExistsException`

### Generic Exceptions

- `ValidationException`
- `NotFoundException`
- `BadRequestException`
- `InternalServerException`
- `DatabaseException`

## Usage Examples

### Basic Usage

```typescript
import { UserNotFoundException } from '@libs/exceptions/custom.exceptions';

// Simple throw
throw new UserNotFoundException();

// With details
throw new UserNotFoundException({ userId: user.id });
```

### In Service Methods

```typescript
async findUser(id: string) {
  const user = await this.userModel.findById(id);

  if (!user) {
    throw new UserNotFoundException({ userId: id });
  }

  return user;
}
```

### With Error Handler Utility

```typescript
import { ErrorHandler } from '@libs/error-handler.util';

// Automatic error transformation
ErrorHandler.handle(error, 'UserService.createUser');

// Assert conditions
ErrorHandler.assert(user !== null, ErrorCode.USER_NOT_FOUND);

// Generic not found
ErrorHandler.notFound('User', userId);
```

## Error Response Format

All GraphQL errors are automatically formatted by Apollo Server:

```json
{
	"errors": [
		{
			"code": "USER_2001",
			"message": "User not found",
			"timestamp": "2025-12-30T10:30:00.000Z",
			"details": {
				"userId": "123"
			}
		}
	],
	"data": null
}
```

## Error Codes

Error codes follow a structured pattern defined in `error.enum.ts`:

- **1xxx**: Authentication & Authorization
- **2xxx**: User operations
- **3xxx**: Company operations
- **4xxx**: Job operations
- **5xxx**: Application operations
- **6xxx**: Resume operations
- **7xxx**: Bookmark operations
- **8xxx**: Notification operations
- **9xxx**: Database operations
- **10xxx**: Validation errors
- **11xxx**: File operations
- **12xxx**: External services
- **99xxx**: Generic errors

## Benefits

1. **Type Safety**: Full TypeScript support with proper types
2. **Consistency**: All errors follow the same structure
3. **GraphQL Native**: Properly integrated with Apollo Server
4. **Easy to Use**: Simple constructors with optional details
5. **Automatic Formatting**: Error formatting handled by Apollo
6. **Detailed Logging**: All errors are logged automatically
7. **Developer Friendly**: Clear error codes and messages

## Migration from HTTP Exceptions

The old `BaseException` (extending `HttpException`) has been replaced with `BaseGraphQLException` (extending `GraphQLError`). The key differences:

- No HTTP status codes (not needed in GraphQL)
- Error extensions instead of response objects
- Simpler constructor (no status code parameter)
- Native GraphQL error handling
