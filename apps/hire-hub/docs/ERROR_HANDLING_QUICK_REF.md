# Error Handling Quick Reference

## Import What You Need

```typescript
import {
	// Custom Exceptions
	UserNotFoundException,
	UserAlreadyExistsException,
	InvalidCredentialsException,
	ValidationException,

	// Error Handler Utility
	ErrorHandler,

	// Error Codes (if needed)
	ErrorCode,
} from '../../libs';
```

## Common Patterns

### 1. Check if Entity Exists

```typescript
const user = await this.userModel.findById(id);
if (!user) {
	throw new UserNotFoundException({ userId: id });
}
```

Or use ErrorHandler:

```typescript
const user = await this.userModel.findById(id);
ErrorHandler.assert(!!user, ErrorCode.USER_NOT_FOUND, 'User not found', { userId: id });
```

### 2. Check for Duplicates

```typescript
const existing = await this.userModel.findOne({ email: input.email });
if (existing) {
	throw new UserAlreadyExistsException({ email: input.email });
}
```

### 3. Wrap Database Operations

```typescript
try {
	const result = await this.model.save();
	return result;
} catch (error) {
	ErrorHandler.handle(error, 'ServiceName.methodName', ErrorCode.CREATION_FAILED);
}
```

Or use safely:

```typescript
return ErrorHandler.safely(
	async () => {
		return await this.model.save();
	},
	'ServiceName.methodName',
	ErrorCode.CREATION_FAILED,
);
```

### 4. Validation Errors

```typescript
if (!isValidEmail(input.email)) {
	throw new ValidationException('Invalid email format', {
		field: 'email',
		value: input.email,
	});
}
```

### 5. Authorization Checks

```typescript
if (user.id !== requestingUserId) {
	throw new ForbiddenException({
		message: 'You can only update your own profile',
	});
}
```

## Available Exceptions

| Exception                           | Use Case              | HTTP Status |
| ----------------------------------- | --------------------- | ----------- |
| `UserNotFoundException`             | User not found        | 404         |
| `UserAlreadyExistsException`        | Duplicate user        | 409         |
| `UserCreationFailedException`       | User creation error   | 500         |
| `InvalidCredentialsException`       | Login failed          | 401         |
| `UnauthorizedException`             | Not authenticated     | 401         |
| `ForbiddenException`                | No permission         | 403         |
| `CompanyNotFoundException`          | Company not found     | 404         |
| `JobNotFoundException`              | Job not found         | 404         |
| `ApplicationNotFoundException`      | Application not found | 404         |
| `ApplicationAlreadyExistsException` | Already applied       | 409         |
| `ValidationException`               | Input validation      | 400         |
| `DatabaseException`                 | DB operation failed   | 500         |
| `NotFoundException`                 | Generic not found     | 404         |
| `BadRequestException`               | Generic bad request   | 400         |
| `InternalServerException`           | Generic server error  | 500         |

## Error Handler Methods

### `ErrorHandler.handle(error, context, defaultErrorCode)`

Handles and transforms errors, then throws appropriate exception

```typescript
catch (error) {
  ErrorHandler.handle(error, 'UserService.register', ErrorCode.USER_CREATION_FAILED);
}
```

### `ErrorHandler.safely(operation, context, errorCode)`

Executes async operation with automatic error handling

```typescript
return ErrorHandler.safely(async () => await this.model.findById(id), 'UserService.findById', ErrorCode.USER_NOT_FOUND);
```

### `ErrorHandler.assert(condition, errorCode, message, details)`

Throws exception if condition is false

```typescript
ErrorHandler.assert(user.isActive, ErrorCode.FORBIDDEN, 'User account is inactive', { userId: user.id });
```

### `ErrorHandler.notFound(resource, identifier)`

Throws a not found exception

```typescript
ErrorHandler.notFound('User', userId);
```

## Complete Service Example

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
	LoggerUtil,
	ErrorHandler,
	ErrorCode,
	UserNotFoundException,
	UserAlreadyExistsException,
	UserCreationFailedException,
} from '../../libs';

@Injectable()
export class UserService {
	constructor(@InjectModel('User') private userModel: Model<User>) {}

	async findById(id: string): Promise<User> {
		const user = await this.userModel.findById(id);

		if (!user) {
			throw new UserNotFoundException({ userId: id });
		}

		return user;
	}

	async register(input: RegisterUserInput): Promise<User> {
		try {
			// Check for existing user
			const existing = await this.userModel.findOne({ email: input.email });
			if (existing) {
				throw new UserAlreadyExistsException({ email: input.email });
			}

			// Create user
			const newUser = new this.userModel(input);
			const savedUser = await newUser.save();

			LoggerUtil.success('User registered', `Email: ${savedUser.email}`);
			return savedUser;
		} catch (error) {
			// Re-throw custom exceptions
			if (error instanceof UserAlreadyExistsException) {
				throw error;
			}

			// Handle other errors
			ErrorHandler.handle(error, 'UserService.register', ErrorCode.USER_CREATION_FAILED);
		}
	}

	async update(id: string, input: UpdateUserInput): Promise<User> {
		return ErrorHandler.safely(
			async () => {
				const user = await this.userModel.findById(id);

				ErrorHandler.assert(!!user, ErrorCode.USER_NOT_FOUND, 'User not found', { userId: id });

				Object.assign(user, input);
				return await user.save();
			},
			'UserService.update',
			ErrorCode.USER_UPDATE_FAILED,
		);
	}

	async delete(id: string): Promise<boolean> {
		const result = await this.userModel.deleteOne({ _id: id });

		ErrorHandler.assert(result.deletedCount > 0, ErrorCode.USER_NOT_FOUND, 'User not found or already deleted', {
			userId: id,
		});

		LoggerUtil.success('User deleted', `ID: ${id}`);
		return true;
	}
}
```

## GraphQL Resolver Example

```typescript
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UserNotFoundException } from '../../libs';

@Resolver(() => User)
export class UserResolver {
	constructor(private userService: UserService) {}

	@Query(() => User)
	async user(@Args('id') id: string): Promise<User> {
		// Errors are automatically caught and formatted
		return await this.userService.findById(id);
	}

	@Mutation(() => User)
	async registerUser(@Args('input') input: RegisterUserInput): Promise<User> {
		return await this.userService.register(input);
	}
}
```

## REST Controller Example

```typescript
import { Controller, Get, Post, Param, Body } from '@nestjs/common';

@Controller('users')
export class UserController {
	constructor(private userService: UserService) {}

	@Get(':id')
	async getUser(@Param('id') id: string): Promise<User> {
		// Errors are automatically caught and formatted
		return await this.userService.findById(id);
	}

	@Post()
	async createUser(@Body() input: CreateUserInput): Promise<User> {
		return await this.userService.createUser(input);
	}
}
```

## Testing

```typescript
describe('UserService', () => {
	it('should throw UserNotFoundException', async () => {
		await expect(userService.findById('invalid-id')).rejects.toThrow(UserNotFoundException);
	});

	it('should throw UserAlreadyExistsException', async () => {
		await expect(userService.register({ email: 'existing@test.com' })).rejects.toThrow(UserAlreadyExistsException);
	});
});
```

## Tips

✅ Always provide context/details in exceptions  
✅ Use specific exceptions instead of generic ones  
✅ Log success operations for auditing  
✅ Re-throw custom exceptions in catch blocks  
✅ Use ErrorHandler.safely() for database ops  
✅ Use ErrorHandler.assert() for validations  
✅ Add new error codes when needed

❌ Don't swallow errors silently  
❌ Don't expose sensitive data in error messages  
❌ Don't use generic Error class  
❌ Don't forget to log important operations  
❌ Don't return raw error messages to clients
