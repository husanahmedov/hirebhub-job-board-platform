# Plan: Google OAuth Authentication Integration

Add Google OAuth 2.0 authentication to complement your existing email/password auth. Users will be able to sign up and log in using their Google accounts. The User schema already supports OAuth providers, so we'll leverage that structure.

## Steps

### 1. Install Passport and Google OAuth dependencies

- Location: `package.json`
- Add `@nestjs/passport`, `passport`, `passport-google-oauth20`
- Add `@types/passport-google-oauth20` as dev dependency

### 2. Add Google OAuth environment variables

- Location: `apps/hire-hub/src/libs/env.util.ts`
- Create `getGoogleClientId()`, `getGoogleClientSecret()`, `getGoogleCallbackUrl()`
- Add validation for these variables in startup logger

### 3. Create GoogleStrategy

- Location: `apps/hire-hub/src/components/auth/strategies/google.strategy.ts`
- Extend `PassportStrategy(Strategy, 'google')`
- Configure with client ID, secret, callback URL, scopes (profile, email)
- Implement `validate()` to extract Google profile data

### 4. Create OAuth service methods

- Location: `apps/hire-hub/src/components/auth/auth.service.ts` or `apps/hire-hub/src/components/user/user.service.ts`
- `validateOAuthLogin()` - find or create user from OAuth profile
- Handle existing email conflicts (link OAuth to account vs. error)
- Set `emailVerified: true` for Google users automatically
- Map Google profile → `firstName`, `lastName`, `avatarUrl`, `oauthProviders[]`

### 5. Create REST auth controller

- Location: `apps/hire-hub/src/components/auth/auth.controller.ts`
- `GET /auth/google` - initiates OAuth flow with `@UseGuards(AuthGuard('google'))`
- `GET /auth/google/callback` - handles callback, generates JWT, redirects to frontend with token
- REST endpoints needed because OAuth uses redirects (incompatible with GraphQL)

### 6. Update AuthModule

- Location: `apps/hire-hub/src/components/auth/auth.module.ts`
- Import `PassportModule`
- Register `GoogleStrategy` as provider
- Register `AuthController` in controllers array

### 7. Make passwordHash optional

- Location: `apps/hire-hub/src/schemas/User.model.ts` and `apps/hire-hub/src/libs/dto/user/user.input.ts`
- Update schema: `passwordHash: { type: String, required: false, select: false }`
- Update validation to allow OAuth-only users (no password)

## Further Considerations

### Account Linking Strategy

When Google email matches existing user:

- **Option A**: Auto-link OAuth to account
- **Option B**: Error and require manual linking
- **Option C**: Allow duplicate with different auth method

Which approach should we use?

### Frontend Redirect URL

After successful OAuth, where should the callback redirect?

- Example: `http://localhost:3000/auth/callback?token=...`
- Need specific URL from frontend team

### Refresh Tokens

Do you want OAuth refresh token support for long-lived sessions, or just access tokens?

### Additional OAuth Providers

Should the architecture support LinkedIn, GitHub, etc. in the future?

- Schema already structured for multiple providers
- Easy to extend with similar strategy pattern

## Technical Notes

### Current State

- ✅ User schema has `oauthProviders` array with compound index
- ✅ DTOs have `OAuthProviderInput/Output` defined
- ✅ JWT infrastructure exists and works well
- ❌ No Passport integration yet
- ❌ No OAuth strategies implemented
- ❌ `passwordHash` currently required (needs to be optional)

### Architecture Decision: REST vs GraphQL

**Recommendation**: Use REST endpoints for OAuth flow

- OAuth requires HTTP redirects (incompatible with GraphQL)
- After successful OAuth, issue JWT token
- Frontend uses JWT for all subsequent GraphQL requests
- Clean separation: REST for auth flow, GraphQL for API

### Security Considerations

1. **State Parameter**: Use CSRF protection with state param in OAuth flow
2. **Callback Validation**: Verify callback origin
3. **Email Uniqueness**: Handle email conflicts between OAuth and traditional auth
4. **Scope Limitation**: Request minimal Google scopes (profile, email only)
5. **Token Security**: Store refresh tokens securely if implementing refresh flow

### Profile Data Mapping

```
Google Profile → User Model
- profile.id → oauthProviders[].providerId
- profile.emails[0].value → email
- profile.name.givenName → firstName
- profile.name.familyName → lastName
- profile.photos[0].value → avatarUrl
- "google" → oauthProviders[].provider
- profile.emails[0].verified → emailVerified
```

## Implementation Order

1. Install dependencies (Step 1)
2. Add environment config (Step 2)
3. Make passwordHash optional (Step 7) - enables OAuth users
4. Create OAuth service methods (Step 4) - core logic
5. Create GoogleStrategy (Step 3) - Passport integration
6. Create REST controller (Step 5) - endpoints
7. Update AuthModule (Step 6) - wire everything together
8. Test OAuth flow end-to-end
9. Handle edge cases (existing users, errors, etc.)

## Questions to Resolve Before Implementation

1. Account linking preference? (Option A, B, or C above)
2. Frontend redirect URL after successful OAuth?
3. Should we implement refresh token support? answer yes
4. Any specific error handling requirements?
5. Should we add LinkedIn/GitHub OAuth now or later? answer yes

Overall, this plan provides a comprehensive approach to integrating Google OAuth authentication into the existing system while addressing key technical and security considerations. and update my project to use refresh token support.
