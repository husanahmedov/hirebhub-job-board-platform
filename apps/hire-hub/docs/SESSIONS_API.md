# Sessions Management API

This document describes the sessions management API for handling user sessions, including viewing active sessions and revoking sessions.

## Overview

The sessions system tracks all active login sessions for a user across different devices. Each session includes:

- Device information (name, type, browser, OS)
- IP address and location
- Last used timestamp
- Active status
- **isCurrent flag** - indicates if this is the current session making the request

## GraphQL Queries

### Get User Sessions

Retrieves all active sessions for the authenticated user with the `isCurrent` flag set for the current session.

```graphql
query GetUserSessions {
	getUserSessions {
		id
		deviceName
		deviceType
		browser
		os
		ipAddress
		location
		createdAt
		lastUsedAt
		isActive
		isCurrent
	}
}
```

**Response Example:**

```json
{
	"data": {
		"getUserSessions": [
			{
				"id": "60f7b3b3b3b3b3b3b3b3b3b3",
				"deviceName": "MacBook Pro",
				"deviceType": "desktop",
				"browser": "Chrome",
				"os": "macOS",
				"ipAddress": "192.168.1.100",
				"location": "San Francisco, CA",
				"createdAt": "2026-01-31T10:00:00.000Z",
				"lastUsedAt": "2026-01-31T15:30:00.000Z",
				"isActive": true,
				"isCurrent": true
			},
			{
				"id": "60f7b3b3b3b3b3b3b3b3b3b4",
				"deviceName": "iPhone 14",
				"deviceType": "mobile",
				"browser": "Safari",
				"os": "iOS",
				"ipAddress": "192.168.1.101",
				"location": "San Francisco, CA",
				"createdAt": "2026-01-30T08:00:00.000Z",
				"lastUsedAt": "2026-01-31T12:00:00.000Z",
				"isActive": true,
				"isCurrent": false
			}
		]
	}
}
```

**Authentication Required:** Yes (Bearer token in Authorization header)

**Roles:** Any authenticated user

---

## GraphQL Mutations

### Revoke a Specific Session

Revokes a specific session by its ID. Users can log out from a specific device.

```graphql
mutation RevokeSession($sessionId: String!) {
	revokeSession(sessionId: $sessionId) {
		message
		success
	}
}
```

**Variables:**

```json
{
	"sessionId": "60f7b3b3b3b3b3b3b3b3b3b4"
}
```

**Response:**

```json
{
	"data": {
		"revokeSession": {
			"message": "Session revoked successfully",
			"success": true
		}
	}
}
```

**Authentication Required:** Yes

**Roles:** Any authenticated user

---

### Revoke All Other Sessions

Revokes all sessions except the current one. Useful when a user wants to log out from all other devices.

```graphql
mutation RevokeAllOtherSessions {
	revokeAllOtherSessions {
		message
		success
	}
}
```

**Response:**

```json
{
	"data": {
		"revokeAllOtherSessions": {
			"message": "All other sessions revoked successfully",
			"success": true
		}
	}
}
```

**Authentication Required:** Yes

**Roles:** Any authenticated user

---

## Implementation Details

### How `isCurrent` Works

1. When a user makes a request, the JWT token is extracted from the `Authorization` header
2. The JWT token is hashed using SHA-256 (same method used during session creation)
3. The hashed token is compared with the `token` field stored in each session
4. The session with matching token hash gets `isCurrent: true`, all others get `false`

### Session Token Storage

- JWT tokens are hashed using SHA-256 before storage for security
- The hash is stored in the `token` field of the session document
- This prevents token exposure if the database is compromised

### Session Lifecycle

1. **Creation**: Session is created during login with device info and hashed token
2. **Activity Tracking**: `lastUsedAt` is updated on each authenticated request
3. **Expiration**: Sessions expire after 7 days by default
4. **Revocation**: Sessions can be manually revoked by the user or admin

---

## Use Cases

### 1. User Security Dashboard

Display all active sessions to users, allowing them to see:

- Where they're logged in
- When each session was last used
- Which is their current session (highlighted)
- Option to revoke suspicious sessions

### 2. Force Logout from Other Devices

After password change or security concern, users can:

```graphql
mutation {
	revokeAllOtherSessions {
		message
		success
	}
}
```

### 3. Mobile App Session Management

Mobile apps can show:

- Current device (isCurrent: true)
- Web sessions
- Other mobile devices
- Option to revoke any session

---

## Frontend Integration Example

```typescript
// React/TypeScript example
const SessionsManager = () => {
  const { data, loading } = useQuery(GET_USER_SESSIONS);

  const [revokeSession] = useMutation(REVOKE_SESSION);
  const [revokeAllOthers] = useMutation(REVOKE_ALL_OTHER_SESSIONS);

  const handleRevokeSession = async (sessionId: string) => {
    await revokeSession({ variables: { sessionId } });
    // Refresh the sessions list
  };

  const handleRevokeAllOthers = async () => {
    await revokeAllOthers();
    // Refresh the sessions list
  };

  return (
    <div>
      <h2>Active Sessions</h2>
      {data?.getUserSessions.map((session) => (
        <div key={session.id} className={session.isCurrent ? 'current' : ''}>
          <h3>{session.deviceName} {session.isCurrent && '(Current)'}</h3>
          <p>{session.browser} on {session.os}</p>
          <p>Last used: {new Date(session.lastUsedAt).toLocaleString()}</p>
          <p>Location: {session.location}</p>
          {!session.isCurrent && (
            <button onClick={() => handleRevokeSession(session.id)}>
              Revoke
            </button>
          )}
        </div>
      ))}
      <button onClick={handleRevokeAllOthers}>
        Log out from all other devices
      </button>
    </div>
  );
};
```

---

## Security Considerations

1. **Token Hashing**: JWT tokens are always hashed before storage
2. **Session Validation**: Sessions are validated on each request
3. **Automatic Cleanup**: Expired sessions are periodically cleaned up
4. **User Control**: Users can revoke any of their sessions at any time
5. **Current Session Protection**: The current session is identified and can be excluded from bulk revocations

---

## Testing

### Test Current Session Flag

1. Login from browser and get access token
2. Query `getUserSessions` with that token
3. Verify one session has `isCurrent: true`
4. Login from another device/browser
5. Query again - verify only the requesting session has `isCurrent: true`

### Test Session Revocation

1. Create multiple sessions (login from different devices)
2. Revoke a specific session
3. Verify that session is marked as `isActive: false`
4. Try to use that session's token - should fail authentication

### Test Revoke All Others

1. Create 3+ sessions
2. From one session, call `revokeAllOtherSessions`
3. Verify only the calling session remains active
4. Other sessions should fail authentication
