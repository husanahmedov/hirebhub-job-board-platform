# Content Moderation Settings API

This document shows how to use the content moderation settings API.

## GraphQL Schema

### Query: Get Content Moderation Settings

```graphql
query {
	getContentModerationSettings {
		autoModerateJobPosts
		autoModerateCompanyReviews
		profanityFilterEnabled
		maxJobPostsPerCompany
		jobPostExpirationDays
		reviewModerationRequired
	}
}
```

**Response:**

```json
{
	"data": {
		"getContentModerationSettings": {
			"autoModerateJobPosts": false,
			"autoModerateCompanyReviews": true,
			"profanityFilterEnabled": true,
			"maxJobPostsPerCompany": 50,
			"jobPostExpirationDays": 30,
			"reviewModerationRequired": true
		}
	}
}
```

### Mutation: Update Content Moderation Settings

```graphql
mutation {
	updateContentModerationSettings(
		input: { autoModerateJobPosts: true, maxJobPostsPerCompany: 100, jobPostExpirationDays: 45 }
	) {
		autoModerateJobPosts
		autoModerateCompanyReviews
		profanityFilterEnabled
		maxJobPostsPerCompany
		jobPostExpirationDays
		reviewModerationRequired
	}
}
```

**Response:**

```json
{
	"data": {
		"updateContentModerationSettings": {
			"autoModerateJobPosts": true,
			"autoModerateCompanyReviews": true,
			"profanityFilterEnabled": true,
			"maxJobPostsPerCompany": 100,
			"jobPostExpirationDays": 45,
			"reviewModerationRequired": true
		}
	}
}
```

## Authentication

Both endpoints require:

- Valid JWT token in Authorization header
- User must have `ADMIN` role

**Headers:**

```
Authorization: Bearer <your-admin-jwt-token>
```

## Testing with cURL

### Get Settings

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "query": "query { getContentModerationSettings { autoModerateJobPosts maxJobPostsPerCompany } }"
  }'
```

### Update Settings

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "query": "mutation($input: UpdateContentModerationInput!) { updateContentModerationSettings(input: $input) { autoModerateJobPosts maxJobPostsPerCompany } }",
    "variables": {
      "input": {
        "autoModerateJobPosts": true,
        "maxJobPostsPerCompany": 100
      }
    }
  }'
```

## Implementation Details

### Database Structure

Settings are stored in the `system_settings` collection with the following structure:

```javascript
{
  _id: ObjectId("..."),
  key: "autoModerateJobPosts",
  category: "moderation",
  value: false,
  type: "boolean",
  description: "Automatically moderate job posts before publishing",
  isEditable: true,
  lastUpdatedBy: ObjectId("admin-user-id"),
  createdAt: ISODate("2026-01-04T..."),
  updatedAt: ISODate("2026-01-04T...")
}
```

### Default Values

On application startup, the following default settings are automatically seeded:

- `autoModerateJobPosts`: false
- `autoModerateCompanyReviews`: true
- `profanityFilterEnabled`: true
- `maxJobPostsPerCompany`: 50
- `jobPostExpirationDays`: 30
- `reviewModerationRequired`: true

### Error Handling

- 401 Unauthorized: Missing or invalid JWT token
- 403 Forbidden: User does not have ADMIN role
- 400 Bad Request: Invalid input validation
