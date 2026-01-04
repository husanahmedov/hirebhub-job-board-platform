import { ObjectType, Field } from '@nestjs/graphql';
/**
 * Output type for payment and billing settings
 * Returns the current values of all payment and billing settings
 */
@ObjectType()
export class RateLimitsSettings {
	@Field(() => Number, { description: 'Maximum number of job applications allowed per day' })
	maxApplicationsPerDay: number;

	@Field(() => Number, { description: 'Maximum number of job posts allowed per month' })
	maxJobPostsPerMonth: number;

	@Field(() => Number, { description: 'Maximum number of resume uploads allowed' })
	maxResumeUploads: number;

	@Field(() => Number, { description: 'API rate limit per minute' })
	apiRateLimitPerMinute: number;

	@Field(() => Number, { description: 'Limit for bulk operations' })
	bulkOperationLimit: number;
}
