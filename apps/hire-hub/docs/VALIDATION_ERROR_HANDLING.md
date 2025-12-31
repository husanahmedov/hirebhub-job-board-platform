# GraphQL Validation Error Handling

## Overview

HireHub uses a **two-layer error handling system** to catch and format all types of validation errors, providing consistent, user-friendly error responses across the entire GraphQL API.

## 🔄 Two-Layer Architecture

### Layer 1: GraphQL Schema Validation (Apollo/GraphQL Level)

**Location**: `app.module.ts` → `GraphQLModule.forRoot()` → `formatError`

**When it runs**: Before your resolver code executes

**What it validates**:

- Required fields are present
- Field types match schema (String, Int, Boolean, etc.)
- Enum values are valid
- Field names exist in the schema

**Example errors**:

- Missing required field: `role` not provided
- Wrong type: Sending `"abc"` for an `Int` field
- Unknown field: Sending `unknownField` that doesn't exist in schema

**Error code**: `BAD_USER_INPUT` (transformed to `VALIDATION_ERROR`)

---

### Layer 2: Class-Validator Validation (NestJS Level)

**Location**: `libs/filters/graphql-exception.filter.ts`

**When it runs**: After schema validation passes, inside your resolver when ValidationPipe runs

**What it validates**:

- `@IsEmail()` - Email format
- `@MinLength()`, `@MaxLength()` - String lengths
- `@IsNotEmpty()` - Non-empty values
- `@IsUrl()`, `@IsDate()`, custom validators, etc.

**Example errors**:

- Email format invalid: `"not-an-email"`
- Password too short: `"123"` when min is 8
- Empty string when `@IsNotEmpty()`

**Error code**: `VALIDATION_ERROR` (from `BadRequestException`)

---

## 📊 Request Flow Diagram

```
┌─────────────────────────────────────┐
│    GraphQL Request Received         │
└──────────────┬──────────────────────┘
               ↓
┌──────────────────────────────────────────────────────┐
│  Layer 1: GraphQL Schema Validation                  │
│  (app.module.ts → formatError)                       │
│                                                       │
│  Checks:                                             │
│  ✓ Required fields present?                          │
│  ✓ Types correct? (String, Int, etc.)               │
│  ✓ Enum values valid?                                │
└──────────────┬───────────────────────────────────────┘
               │
               ├─── ❌ Invalid → Returns formatted error
               │                 {code: "VALIDATION_ERROR"}
               │
               ↓ ✅ Valid
┌──────────────────────────────────────────────────────┐
│  Resolver Method Executes                            │
│  ValidationPipe runs on @InputType() DTOs            │
└──────────────┬───────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────┐
│  Layer 2: Class-Validator Validation                │
│  (graphql-exception.filter.ts)                       │
│                                                       │
│  Checks:                                             │
│  ✓ @IsEmail() format valid?                          │
│  ✓ @MinLength() / @MaxLength() respected?           │
│  ✓ @IsNotEmpty() has value?                         │
└──────────────┬───────────────────────────────────────┘
               │
               ├─── ❌ Invalid → Throws BadRequestException
               │                 ↓
               │                 GraphQLExceptionFilter catches
               │                 ↓
               │                 Returns formatted error
               │                 {code: "VALIDATION_ERROR"}
               │
               ↓ ✅ Valid
┌──────────────────────────────────────────────────────┐
│  Business Logic Executes (Service methods)          │
│  May throw custom exceptions                         │
└──────────────────────────────────────────────────────┘
```

## 🎯 Why Two Layers?

| Layer                 | Purpose                   | Performance                | Examples                        |
| --------------------- | ------------------------- | -------------------------- | ------------------------------- |
| **Schema Validation** | Fast structural checks    | Very fast (GraphQL native) | Missing fields, wrong types     |
| **Class-Validator**   | Business logic validation | Runs after parsing         | Email format, password strength |

Both layers are **essential** for complete validation coverage!

## How It Works

## 📝 Real-World Examples

### Example 1: Missing Required Field (Layer 1)

**Request**:

```graphql
mutation {
	registerUser(
		input: {
			email: "user@example.com"
			passwordHash: "SecurePass123"
			firstName: "John"
			lastName: "Doe"
			# ❌ Missing 'role' field
		}
	) {
		id
	}
}
```

**What happens**:

1. ✅ GraphQL schema validation runs (Layer 1)
2. ❌ Detects missing required field `role`
3. 🎯 `formatError` in `app.module.ts` catches it
4. 📤 Returns formatted error

**Response**:

```json
{
	"errors": [
		{
			"code": "VALIDATION_ERROR",
			"message": "Input validation failed",
			"timestamp": "2025-12-31T10:30:45.123Z",
			"details": {
				"validationErrors": [
					{
						"field": "role",
						"constraints": ["role is required"]
					}
				]
			}
		}
	]
}
```

---

### Example 2: Invalid Email Format (Layer 2)

**Request**:

```graphql
mutation {
	registerUser(
		input: {
			email: "not-an-email" # ❌ Invalid format
			passwordHash: "SecurePass123"
			firstName: "John"
			lastName: "Doe"
			role: "JOB_SEEKER"
		}
	) {
		id
	}
}
```

**What happens**:

1. ✅ GraphQL schema validation passes (all fields present, correct types)
2. ✅ Resolver executes
3. ✅ ValidationPipe runs `@IsEmail()` decorator
4. ❌ Email format invalid
5. 🎯 `GraphQLExceptionFilter` catches `BadRequestException`
6. 📤 Returns formatted error

**Response**:

```json
{
	"errors": [
		{
			"code": "VALIDATION_ERROR",
			"message": "Input validation failed",
			"timestamp": "2025-12-31T10:30:45.123Z",
			"details": {
				"validationErrors": [
					{
						"field": "email",
						"constraints": ["email must be an email"]
					}
				]
			}
		}
	]
}
```

---

### Example 3: Multiple Validation Errors (Layer 2)

**Request**:
```graphql
mutation {
	registerUser(
		input: {
			email: "invalid-email" # ❌ Invalid email format
			passwordHash: "123" # ❌ Too short (min 8)
			firstName: "" # ❌ Empty (IsNotEmpty)
			lastName: "D" # ❌ Too short (min 2)
			role: "JOB_SEEKER" # ✅ Valid
		}
	) {
		id
	}
}
```

**Response**:
```json
{
	"errors": [
		{
			"code": "VALIDATION_ERROR",
			"message": "Input validation failed",
			"timestamp": "2025-12-31T10:30:45.123Z",
			"details": {
				"validationErrors": [
					{
						"field": "email",
						"constraints": ["email must be an email"]
					},
					{
						"field": "passwordHash",
						"constraints": ["passwordHash must be longer than or equal to 8 characters"]
					},
					{
						"field": "firstName",
						"constraints": ["firstName should not be empty"]
					},
					{
						"field": "lastName",
						"constraints": ["lastName must be longer than or equal to 2 characters"]
					}
				]
			}
		}
	]
}
```

---

## 🛠️ Implementation Details

### Layer 1: Schema Validation (`app.module.ts`)

```typescript
GraphQLModule.forRoot({
  formatError: (error: IGraphqlError) => {
    const code = error?.extensions?.code || 'INTERNAL_SERVER_ERROR';
    
    // Handle GraphQL schema validation errors (BAD_USER_INPUT)
    if (code === 'BAD_USER_INPUT') {
      // Parse field name from error message
      const fieldMatch = message.match(/Field "(\w+)" of required type/);
      const field = fieldMatch ? fieldMatch[1] : 'unknown';
      
      message = 'Input validation failed';
      details = {
        validationErrors: [
          {
            field,
            constraints: [`${field} is required`],
          },
        ],
      };
    }
    
    return {
      code: code === 'BAD_USER_INPUT' ? 'VALIDATION_ERROR' : code,
      message,
      timestamp,
      statusCode,
      ...(details && { details }),
    };
  },
})
```

**Key points**:
- Catches `BAD_USER_INPUT` from GraphQL
- Transforms into consistent `VALIDATION_ERROR` format
- Parses field name from error message
- Runs before any resolver code

---

### Layer 2: Class-Validator (`graphql-exception.filter.ts`)

```typescript
@Catch()
export class GraphQLExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    // Only handle GraphQL context
    if (contextType !== 'graphql') {
      throw exception;
    }
    
    // If already a custom exception, re-throw
    if (exception instanceof BaseGraphQLException) {
      throw exception;
    }
    
    // Handle class-validator validation errors from ValidationPipe
    if (exception instanceof BadRequestException) {
      const response = exception.getResponse() as any;
      
      if (response.message && Array.isArray(response.message)) {
        const validationErrors = this.formatValidationErrors(response.message);
        
        throw new BaseGraphQLException(
          ErrorCode.VALIDATION_ERROR,
          'Input validation failed',
          { validationErrors }
        );
      }
    }
    
    // Handle unexpected errors
    throw new BaseGraphQLException(
      ErrorCode.INTERNAL_SERVER_ERROR,
      exception.message || 'An unexpected error occurred'
    );
  }
}
```

**Key points**:
- Only processes GraphQL context
- Catches `BadRequestException` from ValidationPipe
- Formats class-validator error messages
- Re-throws custom exceptions unchanged
- Runs after schema validation passes

---

## ⚙️ Configuration

### Already Set Up

✅ **Layer 1: Schema Validation** - Configured in `app.module.ts`:
```typescript
GraphQLModule.forRoot({
  formatError: (error) => { /* transformation logic */ }
})
```

✅ **Layer 2: Class-Validator Filter** - Added to `app.module.ts`:
```typescript
{
  provide: APP_FILTER,
  useClass: GraphQLExceptionFilter,
}
```

✅ **Enhanced ValidationPipe** - Configured in `main.ts`:
						{
							"field": "email",
							"constraints": ["must be an email"]
						},
						{
							"field": "passwordHash",
							"constraints": ["must be longer than or equal to 8 characters"]
						},
						{
							"field": "firstName",
							"constraints": ["should not be empty"]
						},
						{
							"field": "lastName",
							"constraints": ["must be longer than or equal to 2 characters"]
						},
						{
							"field": "role",
							"constraints": ["must be a valid enum value"]
						}
					]
				}
			}
		}
	]
}
```

## Configuration

### Already Set Up

✅ **Global Exception Filter** - Added to `app.module.ts`:

```typescript
{
  provide: APP_FILTER,
  useClass: GraphQLExceptionFilter,
}
```

✅ **Enhanced ValidationPipe** - Configured in `main.ts`:

```typescript
app.useGlobalPipes(
	new ValidationPipe({
		whitelist: true,
		forbidNonWhitelisted: false,
		transform: true,
		disableErrorMessages: false,
		validationError: {
			target: false,
			value: false,
		},
	}),
);
```

## Error Types Handled

### 1. Validation Errors (class-validator)

- `@IsNotEmpty()` violations
- `@IsEmail()` format errors
- `@MinLength()`, `@MaxLength()` length violations
- `@IsEnum()` invalid enum values
- All other class-validator decorators

### 2. Custom Exceptions

- `UserNotFoundException`
- `UserAlreadyExistsException`
- All other `BaseGraphQLException` subclasses
- **These pass through unchanged**

### 3. Generic Errors

- Unexpected errors
- Database errors (handled elsewhere)
- System errors

## Benefits

1. **Consistent Error Format** - All validation errors follow the same structure
2. **Detailed Feedback** - Client knows exactly which fields failed and why
3. **Type Safety** - Full TypeScript support
4. **Automatic Logging** - Validation errors are logged with context
5. **No Code Changes** - Works with existing `@InputType()` classes

## Example Usage

Your existing DTOs work automatically:

```typescript
@InputType()
export class RegisterUserInput {
	@IsNotEmpty()
	@IsEmail()
	@Field(() => String)
	email: string;

	@IsNotEmpty()
	@IsString()
	@MinLength(8)
	@MaxLength(100)
	@Field(() => String)
	passwordHash: string;

	@IsNotEmpty()
	@IsString()
	@MinLength(2)
	@MaxLength(50)
	@Field(() => String)
	firstName: string;

	@IsNotEmpty()
	@IsString()
	@MinLength(2)
	@MaxLength(50)
	@Field(() => String)
	lastName: string;

	@IsNotEmpty()
	@IsEnum(UserRole)
	@Field(() => String, { nullable: false })
	role: UserRole;
}
```

No changes needed - the filter handles everything automatically!

## Logging

Validation errors are logged with the `LoggerUtil.warn()` method:

```
[2025-12-31T10:30:45.123Z] WARNING Validation Error → [detailed error info]
```

## Files Modified

1. ✅ Created `libs/filters/graphql-exception.filter.ts` - The exception filter
2. ✅ Updated `app.module.ts` - Registered global filter
3. ✅ Updated `main.ts` - Enhanced ValidationPipe configuration
4. ✅ Updated `libs/index.ts` - Exported filter

## Testing

Test with invalid input in GraphQL Playground:

```graphql
mutation TestValidation {
	registerUser(input: { email: "not-an-email", passwordHash: "short", firstName: "", lastName: "X", role: INVALID }) {
		id
	}
}
```

You should see a properly formatted validation error response!
