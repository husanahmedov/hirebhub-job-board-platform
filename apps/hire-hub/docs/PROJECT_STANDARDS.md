# HireHub Project Standards & Architecture

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Project Structure](#project-structure)
- [Error Handling Standards](#error-handling-standards)
- [Logging Standards](#logging-standards)
- [Component Architecture](#component-architecture)
- [GraphQL Standards](#graphql-standards)
- [Code Organization](#code-organization)
- [Best Practices](#best-practices)

---

## 🎯 Project Overview

**HireHub** is a NestJS-based GraphQL API for a job recruitment platform built with:

- **Framework**: NestJS (Node.js)
- **API Type**: GraphQL (Apollo Server)
- **Database**: MongoDB (Mongoose ODM)
- **Language**: TypeScript
- **Architecture**: Monorepo (contains hire-hub main app and hirehub-batch)

---

## 📁 Project Structure

### Root Structure

```
hire-hub/
├── apps/
│   ├── hire-hub/              # Main GraphQL API application
│   └── hirehub-batch/         # Batch processing service
├── eslint.config.mjs          # ESLint configuration
├── nest-cli.json              # NestJS CLI configuration
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript base configuration
└── tsconfig.build.json        # TypeScript build configuration
```

### Main Application Structure (`apps/hire-hub/`)

```
apps/hire-hub/
├── src/
│   ├── main.ts                    # Application entry point
│   ├── app.module.ts              # Root module
│   ├── app.controller.ts          # Root controller
│   ├── app.service.ts             # Root service
│   ├── app.resolver.ts            # Root GraphQL resolver
│   │
│   ├── components/                # Feature modules (business logic)
│   │   ├── user/
│   │   ├── company/
│   │   ├── job/
│   │   ├── application/
│   │   ├── notification/
│   │   ├── bookmark/
│   │   ├── resume/
│   │   └── company-review/
│   │
│   ├── database/                  # Database configuration
│   │   └── database.module.ts
│   │
│   ├── libs/                      # Shared utilities & libraries
│   │   ├── dto/                   # Data Transfer Objects
│   │   ├── enums/                 # Enumerations
│   │   ├── exceptions/            # Custom exception classes
│   │   ├── filters/               # Exception filters
│   │   ├── interfaces/            # TypeScript interfaces
│   │   ├── types/                 # TypeScript types
│   │   ├── error-handler.util.ts  # Error handling utility
│   │   ├── logger.util.ts         # Logging utility
│   │   ├── env.util.ts            # Environment utilities
│   │   └── index.ts               # Barrel export
│   │
│   └── schemas/                   # Mongoose schemas
│       └── User.model.ts
│
├── docs/                          # Documentation
│   ├── APP_MODULE_EXPLAINED.md
│   ├── ERROR_HANDLING_QUICK_REF.md
│   ├── GRAPHQL_EXCEPTION_MIGRATION.md
│   └── PROJECT_STANDARDS.md
│
└── test/                          # E2E tests
    ├── app.e2e-spec.ts
    └── jest-e2e.json
```

---

## 🚨 Error Handling Standards

### Architecture

The project uses a **three-tier error handling system**:

#### 1. Base Exception Class (`BaseGraphQLException`)

Located in [`libs/exceptions/base.exception.ts`](../src/libs/exceptions/base.exception.ts)

```typescript
export class BaseGraphQLException extends GraphQLError {
	public readonly errorCode: ErrorCode;
	public readonly timestamp: string;
	public readonly details?: any;

	constructor(errorCode: ErrorCode, message?: string, details?: any) {
		super(message || ErrorMessage[errorCode], {
			extensions: {
				code: errorCode,
				timestamp: new Date().toISOString(),
				details,
			},
		});
	}
}
```

**Features:**

- Extends `GraphQLError` for GraphQL compatibility
- Includes error code, timestamp, and optional details
- Maintains proper stack traces
- Centralized error structure

#### 2. Custom Exception Classes

Located in [`libs/exceptions/custom.exceptions.ts`](../src/libs/exceptions/custom.exceptions.ts)

All specific exceptions extend `BaseGraphQLException`:

```typescript
export class UserNotFoundException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.USER_NOT_FOUND, undefined, details);
	}
}

export class InvalidCredentialsException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.INVALID_CREDENTIALS, undefined, details);
	}
}
```

**Available Exceptions:**

- `UserNotFoundException`
- `UserAlreadyExistsException`
- `UserCreationFailedException`
- `InvalidCredentialsException`
- `UnauthorizedException`
- `ForbiddenException`
- `CompanyNotFoundException`
- `JobNotFoundException`
- `ApplicationNotFoundException`
- `ApplicationAlreadyExistsException`
- `ResumeNotFoundException`
- And more...

#### 3. Error Handler Utility

Located in [`libs/error-handler.util.ts`](../src/libs/error-handler.util.ts)

Provides standardized error handling and transformation:

```typescript
export class ErrorHandler {
  // Handle and transform errors
  static handle(error: any, context?: string, defaultErrorCode?: ErrorCode): never {
    if (error instanceof BaseGraphQLException) {
      throw error;
    }
    LoggerUtil.error(`Error in ${context}`, error);
    throw this.transformError(error, defaultErrorCode);
  }

  // Transform generic errors into custom exceptions
  static transformError(error: any, defaultErrorCode: ErrorCode): BaseGraphQLException {
    // MongoDB duplicate key error
    if (error.name === 'MongoServerError' && error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0];
      return new BaseGraphQLException(ErrorCode.DUPLICATE_KEY_ERROR, ...);
    }
    // ... other transformations
  }
}
```

### Error Codes & Messages

Defined in [`libs/enums/error.enum.ts`](../src/libs/enums/error.enum.ts)

```typescript
export enum ErrorCode {
	// User errors
	USER_NOT_FOUND = 'USER_NOT_FOUND',
	USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
	INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

	// Generic errors
	INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	DUPLICATE_KEY_ERROR = 'DUPLICATE_KEY_ERROR',
	// ...
}

export const ErrorMessage: Record<ErrorCode, string> = {
	[ErrorCode.USER_NOT_FOUND]: 'User not found',
	[ErrorCode.USER_ALREADY_EXISTS]: 'User already exists',
	// ...
};
```

### Usage Example

```typescript
// In a service
async findUser(id: string) {
  try {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new UserNotFoundException({ userId: id });
    }
    return user;
  } catch (error) {
    ErrorHandler.handle(error, 'UserService.findUser');
  }
}
```

### Global Error Formatting

Configured in [`app.module.ts`](../src/app.module.ts):

```typescript
GraphQLModule.forRoot({
	formatError: (error: IGraphqlError) => {
		const code = error?.extensions?.code || 'INTERNAL_SERVER_ERROR';
		const message = error?.extensions?.originalError?.message || error?.message;
		const statusCode = error?.extensions?.originalError?.statusCode || 500;
		const details = error?.extensions?.details;
		const timestamp = error?.extensions?.timestamp || new Date().toISOString();

		LoggerUtil.error('GraphQL Error', error.message);

		return {
			code,
			message,
			timestamp,
			statusCode,
			...(details && { details }),
		};
	},
});
```

---

## 📝 Logging Standards

### Logger Utility

Located in [`libs/logger.util.ts`](../src/libs/logger.util.ts)

A beautiful, color-coded console logging utility using **chalk**.

#### Available Methods

```typescript
// Success logs (green)
LoggerUtil.success('Database connected successfully');
LoggerUtil.success('Application Started', 'Port: 3000');

// Error logs (red)
LoggerUtil.error('Connection failed', new Error('Connection timeout'));
LoggerUtil.error('Database error', errorObject);

// Info logs (blue)
LoggerUtil.info('Server', 'Running on port 3000');
LoggerUtil.info('Config', 'Loading environment variables');

// Warning logs (yellow)
LoggerUtil.warning('Deprecated API', 'Use v2 instead');

// Module loading logs (magenta)
LoggerUtil.module('UserModule');
LoggerUtil.module('DatabaseModule');

// Debug logs (cyan) - only in development
LoggerUtil.debug('Request payload', { user: 'john' });

// Pretty print objects (gray)
LoggerUtil.pretty({ name: 'John', age: 30 });

// Custom banner
LoggerUtil.banner('HIREHUB API', ['Version: 1.0.0', 'Environment: production', 'Port: 3000']);
```

#### Log Format

All logs include:

- **Timestamp** - ISO 8601 format
- **Label** - Color-coded label (SUCCESS, ERROR, INFO, etc.)
- **Message** - Main log message
- **Details** - Optional additional information

Example output:

```
[2025-12-31T10:30:45.123Z] SUCCESS Application Started → Port: 3000
[2025-12-31T10:30:46.456Z] MODULE  UserModule initialized
[2025-12-31T10:30:47.789Z] ERROR   Database connection failed
```

### Usage Guidelines

1. **Use appropriate log levels:**
   - `success()` - For successful operations (startup, connections)
   - `error()` - For errors and exceptions
   - `info()` - For general information
   - `warning()` - For deprecated features or warnings
   - `module()` - For module initialization
   - `debug()` - For debugging (dev only)

2. **Provide context:**

   ```typescript
   // Good
   LoggerUtil.info('UserService', `Creating user: ${email}`);

   // Bad
   LoggerUtil.info('Creating user');
   ```

3. **Log at appropriate times:**
   - Application startup/shutdown
   - Module initialization
   - Database connections
   - GraphQL errors
   - Critical business operations
   - Authentication events

---

## 🧩 Component Architecture

### Component Structure

Each component (feature module) follows this pattern:

```
component-name/
├── component-name.module.ts    # Feature module
├── component-name.resolver.ts  # GraphQL resolver
├── component-name.service.ts   # Business logic
└── (optional) component-name.controller.ts  # REST controller (if needed)
```

### Module Example (`user.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import UserModel from '../../schemas/User.model';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'User', schema: UserModel }])],
	providers: [UserResolver, UserService],
	exports: [UserService], // Export if used by other modules
})
export class UserModule {}
```

### Resolver Pattern

```typescript
@Resolver(() => User)
export class UserResolver {
	constructor(private readonly userService: UserService) {}

	@Query(() => User)
	async getUser(@Args('id') id: string): Promise<User> {
		return this.userService.findById(id);
	}

	@Mutation(() => User)
	async createUser(@Args('input') input: CreateUserInput): Promise<User> {
		return this.userService.create(input);
	}
}
```

### Service Pattern

```typescript
@Injectable()
export class UserService {
	constructor(@InjectModel('User') private userModel: Model<User>) {}

	async findById(id: string): Promise<User> {
		try {
			const user = await this.userModel.findById(id);
			if (!user) {
				throw new UserNotFoundException({ userId: id });
			}
			return user;
		} catch (error) {
			ErrorHandler.handle(error, 'UserService.findById');
		}
	}
}
```

### Component Responsibilities

| Layer        | Responsibility                | Example                                  |
| ------------ | ----------------------------- | ---------------------------------------- |
| **Module**   | Dependency injection, imports | Register providers, import other modules |
| **Resolver** | GraphQL endpoint, validation  | Handle queries/mutations, validate input |
| **Service**  | Business logic, data access   | Database operations, business rules      |
| **Model**    | Data structure, schema        | Define Mongoose schemas                  |

---

## 🔌 GraphQL Standards

### Schema Generation

- **Auto Schema File**: GraphQL schema is auto-generated from TypeScript decorators
- **Code-First Approach**: Define types in TypeScript, schema is generated automatically

### DTO Standards

Located in [`libs/dto/`](../src/libs/dto/)

#### Input Types

```typescript
@InputType()
export class CreateUserInput {
	@Field()
	@IsEmail()
	email: string;

	@Field()
	@MinLength(8)
	password: string;
}
```

#### Output Types

```typescript
@ObjectType()
export class User {
	@Field(() => ID)
	id: string;

	@Field()
	email: string;

	@Field()
	createdAt: Date;
}
```

#### Query Types

```typescript
@ArgsType()
export class UserQueryArgs {
	@Field(() => Int, { nullable: true })
	limit?: number;

	@Field(() => Int, { nullable: true })
	offset?: number;
}
```

### Validation

- Use **class-validator** decorators in DTOs
- Global validation pipe configured in [`main.ts`](../src/main.ts)
- Automatic validation before resolver execution

---

## 🗂️ Code Organization

### Barrel Exports

Use `index.ts` files for clean imports:

```typescript
// libs/index.ts
export * from './logger.util';
export * from './error-handler.util';
export * from './exceptions/base.exception';
export * from './exceptions/custom.exceptions';

// Usage
import { LoggerUtil, ErrorHandler, UserNotFoundException } from '@/libs';
```

### Naming Conventions

| Type           | Convention               | Example           |
| -------------- | ------------------------ | ----------------- |
| **Files**      | kebab-case               | `user.service.ts` |
| **Classes**    | PascalCase               | `UserService`     |
| **Interfaces** | PascalCase with I prefix | `IGraphqlError`   |
| **Types**      | PascalCase with T prefix | `TUserRole`       |
| **Enums**      | PascalCase               | `ErrorCode`       |
| **Constants**  | UPPER_SNAKE_CASE         | `MAX_RETRIES`     |
| **Variables**  | camelCase                | `userId`          |

### Folder Organization

```
src/
├── components/      # Feature modules (business domains)
├── database/        # Database configuration
├── libs/            # Shared utilities, helpers, types
│   ├── dto/         # Data Transfer Objects
│   ├── enums/       # Enumerations
│   ├── exceptions/  # Custom exceptions
│   ├── filters/     # Exception filters
│   ├── interfaces/  # TypeScript interfaces
│   └── types/       # TypeScript types
└── schemas/         # Mongoose schemas
```

---

## ✨ Best Practices

### 1. Error Handling

- ✅ Always use custom exceptions (never throw raw `Error`)
- ✅ Use `ErrorHandler.handle()` for consistent error handling
- ✅ Include context in error logs
- ✅ Provide meaningful error details
- ❌ Don't expose internal errors to clients

### 2. Logging

- ✅ Log all critical operations
- ✅ Use appropriate log levels
- ✅ Include context in log messages
- ✅ Log errors before throwing
- ❌ Don't log sensitive information (passwords, tokens)

### 3. Module Organization

- ✅ One feature per module
- ✅ Export services that are used by other modules
- ✅ Import only what you need
- ❌ Don't create circular dependencies

### 4. Service Layer

- ✅ Keep business logic in services
- ✅ Use dependency injection
- ✅ Handle errors gracefully
- ✅ Validate input data
- ❌ Don't access database directly from resolvers

### 5. Code Style

- ✅ Use TypeScript strict mode
- ✅ Add JSDoc comments for complex functions
- ✅ Use async/await (not callbacks)
- ✅ Use const/let (not var)
- ❌ Don't use `any` type (use `unknown` if needed)

### 6. GraphQL

- ✅ Use DTOs for all inputs/outputs
- ✅ Validate all inputs
- ✅ Use descriptive field names
- ✅ Document schema with descriptions
- ❌ Don't expose internal IDs or sensitive data

### 7. Testing

- ✅ Write unit tests for services
- ✅ Write E2E tests for critical flows
- ✅ Test error scenarios
- ✅ Mock external dependencies
- ❌ Don't test implementation details

---

## 🚀 Development Workflow

### Starting the Application

```bash
# Development mode with watch
npm run start:dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

### Environment Setup

Create `.env` file in root:

```env
# Application
HIREHUB_PORT=3000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/hirehub

# CORS
CORS_ORIGIN=http://localhost:3001
```

### GraphQL Playground

Access at: `http://localhost:3000/graphql`

---

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 🎓 Key Takeaways

1. **Consistency**: Follow established patterns across all components
2. **Error Handling**: Use the three-tier exception system
3. **Logging**: Use LoggerUtil for all logging needs
4. **Modularity**: Keep components independent and reusable
5. **Type Safety**: Leverage TypeScript's type system
6. **Documentation**: Document complex logic and public APIs
7. **Testing**: Write tests for critical functionality

---

**Last Updated**: December 31, 2025  
**Version**: 1.0.0  
**Maintained By**: HireHub Development Team
