import { registerEnumType } from '@nestjs/graphql';

export enum SystemCategoryEnum {
	MODERATION = 'moderation',
	RATE_LIMITS = 'rate_limits',
	FEATURE_FLAGS = 'feature_flags',
	NOTIFICATIONS = 'notifications',
	SECURITY = 'security',
	SEARCH = 'search',
	PLATFORM = 'platform',
	PAYMENT = 'payment',
}

export enum SystemDataTypeEnum {
	BOOLEAN = 'boolean',
	NUMBER = 'number',
	STRING = 'string',
	ARRAY = 'array',
	OBJECT = 'object',
}

export enum SystemContentModerationKeysEnum {
	AUTO_MODERATE_JOB_POSTS = 'autoModerateJobPosts',
	AUTO_MODERATE_COMPANY_REVIEWS = 'autoModerateCompanyReviews',
	PROFANITY_FILTER_ENABLED = 'profanityFilterEnabled',
	MAX_JOB_POSTS_PER_COMPANY = 'maxJobPostsPerCompany',
	JOB_POST_EXPIRATION_DAYS = 'jobPostExpirationDays',
	REVIEW_MODERATION_REQUIRED = 'reviewModerationRequired',
}

export enum SystemRateLimitModerationKeysEnum {
	MAX_APPLICATIONS_PER_DAY = 'maxApplicationsPerDay',
	MAX_JOB_POSTS_PER_MONTH = 'maxJobPostsPerMonth',
	MAX_RESUME_UPLOADS = 'maxResumeUploads',
	API_RATE_LIMIT_PER_MINUTE = 'apiRateLimitPerMinute',
	BULK_OPERATION_LIMIT = 'bulkOperationLimit',
}

export enum SystemFeaturesModerationKeysEnum {
	BOOKMARKS_ENABLED = 'bookmarksEnabled',
	NOTIFICATIONS_ENABLED = 'notificationsEnabled',
	COMPANY_REVIEWS_ENABLED = 'companyReviewsEnabled',
	ADVANCED_SEARCH_ENABLED = 'advancedSearchEnabled',
	AI_RECOMMENDATIONS_ENABLED = 'aiRecommendationsEnabled',
	CHAT_ENABLED = 'chatEnabled',
}

export enum SystemPlatformKeysEnum {
	MAINTENANCE_MODE = 'maintenanceMode',
	REGISTRATION_ENABLED = 'registrationEnabled',
	REQUIRE_EMAIL_VERIFICATION = 'requireEmailVerification',
	ALLOWED_EMAIL_DOMAINS = 'allowedEmailDomains',
	ALLOW_GUEST_BROWSING = 'allowGuestBrowsing',
	PLATFORM_NAME = 'platformName',
	PLATFORM_URL = 'platformUrl',
	SUPPORT_EMAIL = 'supportEmail',
}

export enum SystemNotificationsKeysEnum {
	EMAIL_NOTIFICATIONS_ENABLED = 'emailNotificationsEnabled',
	SMS_NOTIFICATIONS_ENABLED = 'smsNotificationsEnabled',
	NEW_JOB_ALERT_ENABLED = 'newJobAlertEnabled',
	APPLICATION_STATUS_EMAIL_ENABLED = 'applicationStatusEmailEnabled',
	WEEKLY_DIGEST_ENABLED = 'weeklyDigestEnabled',
}

export enum SystemPaymentBillingKeysEnum {
	AUTO_BILLING_ENABLED = 'autoBillingEnabled',
	BILLING_CYCLE_IN_DAYS = 'billingCycleInDays',
	SEND_BILLING_REMINDERS = 'sendBillingReminders',
	REMINDER_FREQUENCY_IN_DAYS = 'reminderFrequencyInDays',
	STRIPE_ENABLED = 'stripeEnabled',
	FREE_PLAN_JOB_POST_LIMIT = 'freePlanJobPostLimit',
	PRO_PLAN_JOB_POST_LIMIT = 'proPlanJobPostLimit',
	ENTERPRISE_PLAN_JOB_POST_LIMIT = 'enterprisePlanJobPostLimit',
	SUBSCRIPTION_REQUIRED = 'subscriptionRequired',
}

registerEnumType(SystemCategoryEnum, {
	name: 'SystemCategory',
	description: 'Categories for system settings',
});

registerEnumType(SystemDataTypeEnum, {
	name: 'SystemDataType',
	description: 'Data types for system setting values',
});

registerEnumType(SystemContentModerationKeysEnum, {
	name: 'SystemContentModerationKeys',
	description: 'Keys for content moderation system settings',
});

registerEnumType(SystemRateLimitModerationKeysEnum, {
	name: 'SystemRateLimitKeys',
	description: 'Keys for rate limit system settings',
});

registerEnumType(SystemFeaturesModerationKeysEnum, {
	name: 'SystemFeaturesKeys',
	description: 'Keys for feature flags system settings',
});

registerEnumType(SystemPlatformKeysEnum, {
	name: 'SystemPlatformKeys',
	description: 'Keys for platform configuration system settings',
});

registerEnumType(SystemNotificationsKeysEnum, {
	name: 'SystemNotificationsKeys',
	description: 'Keys for notifications system settings',
});

registerEnumType(SystemPaymentBillingKeysEnum, {
	name: 'SystemPaymentBillingKeys',
	description: 'Keys for payment and billing system settings',
});
