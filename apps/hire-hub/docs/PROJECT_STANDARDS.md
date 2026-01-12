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

- **Framework**: NestJS v10.x (Node.js)
- **API Type**: GraphQL (Apollo Server)
- **Database**: MongoDB (Mongoose ODM with Aggregation Pipelines)
- **Language**: TypeScript (Strict Mode)
- **Architecture**: Monorepo (contains hire-hub main app and hirehub-batch)
- **Template Engine**: Handlebars (hbs) for health monitoring dashboard
- **Monitoring**: @nestjs/terminus for health checks

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
│   │   ├── admin/                 # System settings & admin operations
│   │   ├── application/           # Job applications
│   │   ├── auth/                  # Authentication & authorization
│   │   ├── bookmark/              # Job bookmarks
│   │   ├── company/               # Company management
│   │   ├── company-review/        # Company reviews & ratings
│   │   ├── health/                # Health check monitoring
│   │   ├── job/                   # Job postings (CRUD, filtering)
│   │   ├── notification/          # User notifications
│   │   ├── resume/                # Resume management
│   │   ├── uploader/              # File upload service
│   │   └── user/                  # User management
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
│       ├── User.model.ts
│       ├── Company.model.ts
│       ├── Job.model.ts
│       └── SystemSetting.model.ts
│
├── docs/                          # Documentation
│   ├── ADMIN_SYSTEM_SETTINGS_API.md
│   ├── AGGREGATION_GUIDE.md
│   ├── AGGREGATION_OPERATORS_REFERENCE.md
│   ├── APP_MODULE_EXPLAINED.md
│   ├── COMPANY_ARCHITECTURE.md
│   ├── COMPANY_MODULE_SUMMARY.md
│   ├── CONTENT_MODERATION_API.md
│   ├── ERROR_HANDLING_QUICK_REF.md
│   ├── FILE_UPLOAD_GUIDE.md
│   ├── GRAPHQL_EXCEPTION_MIGRATION.md
│   ├── JOB_API_GUIDE.md
│   ├── OAUTH_IMPLEMENTATION.md
│   ├── PROJECT_STANDARDS.md
│   ├── STARTING_PROMPT.md
│   └── VALIDATION_ERROR_HANDLING.md
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
- `InvalidFileTypeException`
- `FileTooLargeException`
- `SettingNotFoundException`
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

### Real-World Example: Job Module

A complete implementation demonstrating all architecture patterns:

#### File Structure

```
job/
├── job.module.ts      # Module configuration
├── job.resolver.ts    # GraphQL queries & mutations (348 lines)
└── job.service.ts     # Business logic with aggregation (463 lines)
```

#### Schema (`schemas/Job.model.ts`)

```typescript
const JobSchema = new Schema(
	{
		companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
		postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		title: { type: String, required: true, index: 'text' },
		slug: { type: String, required: true, unique: true },
		description: { type: String, index: 'text' },
		employmentType: { type: String, enum: JobType },
		seniorityLevel: { type: String, enum: JobLevel },
		location: { type: JobLocationSchema, required: true },
		salaryRange: { type: SalaryRangeSchema },
		tags: [String],
		skills: [String],
		isPublished: { type: Boolean, default: false },
		viewsCount: { type: Number, default: 0 },
		applicationsCount: { type: Number, default: 0 },
		deletedAt: { type: Date },
	},
	{ timestamps: true },
);

// Text index for full-text search
JobSchema.index({ title: 'text', description: 'text' });
```

#### Service Methods

```typescript
@Injectable()
export class JobService {
	// Create job with slug uniqueness check
	async createJob(input: CreateJobInput, userId: string): Promise<JobOutput>;

	// List with aggregation pipeline (filters, pagination, joins)
	async getJobs(input: GetJobsInput): Promise<PaginatedJobsOutput>;

	// Single job with .populate() and view tracking
	async getJobById(jobId: string, incrementView?: boolean): Promise<JobOutput>;
	async getJobBySlug(slug: string, incrementView?: boolean): Promise<JobOutput>;

	// Update with validation
	async updateJob(input: UpdateJobInput, userId: string): Promise<JobOutput>;

	// Soft delete
	async deleteJob(jobId: string): Promise<boolean>;

	// Close job (mark as filled)
	async closeJob(jobId: string): Promise<JobOutput>;

	// Aggregation for statistics
	async getJobStats(companyId?: string): Promise<JobStatsOutput>;

	// Private mapper for consistent output
	private mapToJobOutput(job: any): JobOutput;
}
```

#### Resolver Queries & Mutations

```typescript
@Resolver(() => JobOutput)
export class JobResolver {
  // PUBLIC QUERIES
  @Query(() => PaginatedJobsOutput)
  async getJobs(@Args('input') input: GetJobsInput): Promise<PaginatedJobsOutput>

  @Query(() => JobOutput)
  async getJobById(@Args('jobId') jobId: string): Promise<JobOutput>

  @Query(() => JobOutput)
  async getJobBySlug(@Args('slug') slug: string): Promise<JobOutput>

  // AUTHENTICATED QUERIES
  @Query(() => JobStatsOutput)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  async getJobStats(@Context() context): Promise<JobStatsOutput>

  // MUTATIONS (RECRUITER/ADMIN ONLY)
  @Mutation(() => JobOutput)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  async createJob(@Args('input') input: CreateJobInput, @Context() context)

  @Mutation(() => JobOutput)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  async updateJob(@Args('input') input: UpdateJobInput, @Context() context)

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  async deleteJob(@Args('jobId') jobId: string): Promise<boolean>

  @Mutation(() => JobOutput)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  async closeJob(@Args('jobId') jobId: string): Promise<JobOutput>
}
```

#### Input/Output DTOs

```typescript
// 9 Input Types (libs/dto/job/input.ts - 471 lines)
-CreateJobInput - // Full job creation
	UpdateJobInput - // Partial updates
	GetJobsInput - // With nested filters
	JobFilterInput - // All filter options
	JobSortInput - // Sort configuration
	PaginationInput - // Page, limit
	JobLocationInput - // Location sub-schema
	SalaryRangeInput - // Salary sub-schema
	// 5 Output Types (libs/dto/job/output.ts - 180 lines)
	JobOutput - // Complete job data
	JobLocationOutput - // Location data
	SalaryRangeOutput - // Salary data
	PaginatedJobsOutput - // List with pagination meta
	JobStatsOutput; // Aggregated statistics
```

#### Advanced Features

- **Full-text search** on title & description
- **Advanced filtering**: location, skills, tags, salary, employment type
- **Role-based access control**: Public queries, protected mutations
- **View tracking**: Increment views on job access
- **Aggregation pipeline**: Efficient list queries with joins
- **Soft deletes**: Preserve data with `deletedAt` timestamp
- **Slug uniqueness**: Prevent duplicate URLs
- **Populated relations**: Company and user data in responses

#### API Documentation

Complete Postman/Bruno guide available at: `docs/JOB_API_GUIDE.md`

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

## 🏥 Health Check & Monitoring

### Health Check System

Located in `components/health/`

The application includes a comprehensive health monitoring system using **@nestjs/terminus**.

#### Available Endpoints

1. **HTML Dashboard**: `http://localhost:8080/health`
   - Beautiful Handlebars-rendered dashboard
   - Real-time health indicators
   - Auto-refresh every 30 seconds
   - Displays: Database, Memory, Disk storage status

2. **JSON API**: `http://localhost:8080/health/json`
   - Machine-readable health status
   - For monitoring tools integration
   - Returns structured health data

#### Health Indicators

```typescript
@Get('/json')
async check() {
  return this.health.check([
    () => this.db.pingCheck('database'),
    () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
    () => this.disk.checkStorage('storage', {
      path: '/',
      thresholdPercent: 0.9
    }),
  ]);
}
```

**Monitored Resources:**

- **Database**: MongoDB connection health
- **Memory**: Heap usage (150MB threshold)
- **Disk**: Storage usage (90% threshold)

#### Handlebars Configuration

Configured in `main.ts`:

```typescript
const app = await NestFactory.create<NestExpressApplication>(AppModule);

// Configure Handlebars
app.useStaticAssets(join(process.cwd(), 'apps', 'hire-hub', 'public'));
app.setBaseViewsDir(join(process.cwd(), 'apps', 'hire-hub', 'views'));
app.setViewEngine('hbs');

// Register custom helpers
hbs.registerHelper('eq', function (a, b) {
	return a === b;
});
```

### Why Health Checks Matter

- **System Monitoring**: Real-time visibility into application health
- **Error Detection**: Identify issues before users experience problems
- **DevOps Integration**: Kubernetes/Docker health probes
- **Performance Tracking**: Monitor resource usage trends
- **Debugging**: Quick diagnosis of database/memory issues

---

## 🗂️ Code Organization

### MongoDB Aggregation Pipeline Standards

#### When to Use Aggregation vs. `.populate()`

**Use `.populate()` when:**

- Fetching single documents (e.g., `getJobById`, `getUserById`)
- Simple 1-2 relation joins
- Prototyping or rapid development
- Need Mongoose virtuals or middleware

**Use Aggregation Pipeline when:**

- Fetching lists with pagination (e.g., `getJobs`, `getCompanies`)
- Multiple joins (3+ relations)
- Complex filtering on related data
- Need computed fields (counts, averages)
- Performance-critical queries
- Combining data retrieval with count (using `$facet`)

#### Aggregation Pipeline Pattern

Example from `job.service.ts`:

```typescript
async getJobs(input: GetJobsInput = {}): Promise<PaginatedJobsOutput> {
  const pipeline: PipelineStage[] = [];

  // STAGE 1: TEXT SEARCH (if search query exists)
  if (filter.search) {
    pipeline.push({
      $match: { $text: { $search: filter.search } }
    });
    pipeline.push({
      $addFields: { textScore: { $meta: 'textScore' } }
    });
  }

  // STAGE 2: MATCH (filtering)
  pipeline.push({
    $match: {
      deletedAt: null,
      isPublished: true,
      // ... other filters
    }
  });

  // STAGE 3: LOOKUP (joins with sub-pipelines)
  pipeline.push({
    $lookup: {
      from: 'companies',
      localField: 'companyId',
      foreignField: '_id',
      as: 'companyData',
      pipeline: [
        { $project: { _id: 1, name: 1, logoUrl: 1 } }
      ]
    }
  });

  // STAGE 4: PROJECT (shape output)
  pipeline.push({
    $addFields: {
      companyData: { $arrayElemAt: ['$companyData', 0] }
    }
  });

  // STAGE 5: SORT
  pipeline.push({ $sort: { createdAt: -1 } });

  // STAGE 6: FACET (parallel data + count)
  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      metadata: [{ $count: 'totalCount' }]
    }
  });

  const result = await this.jobModel.aggregate(pipeline).exec();
  return this.mapResults(result);
}
```

#### Key Aggregation Operators

| Operator     | Purpose                 | Example                                         |
| ------------ | ----------------------- | ----------------------------------------------- |
| `$match`     | Filter documents        | `{ $match: { deletedAt: null } }`               |
| `$lookup`    | Join collections        | `{ $lookup: { from: 'users', ... } }`           |
| `$project`   | Select/transform fields | `{ $project: { name: 1, email: 1 } }`           |
| `$addFields` | Add computed fields     | `{ $addFields: { total: { $sum: ... } } }`      |
| `$sort`      | Order results           | `{ $sort: { createdAt: -1 } }`                  |
| `$group`     | Aggregate data          | `{ $group: { _id: null, count: { $sum: 1 } } }` |
| `$facet`     | Parallel pipelines      | `{ $facet: { data: [...], meta: [...] } }`      |
| `$text`      | Full-text search        | `{ $text: { $search: 'engineer' } }`            |
| `$in`        | Match in array          | `{ employmentType: { $in: ['FULL_TIME'] } }`    |
| `$all`       | Match all in array      | `{ skills: { $all: ['React', 'Node'] } }`       |

**Note:** The `$` symbol indicates MongoDB operators - you cannot create custom operators.

#### Text Search Index Configuration

In schema files (e.g., `Job.model.ts`):

```typescript
// Define text index on multiple fields
JobSchema.index({ title: 'text', description: 'text' });

// MongoDB will search BOTH fields when using $text operator
```

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
- ✅ Use aggregation pipelines for list queries
- ✅ Use `.populate()` for single document queries
- ✅ Implement soft deletes with `deletedAt` timestamps
- ✅ Create mapper functions for consistent output (e.g., `mapToJobOutput`)
- ❌ Don't access database directly from resolvers
- ❌ Don't use `.find()` with multiple `.populate()` - use aggregation instead

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

### 8. Database & Indexing

- ✅ Create indexes on frequently queried fields
- ✅ Use compound indexes for multi-field queries
- ✅ Create text indexes for full-text search
- ✅ Use aggregation for complex queries with multiple joins
- ✅ Monitor query performance with `.explain()`
- ✅ Implement pagination for all list endpoints
- ❌ Don't create too many indexes (impacts write performance)
- ❌ Don't forget to index foreign keys (ObjectId references)

### 9. Schema Design

- ✅ Use sub-schemas for nested structures (e.g., `JobLocationSchema`)
- ✅ Add validation at schema level (`required`, `min`, `max`, `enum`)
- ✅ Use enums for predefined values
- ✅ Include timestamps (`{ timestamps: true }`)
- ✅ Add indexes for common query patterns
- ✅ Use soft deletes with `deletedAt` field
- ❌ Don't expose internal fields to GraphQL output
- ❌ Don't use deeply nested structures (max 2-3 levels)

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

### Health Dashboard

Access at: `http://localhost:8080/health`

---

## 📚 Additional Resources

### Internal Documentation

- [Job API Guide](./JOB_API_GUIDE.md) - Complete Postman/Bruno testing guide
- [Aggregation Guide](./AGGREGATION_GUIDE.md) - MongoDB aggregation patterns
- [Aggregation Operators](./AGGREGATION_OPERATORS_REFERENCE.md) - Operator reference
- [Company Architecture](./COMPANY_ARCHITECTURE.md) - Company module deep dive
- [File Upload Guide](./FILE_UPLOAD_GUIDE.md) - File handling with Multer
- [OAuth Implementation](./OAUTH_IMPLEMENTATION.md) - Social login setup
- [Error Handling](./ERROR_HANDLING_QUICK_REF.md) - Quick reference

### External Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [MongoDB Aggregation](https://www.mongodb.com/docs/manual/aggregation/)
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
8. **Performance**: Use aggregation pipelines for complex queries
9. **Monitoring**: Health checks for production readiness
10. **Security**: Role-based access control on sensitive operations

---

**Last Updated**: January 12, 2026  
**Version**: 2.0.0  
**Maintained By**: HireHub Development Team

---

## 📊 Project Status

### Implemented Modules

- ✅ **User Module**: Authentication, profile management
- ✅ **Company Module**: Company CRUD with aggregation, reviews
- ✅ **Job Module**: Full CRUD, advanced filtering, aggregation
- ✅ **Auth Module**: JWT, OAuth, role-based access
- ✅ **Admin Module**: System settings management
- ✅ **Health Module**: Monitoring dashboard
- ✅ **Uploader Module**: File upload with Multer
- 🚧 **Application Module**: Job applications (in progress)
- 🚧 **Notification Module**: User notifications (in progress)
- 🚧 **Resume Module**: Resume management (in progress)
- 🚧 **Bookmark Module**: Job bookmarks (in progress)

### Key Features

- MongoDB aggregation pipelines for efficient queries
- Full-text search with text indexes
- Role-based access control (ADMIN, RECRUITER, CANDIDATE)
- Soft delete pattern
- Health monitoring dashboard
- Comprehensive error handling
- Request/response logging
- File upload support
- GraphQL schema-first approach
