# Job GraphQL API - Complete Usage Guide

This guide provides detailed instructions for testing the Job GraphQL API using **Postman** or **Bruno**.

## Table of Contents

- [Setup](#setup)
- [Authentication](#authentication)
- [Queries](#queries)
  - [Get Jobs (with filtering & pagination)](#1-get-jobs-with-filtering--pagination)
  - [Get Job by ID](#2-get-job-by-id)
  - [Get Job by Slug](#3-get-job-by-slug)
  - [Get Job Statistics](#4-get-job-statistics)
- [Mutations](#mutations)
  - [Create Job](#1-create-job)
  - [Update Job](#2-update-job)
  - [Delete Job](#3-delete-job)
  - [Close Job](#4-close-job)
- [Advanced Filtering Examples](#advanced-filtering-examples)
- [Error Handling](#error-handling)

---

## Setup

### Base Configuration

- **Endpoint URL**: `http://localhost:8080/graphql`
- **Method**: `POST`
- **Content-Type**: `application/json`

### Postman Setup

1. Create a new request
2. Set method to **POST**
3. Set URL to `http://localhost:8080/graphql`
4. Go to **Headers** tab:
   - Add `Content-Type: application/json`
5. Go to **Body** tab:
   - Select **raw**
   - Select **JSON** format

### Bruno Setup

1. Create a new request
2. Set method to **POST**
3. Set URL to `http://localhost:8080/graphql`
4. In **Headers**:
   - Add `Content-Type: application/json`
5. In **Body**:
   - Select **GraphQL**

---

## Authentication

Most Job mutations require authentication with **RECRUITER** or **ADMIN** role.

### Adding Auth Token

#### Postman

1. Go to **Headers** tab
2. Add: `Authorization: Bearer YOUR_JWT_TOKEN`

#### Bruno

1. Go to **Auth** tab
2. Select **Bearer Token**
3. Paste your JWT token

### Getting a Token

You need to login first through the auth endpoint to get a JWT token:

```json
POST http://localhost:8080/auth/login
{
  "email": "recruiter@example.com",
  "password": "your_password"
}
```

---

## Queries

### 1. Get Jobs (with filtering & pagination)

**Description**: Retrieve a paginated list of jobs with advanced filtering, sorting, and search capabilities.

**Auth Required**: ❌ No (public endpoint)

#### Basic Query

```graphql
{
  "query": "query GetJobs($input: GetJobsInput) { getJobs(input: $input) { jobs { _id title slug companyId employmentType seniorityLevel location { city country remote } salaryRange { min max currency visibility } tags skills viewsCount applicationsCount isPublished createdAt } totalCount page limit totalPages hasNextPage hasPreviousPage } }",
  "variables": {
    "input": {
      "pagination": {
        "page": 1,
        "limit": 10
      }
    }
  }
}
```

#### With Populated Company & User Data

```graphql
{
  "query": "query GetJobs($input: GetJobsInput) { getJobs(input: $input) { jobs { _id title slug employmentType seniorityLevel location { city country remote } companyData { _id name slug logoUrl verified } postedByData { _id firstName lastName email profilePicture } viewsCount applicationsCount createdAt } totalCount page totalPages } }",
  "variables": {
    "input": {
      "pagination": {
        "page": 1,
        "limit": 20
      }
    }
  }
}
```

#### Advanced Filtering Example

```graphql
{
  "query": "query GetJobs($input: GetJobsInput) { getJobs(input: $input) { jobs { _id title slug employmentType seniorityLevel location { city country remote } salaryRange { min max currency } tags skills createdAt } totalCount page totalPages } }",
  "variables": {
    "input": {
      "filter": {
        "search": "software engineer",
        "employmentTypes": ["FULL_TIME", "CONTRACT"],
        "seniorityLevels": ["SENIOR", "LEAD"],
        "city": "New York",
        "country": "USA",
        "remote": true,
        "skills": ["TypeScript", "React"],
        "tags": ["frontend", "backend"],
        "isPublished": true,
        "hasSalary": true
      },
      "sort": {
        "field": "createdAt",
        "order": "desc"
      },
      "pagination": {
        "page": 1,
        "limit": 15
      }
    }
  }
}
```

#### Filter by Company

```graphql
{
  "query": "query GetJobs($input: GetJobsInput) { getJobs(input: $input) { jobs { _id title slug employmentType createdAt } totalCount } }",
  "variables": {
    "input": {
      "filter": {
        "companyId": "507f1f77bcf86cd799439011"
      },
      "pagination": {
        "page": 1,
        "limit": 10
      }
    }
  }
}
```

---

### 2. Get Job by ID

**Description**: Retrieve a single job by its unique ID.

**Auth Required**: ❌ No (public endpoint)

```graphql
{
  "query": "query GetJobById($jobId: ID!) { getJobById(jobId: $jobId) { _id title slug description shortDescription employmentType seniorityLevel location { city region country remote } salaryRange { min max currency visibility } companyData { _id name slug logoUrl verified } postedByData { _id firstName lastName email profilePicture } tags skills requirements benefits applicationDeadline isPublished visibility viewsCount applicationsCount createdAt updatedAt closedAt } }",
  "variables": {
    "jobId": "507f1f77bcf86cd799439011"
  }
}
```

---

### 3. Get Job by Slug

**Description**: Retrieve a single job by its URL-friendly slug.

**Auth Required**: ❌ No (public endpoint)

```graphql
{
  "query": "query GetJobBySlug($slug: String!) { getJobBySlug(slug: $slug) { _id title slug description shortDescription employmentType seniorityLevel location { city region country remote } salaryRange { min max currency visibility } companyData { _id name slug logoUrl verified } postedByData { _id firstName lastName email profilePicture } tags skills requirements benefits applicationDeadline isPublished visibility viewsCount applicationsCount createdAt updatedAt closedAt } }",
  "variables": {
    "slug": "senior-software-engineer-remote"
  }
}
```

---

### 4. Get Job Statistics

**Description**: Retrieve aggregated statistics for jobs (total, published, draft, closed, applications, views).

**Auth Required**: ✅ Yes (RECRUITER or ADMIN)

#### All Jobs Stats

```graphql
{
  "query": "query GetJobStats { getJobStats { totalJobs publishedJobs draftJobs closedJobs totalApplications totalViews } }"
}
```

#### Stats for Specific Company

```graphql
{
  "query": "query GetJobStats($companyId: ID) { getJobStats(companyId: $companyId) { totalJobs publishedJobs draftJobs closedJobs totalApplications totalViews } }",
  "variables": {
    "companyId": "507f1f77bcf86cd799439011"
  }
}
```

---

## Mutations

### 1. Create Job

**Description**: Create a new job posting.

**Auth Required**: ✅ Yes (RECRUITER or ADMIN)

```graphql
{
  "query": "mutation CreateJob($input: CreateJobInput!) { createJob(input: $input) { _id title slug employmentType seniorityLevel location { city country remote } salaryRange { min max currency visibility } companyData { name slug } postedByData { firstName lastName } tags skills isPublished createdAt } }",
  "variables": {
    "input": {
      "companyId": "507f1f77bcf86cd799439011",
      "title": "Senior Full-Stack Developer",
      "slug": "senior-full-stack-developer-remote-2024",
      "description": "We are looking for an experienced Full-Stack Developer to join our team...",
      "shortDescription": "Join our team as a Senior Full-Stack Developer",
      "employmentType": "FULL_TIME",
      "seniorityLevel": "SENIOR",
      "location": {
        "city": "San Francisco",
        "region": "California",
        "country": "USA",
        "remote": true
      },
      "salaryRange": {
        "min": 120000,
        "max": 180000,
        "currency": "USD",
        "visibility": "PUBLIC"
      },
      "tags": ["frontend", "backend", "remote"],
      "skills": ["TypeScript", "React", "Node.js", "MongoDB"],
      "requirements": [
        "5+ years of software development experience",
        "Strong knowledge of TypeScript and React",
        "Experience with Node.js and MongoDB",
        "Excellent communication skills"
      ],
      "benefits": [
        "Competitive salary",
        "Health insurance",
        "Flexible working hours",
        "Remote work option",
        "Professional development budget"
      ],
      "applicationDeadline": "2024-12-31T23:59:59.000Z",
      "isPublished": true,
      "visibility": "PUBLIC"
    }
  }
}
```

#### Minimal Job Creation (Draft)

```graphql
{
  "query": "mutation CreateJob($input: CreateJobInput!) { createJob(input: $input) { _id title slug isPublished } }",
  "variables": {
    "input": {
      "companyId": "507f1f77bcf86cd799439011",
      "title": "Software Engineer",
      "slug": "software-engineer-2024",
      "employmentType": "FULL_TIME",
      "seniorityLevel": "MID_LEVEL",
      "location": {
        "remote": false
      },
      "isPublished": false,
      "visibility": "COMPANY_ONLY"
    }
  }
}
```

---

### 2. Update Job

**Description**: Update an existing job posting.

**Auth Required**: ✅ Yes (RECRUITER or ADMIN)

#### Full Update

```graphql
{
  "query": "mutation UpdateJob($input: UpdateJobInput!) { updateJob(input: $input) { _id title slug description employmentType seniorityLevel location { city country remote } salaryRange { min max currency } tags skills isPublished updatedAt } }",
  "variables": {
    "input": {
      "jobId": "507f1f77bcf86cd799439011",
      "title": "Senior Full-Stack Developer (Updated)",
      "description": "Updated job description...",
      "employmentType": "FULL_TIME",
      "seniorityLevel": "SENIOR",
      "location": {
        "city": "New York",
        "region": "New York",
        "country": "USA",
        "remote": true
      },
      "salaryRange": {
        "min": 130000,
        "max": 190000,
        "currency": "USD",
        "visibility": "PUBLIC"
      },
      "tags": ["frontend", "backend", "remote", "urgent"],
      "skills": ["TypeScript", "React", "Node.js", "MongoDB", "Docker"],
      "isPublished": true
    }
  }
}
```

#### Partial Update (e.g., Publish a Draft)

```graphql
{
  "query": "mutation UpdateJob($input: UpdateJobInput!) { updateJob(input: $input) { _id title isPublished updatedAt } }",
  "variables": {
    "input": {
      "jobId": "507f1f77bcf86cd799439011",
      "isPublished": true
    }
  }
}
```

#### Update Salary Only

```graphql
{
  "query": "mutation UpdateJob($input: UpdateJobInput!) { updateJob(input: $input) { _id salaryRange { min max currency visibility } } }",
  "variables": {
    "input": {
      "jobId": "507f1f77bcf86cd799439011",
      "salaryRange": {
        "min": 150000,
        "max": 200000,
        "currency": "USD",
        "visibility": "PUBLIC"
      }
    }
  }
}
```

---

### 3. Delete Job

**Description**: Soft delete a job (marks as deleted but doesn't remove from database).

**Auth Required**: ✅ Yes (RECRUITER or ADMIN)

```graphql
{
  "query": "mutation DeleteJob($jobId: ID!) { deleteJob(jobId: $jobId) }",
  "variables": {
    "jobId": "507f1f77bcf86cd799439011"
  }
}
```

**Response:**

```json
{
	"data": {
		"deleteJob": true
	}
}
```

---

### 4. Close Job

**Description**: Close a job (mark as filled/no longer accepting applications).

**Auth Required**: ✅ Yes (RECRUITER or ADMIN)

```graphql
{
  "query": "mutation CloseJob($jobId: ID!) { closeJob(jobId: $jobId) { _id title closedAt isPublished } }",
  "variables": {
    "jobId": "507f1f77bcf86cd799439011"
  }
}
```

---

## Advanced Filtering Examples

### 1. Remote Jobs Only

```json
{
	"filter": {
		"remote": true,
		"isPublished": true
	},
	"pagination": {
		"page": 1,
		"limit": 20
	}
}
```

### 2. Jobs with Salary Information

```json
{
	"filter": {
		"hasSalary": true,
		"isPublished": true
	},
	"sort": {
		"field": "createdAt",
		"order": "desc"
	}
}
```

### 3. Full-Text Search

```json
{
	"filter": {
		"search": "senior react developer",
		"isPublished": true
	}
}
```

### 4. Multiple Employment Types

```json
{
	"filter": {
		"employmentTypes": ["FULL_TIME", "CONTRACT", "PART_TIME"],
		"seniorityLevels": ["SENIOR", "LEAD", "PRINCIPAL"]
	}
}
```

### 5. Location-Based with Skills

```json
{
	"filter": {
		"country": "USA",
		"city": "San Francisco",
		"skills": ["TypeScript", "React"],
		"isPublished": true
	}
}
```

### 6. Jobs by Tags

```json
{
	"filter": {
		"tags": ["frontend", "react", "remote"],
		"isPublished": true
	},
	"sort": {
		"field": "viewsCount",
		"order": "desc"
	}
}
```

---

## Error Handling

### Common Errors

#### 1. Job Not Found (404)

```json
{
	"errors": [
		{
			"message": "Job with slug \"non-existent-job\" not found",
			"extensions": {
				"code": "NOT_FOUND"
			}
		}
	]
}
```

#### 2. Unauthorized (401)

```json
{
	"errors": [
		{
			"message": "Unauthorized",
			"extensions": {
				"code": "UNAUTHENTICATED"
			}
		}
	]
}
```

#### 3. Forbidden (403)

```json
{
	"errors": [
		{
			"message": "Forbidden resource",
			"extensions": {
				"code": "FORBIDDEN"
			}
		}
	]
}
```

#### 4. Validation Error (400)

```json
{
	"errors": [
		{
			"message": "Validation failed",
			"extensions": {
				"code": "BAD_REQUEST",
				"validationErrors": [
					{
						"field": "title",
						"message": "Title is required"
					}
				]
			}
		}
	]
}
```

#### 5. Duplicate Slug (400)

```json
{
	"errors": [
		{
			"message": "Job with this slug already exists",
			"extensions": {
				"code": "BAD_REQUEST"
			}
		}
	]
}
```

---

## Testing Workflow

### 1. Basic Testing Flow

1. **Setup**: Configure Postman/Bruno with GraphQL endpoint
2. **Login**: Get authentication token
3. **Create**: Create a new job posting
4. **Read**: Retrieve the job by ID or slug
5. **Update**: Modify job details
6. **List**: Get all jobs with filters
7. **Stats**: Check job statistics
8. **Close**: Mark job as closed
9. **Delete**: Soft delete the job

### 2. Postman Collection Structure

```
Job API
├── Authentication
│   └── Login (Get Token)
├── Queries
│   ├── Get Jobs (Paginated)
│   ├── Get Jobs (Filtered)
│   ├── Get Job by ID
│   ├── Get Job by Slug
│   └── Get Job Stats
└── Mutations
    ├── Create Job
    ├── Update Job
    ├── Close Job
    └── Delete Job
```

### 3. Environment Variables (Postman)

```json
{
	"base_url": "http://localhost:8080",
	"auth_token": "{{YOUR_JWT_TOKEN}}",
	"company_id": "507f1f77bcf86cd799439011",
	"job_id": "507f1f77bcf86cd799439012"
}
```

---

## Tips & Best Practices

1. **Always test unauthenticated endpoints first** (getJobs, getJobById, getJobBySlug)
2. **Use environment variables** for dynamic values (IDs, tokens)
3. **Test pagination** with different page sizes
4. **Test edge cases**: empty filters, invalid IDs, unauthorized access
5. **Verify populated data** (companyData, postedByData) in responses
6. **Check error responses** match expected error codes
7. **Test sorting** by different fields (createdAt, viewsCount, etc.)
8. **Validate required fields** when creating/updating jobs

---

## GraphQL Playground (Alternative)

You can also test these APIs directly in GraphQL Playground at:

```
http://localhost:8080/graphql
```

In the playground:

1. Use the **Schema** tab to explore all available queries/mutations
2. Use the **Docs** tab to see input/output types
3. Add authentication in **HTTP HEADERS**:

```json
{
	"Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

---

## Support

For issues or questions:

- Check the [Error Handling](#error-handling) section
- Review the GraphQL schema documentation
- Check server logs for detailed error messages
- Verify your authentication token is valid and has correct roles

---

**Last Updated**: January 2026
**API Version**: v1.0
