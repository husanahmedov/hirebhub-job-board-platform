# Utility Functions

This directory contains reusable utility functions and classes used throughout the HireHub application.

## Available Utilities

### 📝 LoggerUtil

A beautiful, color-coded logging utility powered by Chalk for consistent application-wide logging.

**Location:** `logger.util.ts`

**Features:**

- ✅ Color-coded log levels (success, error, warning, info, debug)
- ✅ Timestamps on all logs
- ✅ Beautiful startup banners
- ✅ Database connection status logging
- ✅ Module initialization tracking
- ✅ Debug mode (development only)

**Usage Examples:**

```typescript
import { LoggerUtil } from '@hire-hub/common';

// Success messages
LoggerUtil.success('Operation completed', 'Additional details');

// Error logging
LoggerUtil.error('Something went wrong', error);

// Warnings
LoggerUtil.warn('Deprecated feature used', 'Use new API instead');

// Information
LoggerUtil.info('Server', 'Running on port 3000');

// Debug (development only)
LoggerUtil.debug('User data', userData);

// Startup banner
LoggerUtil.printBanner('HireHub API', '1.0.0', 3000, 'development');

// Database status
LoggerUtil.database('MongoDB', 'development', true);

// Module initialization
LoggerUtil.module('UserModule');

// Visual separator
LoggerUtil.separator();
```

### ⚙️ EnvUtil

Type-safe environment variable validation and access utility.

**Location:** `env.util.ts`

**Features:**

- ✅ Environment variable validation on startup
- ✅ Type-safe getters for all configuration values
- ✅ Environment checks (isDevelopment, isProduction, isTest)
- ✅ Helpful error messages for missing variables
- ✅ Configuration summary printing

**Usage Examples:**

```typescript
import { EnvUtil } from '@hire-hub/common';

// Validate environment on application startup
try {
	EnvUtil.validate();
} catch (error) {
	// Handle validation errors
	process.exit(1);
}

// Get environment
const env = EnvUtil.getEnvironment(); // 'development' | 'production' | 'test'

// Environment checks
if (EnvUtil.isProduction()) {
	// Production-specific logic
}

// Get configuration values
const port = EnvUtil.getPort(); // number
const mongoUri = EnvUtil.getMongoUri(); // string
const jwtSecret = EnvUtil.getJwtSecret(); // string

// Print configuration summary
EnvUtil.printSummary();

// Get full config object
const config = EnvUtil.getConfig();
```

## Best Practices

### When to Use LoggerUtil

1. **Always** use LoggerUtil instead of `console.log()`
2. Use appropriate log levels:
   - `success()` - For successful operations
   - `error()` - For errors and exceptions
   - `warn()` - For deprecation warnings or potential issues
   - `info()` - For general information
   - `debug()` - For development debugging (auto-disabled in production)

3. Include context in your logs:

   ```typescript
   // Good
   LoggerUtil.success('User created', `ID: ${user.id}`);

   // Avoid
   LoggerUtil.success('Success');
   ```

### When to Use EnvUtil

1. **Always validate** environment variables at application startup
2. Use typed getters instead of accessing `process.env` directly
3. Handle missing required variables gracefully with clear error messages
4. Use environment checks for conditional logic:

   ```typescript
   // Good
   if (EnvUtil.isProduction()) {
   	// Enable production features
   }

   // Avoid
   if (process.env.NODE_ENV === 'production') {
   	// Prone to typos and inconsistency
   }
   ```

## Adding New Utilities

When creating new utility functions:

1. **Create a new file** with `.util.ts` suffix
2. **Export a class** with static methods for stateless utilities
3. **Add comprehensive JSDoc** comments
4. **Include usage examples** in the documentation
5. **Write unit tests** in a corresponding `.spec.ts` file
6. **Update this README** with the new utility

## Testing Utilities

```bash
# Run tests for utility functions
npm test -- --testPathPattern=utils

# Watch mode for development
npm run test:watch -- --testPathPattern=utils
```

## Contributing

When modifying utilities:

1. Maintain backward compatibility
2. Update JSDoc comments
3. Add/update tests
4. Update this README
5. Follow the existing code style

---

**Note:** These utilities are designed to be framework-agnostic and can be reused across different parts of the application or even in other projects.
