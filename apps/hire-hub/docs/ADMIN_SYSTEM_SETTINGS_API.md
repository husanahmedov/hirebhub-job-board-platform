# Admin System Settings API Reference

Complete GraphQL API for managing all system settings. All endpoints require **ADMIN** role.

## 📋 Available Categories

1. **Content Settings** - Moderation rules and content limits
2. **Features Settings** - Feature flags
3. **Notifications Settings** - Email/SMS notification preferences
4. **Payment & Billing Settings** - Billing configuration
5. **Platform Settings** - Core platform configuration
6. **Rate Limits Settings** - API and usage limits

---

## 1️⃣ Content Settings

### Query

```graphql
query {
	getContentSettings {
		autoModerateJobPosts
		autoModerateCompanyReviews
		profanityFilterEnabled
		maxJobPostsPerCompany
		jobPostExpirationDays
		reviewModerationRequired
	}
}
```

### Mutation

```graphql
mutation {
	updateContentSettings(input: { autoModerateJobPosts: true, maxJobPostsPerCompany: 100 }) {
		autoModerateJobPosts
		maxJobPostsPerCompany
	}
}
```

---

## 2️⃣ Features Settings

### Query

```graphql
query {
	getFeaturesSettings {
		bookmarksEnabled
		notificationsEnabled
		companyReviewsEnabled
		advancedSearchEnabled
		aiRecommendationsEnabled
		chatEnabled
	}
}
```

### Mutation

```graphql
mutation {
	updateFeaturesSettings(input: { aiRecommendationsEnabled: true, chatEnabled: true }) {
		aiRecommendationsEnabled
		chatEnabled
	}
}
```

---

## 3️⃣ Notifications Settings

### Query

```graphql
query {
	getNotificationsSettings {
		emailNotificationsEnabled
		smsNotificationsEnabled
		newJobAlertEnabled
		applicationStatusEmailEnabled
		weeklyDigestEnabled
	}
}
```

### Mutation

```graphql
mutation {
	updateNotificationsSettings(input: { smsNotificationsEnabled: true, weeklyDigestEnabled: false }) {
		emailNotificationsEnabled
		smsNotificationsEnabled
	}
}
```

---

## 4️⃣ Payment & Billing Settings

### Query

```graphql
query {
	getPaymentBillingSettings {
		autoBillingEnabled
		billingCycleInDays
		sendBillingReminders
		reminderFrequencyInDays
		stripeEnabled
		freePlanJobPostLimit
		proPlanJobPostLimit
		enterprisePlanJobPostLimit
		subscriptionRequired
	}
}
```

### Mutation

```graphql
mutation {
	updatePaymentBillingSettings(input: { stripeEnabled: true, proPlanJobPostLimit: 100, subscriptionRequired: true }) {
		stripeEnabled
		proPlanJobPostLimit
		subscriptionRequired
	}
}
```

---

## 5️⃣ Platform Settings

### Query

```graphql
query {
	getPlatformSettings {
		maintenanceMode
		registrationEnabled
		requireEmailVerification
		allowedEmailDomains
		allowGuestBrowsing
		platformName
		platformUrl
		supportEmail
	}
}
```

### Mutation

```graphql
mutation {
	updatePlatformSettings(
		input: { maintenanceMode: true, platformName: "HireHub Pro", allowedEmailDomains: ["company.com", "example.com"] }
	) {
		maintenanceMode
		platformName
		allowedEmailDomains
	}
}
```

---

## 6️⃣ Rate Limits Settings

### Query

```graphql
query {
	getRateLimitsSettings {
		maxApplicationsPerDay
		maxJobPostsPerMonth
		maxResumeUploads
		apiRateLimitPerMinute
		bulkOperationLimit
	}
}
```

### Mutation

```graphql
mutation {
	updateRateLimitsSettings(input: { maxApplicationsPerDay: 20, apiRateLimitPerMinute: 100 }) {
		maxApplicationsPerDay
		apiRateLimitPerMinute
	}
}
```

---

## 🔐 Authentication

All endpoints require:

```
Authorization: Bearer <admin-jwt-token>
```

And user must have `ADMIN` role.

---

## 🎯 Quick Test Examples

### Get All Settings

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ getContentSettings { autoModerateJobPosts } getFeaturesSettings { chatEnabled } }"
  }'
```

### Update Multiple Categories

```graphql
mutation {
	content: updateContentSettings(input: { maxJobPostsPerCompany: 200 }) {
		maxJobPostsPerCompany
	}
	features: updateFeaturesSettings(input: { chatEnabled: true }) {
		chatEnabled
	}
}
```

---

## 📝 Implementation Details

- **Database**: MongoDB `system_settings` collection
- **Pattern**: Key-value storage with category grouping
- **Updates**: Partial updates supported (upsert)
- **Defaults**: Auto-seeded on app startup
- **Audit**: Tracks `lastUpdatedBy` and timestamps
