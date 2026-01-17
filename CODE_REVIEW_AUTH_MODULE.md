# 🔐 Authentication Module - Code Review & Interview Prep

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture & Design Patterns](#architecture--design-patterns)
3. [Line-by-Line Code Review](#line-by-line-code-review)
4. [Security Considerations](#security-considerations)
5. [Interview Questions & Answers](#interview-questions--answers)
6. [What You Should Memorize](#what-you-should-memorize)

---

## Overview

**What This Module Does:**
Your auth module handles all authentication and authorization for the HireHub platform using:

- **JWT tokens** (Access + Refresh token pattern)
- **OAuth 2.0** integration (Google, LinkedIn, GitHub)
- **Bcrypt** password hashing
- **Role-based access control** (RBAC)
- **Custom Guards & Decorators** for protecting routes

**Key Files:**

- `auth.module.ts` - Module configuration
- `auth.service.ts` - Core authentication logic
- `auth.controller.ts` - REST endpoints for OAuth
- `guards/auth.guard.ts` - Authentication guard
- `guards/roles.guard.ts` - Authorization guard
- `decorators/authUser.decorator.ts` - Custom parameter decorator
- `strategies/` - OAuth strategies (Google, LinkedIn, GitHub)

---

## Architecture & Design Patterns

### 1. **Module Pattern (NestJS Architecture)**

```typescript
@Module({
	imports: [PassportModule, JwtModule, UserModule],
	controllers: [AuthController],
	providers: [AuthService, GoogleStrategy, LinkedInStrategy, GitHubStrategy],
	exports: [AuthService, PassportModule],
})
export class AuthModule {}
```

**What's happening here:**

- **Imports**: Bringing in dependencies (Passport for OAuth, JWT for tokens, UserModule for user operations)
- **Controllers**: REST endpoints for OAuth callbacks
- **Providers**: Services and strategies available for dependency injection
- **Exports**: Making AuthService available to other modules
- **forwardRef()**: Solves circular dependency with UserModule

**Interview Answer:** _"I use NestJS's modular architecture to organize authentication concerns. The AuthModule encapsulates all auth-related logic and uses dependency injection to provide services to other modules. I had to use forwardRef() to handle a circular dependency between AuthModule and UserModule since they both need each other."_

---

### 2. **Dependency Injection Pattern**

```typescript
@Injectable()
export class AuthService {
	constructor(private readonly jwtService: JwtService) {}
}
```

**What's happening:**

- The `@Injectable()` decorator marks this class as a provider
- NestJS automatically injects JwtService into the constructor
- `private readonly` creates an immutable class property

**Interview Answer:** _"I leverage NestJS's dependency injection to manage dependencies. Instead of creating instances manually, the IoC container handles it, which makes testing easier and follows SOLID principles - specifically Dependency Inversion Principle."_

---

### 3. **Strategy Pattern (Passport.js)**

```typescript
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
	constructor(private readonly userService: UserService) {
		super({
			clientID: EnvUtil.getGoogleClientId(),
			// ... configuration
		});
	}

	async validate(accessToken: string, refreshToken: string, profile: Profile) {
		// Custom validation logic
	}
}
```

**What's happening:**

- **Strategy Pattern**: Each OAuth provider (Google, LinkedIn, GitHub) is a separate strategy
- Passport handles the OAuth flow automatically
- You only implement the `validate()` method to customize user creation

**Interview Answer:** _"I use the Strategy pattern through Passport.js to support multiple OAuth providers. Each provider is a separate strategy class that extends PassportStrategy. This makes it easy to add new OAuth providers - just create a new strategy class without modifying existing code. This follows the Open/Closed Principle."_

---

### 4. **Guard Pattern (Authorization)**

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
	async canActivate(context: ExecutionContext): Promise<boolean> {
		// Verify token and attach user to request
	}
}
```

**What's happening:**

- **Guard Pattern**: Acts as a gatekeeper before route handlers execute
- Guards implement the `CanActivate` interface
- Return `true` to allow access, throw exception to deny

**Interview Answer:** _"Guards are NestJS's implementation of the Interceptor/Middleware pattern for authorization. They run before the route handler and can block requests. I have two guards: AuthGuard verifies the JWT token, and RolesGuard checks if the user has required permissions. This follows the Single Responsibility Principle."_

---

### 5. **Decorator Pattern (Parameter Decorators)**

```typescript
export const AuthUser = createParamDecorator((data: string, context: ExecutionContext) => {
	const request = context.getArgByIndex(2).req;
	return data ? request.authUser?.[data] : request.authUser;
});
```

**What's happening:**

- Custom decorator extracts authenticated user from request
- Can extract specific properties: `@AuthUser('_id')` gets only the ID
- Without parameter: `@AuthUser()` gets the whole user object

**Interview Answer:** _"I created a custom parameter decorator to inject the authenticated user into resolvers cleanly. Instead of manually extracting the user from the request object in every resolver, the decorator does it. This is the Decorator pattern - adding functionality without modifying the original class."_

---

## Line-by-Line Code Review

### 📁 auth.service.ts

#### **Password Hashing (Lines 24-38)**

```typescript
public async hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

public async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}
```

**What you need to know:**

- **Salt**: Random data added to passwords before hashing to prevent rainbow table attacks
- **Salt rounds (10)**: How many times the hashing algorithm is applied (2^10 = 1024 iterations)
- **Why bcrypt**: Deliberately slow to prevent brute-force attacks
- **Async operations**: bcrypt is CPU-intensive, so it returns promises

**Interview Question:** _"Why do you use bcrypt instead of SHA-256?"_
**Your Answer:** _"bcrypt is designed for password hashing - it's intentionally slow and includes salting by default. SHA-256 is too fast, making brute-force attacks feasible. bcrypt's configurable work factor means I can increase rounds as hardware gets faster."_

---

#### **Token Generation (Lines 43-58)**

```typescript
public async createToken(data: any): Promise<string> {
  const userData = data.toObject ? data.toObject() : data;
  const { passwordHash, refreshToken, ...payload } = userData;

  return await this.jwtService.signAsync(payload, {
    secret: EnvUtil.getJwtSecret(),
    expiresIn: ACCESS_TOKEN_EXPIRATION, // 1 day
  });
}
```

**What you need to know:**

- **data.toObject()**: Converts Mongoose document to plain JavaScript object
- **Destructuring to remove secrets**: `passwordHash` and `refreshToken` are excluded from JWT
- **JWT structure**: Header.Payload.Signature (Base64 encoded)
- **Short-lived access tokens**: 1 day expiration limits damage if compromised

**Interview Question:** _"What's the difference between your access token and refresh token?"_
**Your Answer:** _"Access tokens are short-lived (1 day) and contain full user data. They're sent with every API request. Refresh tokens are long-lived (7 days) and contain minimal data (only user ID and email). They're used only to generate new access tokens. This separation limits the attack surface - if an access token is compromised, it expires quickly."_

---

#### **Token Verification (Lines 85-107)**

```typescript
public async verifyToken(token: string): Promise<User> {
  try {
    const user = await this.jwtService.verifyAsync<User>(token, {
      secret: EnvUtil.getJwtSecret(),
    });

    user._id = shapeIntoMongoObjectId(user._id);

    // Convert date strings back to Date objects
    if (user.createdAt && typeof user.createdAt === 'string') {
      user.createdAt = new Date(user.createdAt);
    }

    return user;
  } catch (error) {
    throw new TokenExpiredException('Invalid or expired access token');
  }
}
```

**What you need to know:**

- **JWT verification**: Checks signature, expiration, and token structure
- **Type coercion**: JWT stores everything as strings, so dates and ObjectIds need conversion
- **Error handling**: Catches ALL verification failures and throws custom exception
- **shapeIntoMongoObjectId()**: Converts string to MongoDB ObjectId

**Interview Question:** _"What happens when a JWT expires?"_
**Your Answer:** _"When jwtService.verifyAsync() encounters an expired token, it throws an error. I catch that and throw a custom TokenExpiredException. On the frontend, this triggers a token refresh flow using the refresh token. If the refresh token is also expired, the user is logged out."_

---

### 📁 auth.guard.ts

#### **Guard Implementation (Lines 11-30)**

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private authService: AuthService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.getArgByIndex(2).req;
		const bearerToken = request.headers.authorization;

		if (!bearerToken) {
			throw new UnAuthenticatedException('You are not authenticated!');
		}

		const token = bearerToken.split(' ')[1]; // Extract token from "Bearer <token>"
		const authUser = await this.authService.verifyToken(token);

		request.authUser = authUser; // Attach user to request
		this.displayUserDetails(authUser); // Logging
		return true;
	}
}
```

**What you need to know:**

- **ExecutionContext**: Abstraction over different contexts (HTTP, GraphQL, WebSocket)
- **Bearer token format**: `Authorization: Bearer <token>`
- **Side effect**: Guard attaches user to request for use in resolvers
- **Return true**: Allow request to proceed

**Interview Question:** _"Why do you attach the user to the request object?"_
**Your Answer:** _"After verifying the token in the guard, I attach the user object to the request so downstream resolvers can access it. Without this, I'd have to verify the token again in every resolver. The custom @AuthUser decorator then extracts this attached user cleanly."_

---

### 📁 roles.guard.ts

#### **Role-Based Access Control (Lines 13-35)**

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  const roles = this.reflector.get<string[]>('roles', context.getHandler());
  if (!roles) return true; // No roles specified = public route

  const request = context.getArgByIndex(2).req;
  const bearerToken = request.headers.authorization;
  const token = bearerToken.split(' ')[1];
  const authUser = await this.authService.verifyToken(token);

  const hasRole = () => roles.indexOf(authUser.role) > -1;
  if (!hasRole()) {
    throw new UnauthorizedException('You are not authorized...');
  }

  request.authUser = authUser;
  return true;
}
```

**What you need to know:**

- **Reflector**: Reads metadata from decorators (reads `@Roles()` decorator)
- **Authorization vs Authentication**: This guard checks permissions, not identity
- **Role checking**: Verifies user's role is in the allowed roles array
- **Flexibility**: If no roles specified, route is public

**Interview Question:** _"What's the difference between authentication and authorization?"_
**Your Answer:** _"Authentication is verifying WHO you are (checking JWT token). Authorization is verifying WHAT you can do (checking user role/permissions). My AuthGuard handles authentication, RolesGuard handles authorization. They often run in sequence - first verify identity, then check permissions."_

---

### 📁 google.strategy.ts

#### **OAuth Strategy Validation (Lines 51-79)**

```typescript
async validate(accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) {
  try {
    const email = profile.emails?.[0]?.value;
    const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0];
    const lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ');
    const avatarUrl = profile.photos?.[0]?.value;

    if (!email) {
      return done(new Error('Email not provided by Google'), undefined);
    }

    const user = await this.userService.validateOAuthLogin('google', profile.id, {
      email, firstName, lastName, avatarUrl
    });

    done(null, user);
  } catch (error) {
    done(error, undefined);
  }
}
```

**What you need to know:**

- **Passport callback**: Called after successful OAuth with Google
- **Profile object**: Contains user data from Google
- **Safe navigation**: `?.` prevents errors if fields are missing
- **Error handling**: Passport expects `done(error, user)` callback
- **User creation**: `validateOAuthLogin()` finds or creates user in database

**Interview Question:** _"How does the OAuth flow work in your app?"_
**Your Answer:**

1. _"User clicks 'Sign in with Google' which hits `/auth/google`"_
2. _"AuthGuard('google') redirects to Google's consent screen"_
3. _"User authorizes, Google redirects to `/auth/google/callback` with auth code"_
4. _"GoogleStrategy exchanges code for profile data"_
5. _"My validate() method creates/updates user in database"_
6. _"AuthController generates JWT tokens"_
7. _"User is redirected to frontend with tokens in URL"_

---

### 📁 auth.controller.ts

#### **OAuth Callback Handler (Lines 45-55)**

```typescript
@Get('google/callback')
@UseGuards(AuthGuard('google'))
async googleCallback(@Req() req: Request & { user: User }, @Res() res: Response) {
  return this.handleOAuthCallback(req, res, 'google');
}
```

**What you need to know:**

- **Why REST instead of GraphQL**: OAuth requires HTTP redirects which GraphQL doesn't support
- **@UseGuards**: Triggers the GoogleStrategy validation
- **req.user**: Passport attaches validated user to request
- **Response redirect**: After success, redirects to frontend with tokens

**Interview Question:** _"Why do you use REST for OAuth but GraphQL for everything else?"_
**Your Answer:** _"OAuth 2.0 requires multiple HTTP redirects between the client, authorization server, and callback URL. GraphQL operates over a single endpoint and doesn't support redirects. So I use REST controllers for the OAuth flow, then return JWT tokens that work with both REST and GraphQL endpoints."_

---

## Security Considerations

### ✅ What You're Doing Right

1. **Separate secrets for access and refresh tokens**
   - Different secrets means compromising one doesn't compromise both

2. **Removing sensitive data from JWT payload**

   ```typescript
   const { passwordHash, refreshToken, ...payload } = userData;
   ```

3. **Short-lived access tokens (1 day)**
   - Limits exposure window if token is stolen

4. **Hashed passwords with bcrypt**
   - Industry standard, prevents rainbow table attacks

5. **Token verification on every protected request**
   - No session storage vulnerabilities

6. **Role-based access control**
   - Fine-grained permissions

### ⚠️ Potential Improvements

1. **Token Rotation**
   - Consider rotating refresh tokens on each use to detect theft

2. **Rate Limiting**
   - Add rate limiting to login/token endpoints to prevent brute force

3. **Refresh Token Revocation**
   - Implement a way to invalidate refresh tokens (logout, password change)

4. **HTTPS Only**
   - Ensure tokens are only transmitted over HTTPS

5. **Token Blacklist**
   - For high-security actions, consider maintaining a blacklist of revoked tokens

---

## Interview Questions & Answers

### Q1: "Walk me through how authentication works in your application"

**Answer:**
_"I use a two-token system: access tokens and refresh tokens. When a user logs in (either via email/password or OAuth), I generate both tokens. The access token is short-lived (1 day) and contains the full user object. It's sent with every API request in the Authorization header as a Bearer token. My AuthGuard extracts and verifies this token, then attaches the user to the request._

_The refresh token is long-lived (7 days) and contains minimal data. When the access token expires, the client uses the refresh token to get a new access token without re-authenticating. The refresh token is hashed and stored in the database for additional security._

_For OAuth, I use Passport.js strategies. The OAuth flow redirects to the provider, gets user data, finds or creates the user in our database, then generates JWT tokens just like normal login."_

---

### Q2: "How would you handle a user logout?"

**Answer:**
_"Currently, I use JWT stateless authentication, so tokens remain valid until expiration. For proper logout, I would:_

1. _Delete the refresh token from the database_
2. _Clear tokens from client-side storage_
3. _For high-security scenarios, add a token blacklist in Redis with TTL matching token expiration_
4. _When verifying tokens, check the blacklist first_

_The trade-off is between stateless simplicity and immediate revocation. For most apps, deleting the refresh token and clearing client storage is sufficient since access tokens expire quickly."_

---

### Q3: "What security vulnerabilities are you protecting against?"

**Answer:**

1. **XSS (Cross-Site Scripting)**: _Store tokens in httpOnly cookies or secure storage, not localStorage_
2. **CSRF (Cross-Site Request Forgery)**: _JWT in headers (not cookies) + SameSite cookies_
3. **Man-in-the-Middle**: _HTTPS only for token transmission_
4. **Brute Force**: _Would add rate limiting on login endpoints_
5. **Token Theft**: _Short-lived access tokens limit exposure window_
6. **Rainbow Tables**: _bcrypt with salt for password hashing_
7. **SQL Injection**: _Using Mongoose ORM prevents injection attacks_

---

### Q4: "What's the purpose of the salt in bcrypt?"

**Answer:**
_"Salt is random data added to passwords before hashing. Without salt, identical passwords produce identical hashes, making them vulnerable to rainbow table attacks (pre-computed hash tables). bcrypt generates a unique salt for each password and stores it with the hash. Even if two users have the same password, their hashes are completely different. The salt doesn't need to be secret - its purpose is randomization, not secrecy."_

---

### Q5: "Why do you use both AuthGuard and RolesGuard?"

**Answer:**
_"They serve different purposes following the Single Responsibility Principle:_

- **AuthGuard**: Handles authentication - 'Who are you?' Verifies the JWT token is valid and attaches the user to the request
- **RolesGuard**: Handles authorization - 'What can you do?' Checks if the authenticated user has the required role

_I can use them separately or together:_

- `@UseGuards(AuthGuard)` - Just need to be logged in
- `@UseGuards(RolesGuard)` - Need specific permissions (also authenticates)
- `@UseGuards(AuthGuard, RolesGuard)` - Explicit authentication + authorization\*

_This separation makes the code more maintainable and testable."_

---

### Q6: "How would you test this authentication system?"

**Answer:**
_"I would write several types of tests:_

**Unit Tests:**

- Test password hashing and comparison
- Test token generation and verification
- Test token expiration handling
- Mock JwtService to test service methods in isolation

**Integration Tests:**

- Test complete OAuth flow with mocked OAuth providers
- Test guard behavior with valid/invalid/expired tokens
- Test role-based access with different user roles

**E2E Tests:**

- Test complete login flow
- Test protected route access
- Test token refresh flow
- Test logout functionality

**Security Tests:**

- Test with tampered JWT tokens
- Test with expired tokens
- Test with missing authorization headers
- Test unauthorized role access"\*

---

## What You Should Memorize

### 🎯 Core Concepts

1. **JWT Structure**: Header.Payload.Signature (Base64 encoded)
2. **Access Token**: Short-lived (1d), full user data, sent with every request
3. **Refresh Token**: Long-lived (7d), minimal data, used to get new access tokens
4. **bcrypt Salt Rounds**: 10 rounds = 2^10 iterations
5. **OAuth Flow**: Redirect → Consent → Callback → Profile → Create/Find User → Generate Tokens

### 🔑 Key Terms

- **Authentication**: Verifying identity (who you are)
- **Authorization**: Verifying permissions (what you can do)
- **Bearer Token**: `Authorization: Bearer <token>`
- **Strategy Pattern**: Multiple implementations of the same interface (OAuth providers)
- **Guard Pattern**: Pre-execution validation (like middleware)
- **Dependency Injection**: IoC container manages class dependencies

### 📊 Design Patterns Used

1. Module Pattern (NestJS architecture)
2. Strategy Pattern (Passport OAuth strategies)
3. Guard Pattern (Route protection)
4. Decorator Pattern (Custom parameter decorators)
5. Dependency Injection Pattern (Constructor injection)
6. Factory Pattern (JwtService creating tokens)

### 🛡️ Security Best Practices

1. Never store passwords in plain text
2. Always use HTTPS for token transmission
3. Keep access tokens short-lived
4. Remove sensitive data from JWT payload
5. Use separate secrets for different token types
6. Hash refresh tokens before database storage
7. Validate and sanitize all OAuth data

---

## Next Steps

After reviewing this auth module, you should:

1. ✅ Be able to explain the complete authentication flow
2. ✅ Know which design patterns you're using and why
3. ✅ Understand the security implications of your choices
4. ✅ Be ready to answer "why did you build it this way?"

**Practice Exercise:**

- Open your auth.service.ts
- For each method, explain out loud what it does and why
- Trace the flow from login → token generation → API request → guard validation
- Draw a diagram of your OAuth flow

**Next Module to Review:**
I recommend reviewing the **Job Module** next - it likely contains:

- CRUD operations
- Query optimization
- Aggregation pipelines
- Business logic

Would you like me to create a similar review for another module?
