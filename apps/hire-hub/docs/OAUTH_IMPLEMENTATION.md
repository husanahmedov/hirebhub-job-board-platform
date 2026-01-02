# OAuth Authentication Implementation

This document describes the OAuth 2.0 authentication implementation for Google, LinkedIn, and GitHub in the HireHub application.

## Overview

The application supports multiple authentication methods:

- **Traditional Email/Password** - Standard registration and login
- **Google OAuth 2.0** - Sign in with Google
- **LinkedIn OAuth 2.0** - Sign in with LinkedIn
- **GitHub OAuth 2.0** - Sign in with GitHub

## Features Implemented

### ✅ Refresh Token Support

- **Access tokens**: Short-lived (15 minutes) for API requests
- **Refresh tokens**: Long-lived (7 days) for obtaining new access tokens
- Secure token storage with bcrypt hashing in database
- GraphQL mutation for token refresh

### ✅ Multi-Provider OAuth

- Google, LinkedIn, and GitHub OAuth strategies
- Auto-linking OAuth providers to existing accounts
- Support for multiple OAuth providers per user
- Email verification automatic for OAuth users

### ✅ Password-Optional Users

- OAuth-only users don't require passwords
- Schema updated to make `passwordHash` optional
- Existing email/password users can link OAuth accounts

## Architecture

### Token Flow

```
Client Request → Login/Register/OAuth
       ↓
Generate Access Token (15min) + Refresh Token (7days)
       ↓
Store hashed refresh token in database
       ↓
Return both tokens to client
       ↓
Client uses access token for API requests
       ↓
When access token expires:
   - Client sends refresh token
   - Validate and generate new access token
   - Return new access token
```

### OAuth Flow

```
1. Client → GET /auth/google (or /linkedin or /github)
2. Server → Redirect to OAuth provider
3. User authenticates with provider
4. Provider → Redirect back to /auth/google/callback
5. Server validates OAuth profile
6. Server creates/updates user
7. Server generates JWT tokens
8. Server → Redirect to frontend with tokens
9. Frontend stores tokens and uses for API requests
```

## API Endpoints

### REST Endpoints (OAuth)

#### Google OAuth

```
GET /auth/google
GET /auth/google/callback
```

#### LinkedIn OAuth

```
GET /auth/linkedin
GET /auth/linkedin/callback
```

#### GitHub OAuth

```
GET /auth/github
GET /auth/github/callback
```

#### OAuth Status

```
GET /auth/status
```

Returns configuration status of all OAuth providers.

### GraphQL Mutations

#### Register (Email/Password)

```graphql
mutation {
	register(
		input: {
			email: "user@example.com"
			passwordHash: "SecurePassword123!"
			firstName: "John"
			lastName: "Doe"
			role: CANDIDATE
		}
	) {
		_id
		email
		fullName
		accessToken
		refreshToken
	}
}
```

#### Login (Email/Password)

```graphql
mutation {
	login(input: { email: "user@example.com", passwordHash: "SecurePassword123!" }) {
		_id
		email
		fullName
		accessToken
		refreshToken
	}
}
```

#### Refresh Token

```graphql
mutation {
	refreshToken(input: { refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }) {
		user {
			_id
			email
			fullName
		}
		accessToken
		refreshToken
		accessTokenExpiresAt
		refreshTokenExpiresAt
	}
}
```

## Environment Configuration

Add these variables to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-access-token-secret
JWT_REFRESH_SECRET=your-refresh-token-secret

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_CALLBACK_URL=http://localhost:3000/auth/linkedin/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
```

## OAuth Provider Setup

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing
3. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
4. Configure OAuth consent screen (if not done)
5. Application type: Web application
6. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (development)
   - `https://yourdomain.com/auth/google/callback` (production)
7. Copy Client ID and Client Secret
8. Add to `.env` file

### LinkedIn OAuth Setup

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Create a new app
3. Fill in app details
4. Go to "Auth" tab
5. Add redirect URLs:
   - `http://localhost:3000/auth/linkedin/callback` (development)
   - `https://yourdomain.com/auth/linkedin/callback` (production)
6. Request access to:
   - `r_emailaddress` (email address)
   - `r_liteprofile` (basic profile)
7. Copy Client ID and Client Secret
8. Add to `.env` file

### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in application details:
   - Application name: HireHub
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/auth/github/callback`
4. Click "Register application"
5. Copy Client ID
6. Generate new Client Secret
7. Add to `.env` file

**Note**: GitHub may not provide email if user's email is set to private. Users should make their email public in GitHub settings.

## Frontend Integration

### Initiating OAuth Flow

Create buttons that redirect to OAuth endpoints:

```html
<a href="http://localhost:3000/auth/google">Sign in with Google</a>
<a href="http://localhost:3000/auth/linkedin">Sign in with LinkedIn</a>
<a href="http://localhost:3000/auth/github">Sign in with GitHub</a>
```

### Handling OAuth Callback

After successful OAuth, user is redirected to:

```
http://localhost:3000/auth/callback?accessToken=...&refreshToken=...&provider=google
```

Frontend should:

1. Extract tokens from URL parameters
2. Store securely (httpOnly cookies recommended)
3. Remove tokens from URL (security)
4. Redirect to dashboard/home page

```javascript
// Example callback handler
const urlParams = new URLSearchParams(window.location.search);
const accessToken = urlParams.get('accessToken');
const refreshToken = urlParams.get('refreshToken');
const provider = urlParams.get('provider');

if (accessToken && refreshToken) {
	// Store tokens securely
	localStorage.setItem('accessToken', accessToken);
	localStorage.setItem('refreshToken', refreshToken);

	// Remove tokens from URL
	window.history.replaceState({}, document.title, '/auth/callback');

	// Redirect to dashboard
	window.location.href = '/dashboard';
}
```

### Using Tokens for API Requests

```javascript
// GraphQL request with access token
const response = await fetch('http://localhost:3000/graphql', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${accessToken}`,
	},
	body: JSON.stringify({
		query: `
      query {
        checkAuthenticatedUser {
          _id
          email
          fullName
        }
      }
    `,
	}),
});
```

### Refreshing Expired Tokens

```javascript
// When access token expires (HTTP 401)
async function refreshAccessToken() {
	const refreshToken = localStorage.getItem('refreshToken');

	const response = await fetch('http://localhost:3000/graphql', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: `
        mutation RefreshToken($input: RefreshTokenInput!) {
          refreshToken(input: $input) {
            accessToken
            refreshToken
            accessTokenExpiresAt
            refreshTokenExpiresAt
          }
        }
      `,
			variables: {
				input: { refreshToken },
			},
		}),
	});

	const { data } = await response.json();

	// Store new tokens
	localStorage.setItem('accessToken', data.refreshToken.accessToken);
	localStorage.setItem('refreshToken', data.refreshToken.refreshToken);

	return data.refreshToken.accessToken;
}
```

## Security Considerations

### Token Storage

- **Access tokens**: Short-lived (15 minutes) - can be stored in memory or localStorage
- **Refresh tokens**: Long-lived (7 days) - should be stored securely (httpOnly cookies preferred)
- Never store tokens in URL or query parameters permanently

### Token Security

- Refresh tokens are hashed with bcrypt before database storage
- Separate secrets for access and refresh tokens
- Tokens automatically invalidated when user changes critical info

### OAuth Security

- State parameter for CSRF protection (handled by Passport)
- Callback URL validation
- Email verification automatic for OAuth users
- Auto-linking prevents duplicate accounts

### Account Linking

- If email exists with password, OAuth is linked to existing account
- Users can have multiple OAuth providers linked
- Cannot create duplicate accounts with same email

## Database Schema

### User Model Updates

```typescript
{
  email: String (required, unique),
  emailVerified: Boolean (default: false),
  passwordHash: String (optional), // Optional for OAuth-only users
  refreshToken: String (optional, select: false), // Hashed refresh token
  oauthProviders: [
    {
      provider: String, // 'google', 'linkedin', 'github'
      providerId: String, // OAuth provider's user ID
      profileUrl: String // Link to OAuth profile
    }
  ],
  // ... other fields
}
```

### Indexes

- `email`: Unique index
- `oauthProviders.provider + oauthProviders.providerId`: Compound index for OAuth lookups

## Testing OAuth Flow

### Local Testing

1. Start the server: `npm run start:dev`
2. Open browser: `http://localhost:3000/auth/google`
3. Complete OAuth flow
4. Check redirect with tokens in URL
5. Verify user created in database

### Testing Token Refresh

```bash
# Using curl
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { refreshToken(input: { refreshToken: \"YOUR_REFRESH_TOKEN\" }) { accessToken } }"
  }'
```

## Troubleshooting

### OAuth Redirect Not Working

- Check OAuth provider console for correct callback URLs
- Verify environment variables are set
- Ensure frontend URL is correctly configured

### Email Not Provided by GitHub

- User's email must be public in GitHub settings
- Or request `user:email` scope (already configured)

### Refresh Token Invalid

- Token may have expired (7 days)
- User may have logged in again (old token invalidated)
- Token may have been tampered with

### Circular Dependency Error

- AuthModule imports UserModule with `forwardRef`
- UserModule exports UserService
- This is expected and handled correctly

## Files Created/Modified

### New Files

- `apps/hire-hub/src/components/auth/strategies/google.strategy.ts`
- `apps/hire-hub/src/components/auth/strategies/linkedin.strategy.ts`
- `apps/hire-hub/src/components/auth/strategies/github.strategy.ts`
- `apps/hire-hub/src/components/auth/auth.controller.ts`
- `apps/hire-hub/src/libs/dto/user/refresh-token.input.ts`

### Modified Files

- `apps/hire-hub/src/schemas/User.model.ts` - Added refreshToken, made passwordHash optional
- `apps/hire-hub/src/components/auth/auth.module.ts` - Added Passport, strategies, controller
- `apps/hire-hub/src/components/auth/auth.service.ts` - Added refresh token methods
- `apps/hire-hub/src/components/user/user.service.ts` - Added OAuth and refresh token methods
- `apps/hire-hub/src/components/user/user.resolver.ts` - Added refresh token mutation
- `apps/hire-hub/src/libs/env.util.ts` - Added OAuth environment variables
- `apps/hire-hub/src/libs/dto/user/user.output.ts` - Updated AuthResponse with expiration times
- `package.json` - Added Passport dependencies

## Next Steps

1. **Frontend Implementation**: Implement OAuth buttons and callback handling
2. **Token Rotation**: Enable refresh token rotation for enhanced security (commented in code)
3. **Session Management**: Add logout endpoint to invalidate refresh tokens
4. **Admin Features**: Add admin endpoints to view/revoke user sessions
5. **Rate Limiting**: Add rate limiting to OAuth endpoints
6. **Analytics**: Track OAuth usage and conversion rates

## Support

For issues or questions:

- Check environment variables configuration
- Verify OAuth provider settings
- Review server logs for detailed error messages
- Check database for user records and OAuth providers
