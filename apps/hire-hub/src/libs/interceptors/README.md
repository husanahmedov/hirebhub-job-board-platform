# Status Interceptor

An elegant terminal status display for tracking GraphQL and HTTP requests in real-time.

## Features

✨ **Beautiful Table-Style Display** - Clean, organized output with proper column alignment  
🎨 **Color-Coded Information** - Different colors for different operation types  
⚡ **Performance Monitoring** - Visual indicators for response times  
🔐 **Authentication Status** - Shows whether requests are from authenticated users or guests  
✅ **Status Tracking** - Displays success/error status for each request

## Display Format

```
════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
Time         Type     Operation                           User                        Response     Status
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
11:52:30 PM  QUERY    getJobs                             🔐 user@example.com          ⚡ 45ms      ✓ OK
11:52:31 PM  MUTATION createApplication                   🔐 john.doe@example.com      ✓ 234ms     ✓ OK
11:52:32 PM  QUERY    getCompanyById                      👤 Guest                     ⚠ 678ms     ✓ OK
11:52:33 PM  HTTP     GET /health                         👤 Guest                     ⚡ 12ms      ✓ OK
11:52:34 PM  MUTATION updateJob                           🔐 admin@hirehub.com         ⏱ 1245ms    ✓ OK
11:52:35 PM  QUERY    invalidQuery                        👤 Guest                     ⚡ 23ms      ✗ ERROR
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

## Column Descriptions

| Column        | Description                                                             |
| ------------- | ----------------------------------------------------------------------- |
| **Time**      | Timestamp of the request (HH:MM:SS format)                              |
| **Type**      | Operation type: `QUERY`, `MUTATION`, or `HTTP`                          |
| **Operation** | GraphQL resolver name or HTTP endpoint                                  |
| **User**      | Authenticated user's email/name or "Guest" for unauthenticated requests |
| **Response**  | Response time with performance indicator                                |
| **Status**    | Request status: `✓ OK` or `✗ ERROR`                                     |

## Color Coding

### Operation Types

- 🔵 **Blue** - GraphQL Queries
- 🟣 **Magenta** - GraphQL Mutations
- 🟡 **Yellow** - HTTP Requests

### Authentication Status

- 🟢 **Green** (🔐) - Authenticated users
- ⚫ **Gray** (👤) - Guest/unauthenticated

### Response Time Indicators

| Icon | Time Range | Color  | Meaning                       |
| ---- | ---------- | ------ | ----------------------------- |
| ⚡   | < 100ms    | Green  | Excellent performance         |
| ✓    | 100-500ms  | Cyan   | Good performance              |
| ⚠    | 500-1000ms | Yellow | Slow response                 |
| ⏱    | > 1000ms   | Red    | Very slow, needs optimization |

### Status

- ✅ **Green** - Request succeeded
- ❌ **Red** - Request failed/error occurred

## Usage

The Status Interceptor is globally enabled in `main.ts`:

```typescript
app.useGlobalInterceptors(new StatusInterceptor());
```

The status table header is automatically printed on application startup:

```typescript
StatusInterceptor.printHeader();
```

## Benefits

1. **Real-time Monitoring** - Instantly see what's happening in your application
2. **Performance Insights** - Quickly identify slow queries and mutations
3. **Security Awareness** - Track authenticated vs. unauthenticated requests
4. **Error Detection** - Immediately spot failed requests
5. **Clean Console** - Professional, organized output that's easy to read

## Implementation Details

The interceptor tracks:

- ✅ All GraphQL queries and mutations
- ✅ All HTTP requests (REST endpoints)
- ✅ Response times
- ✅ Success/failure status
- ✅ User authentication status
- ✅ Error handling

## Notes

- The interceptor automatically handles both successful and failed requests
- Response times are measured from request start to completion
- User information is extracted from the request context (JWT token)
- Guest users are shown when no authentication token is present
- The display is optimized for terminals with at least 120 character width
