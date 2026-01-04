import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Output type for content settings
 * Returns the current values of all content settings
 */
@ObjectType()
export class ContentSettings {
	@Field(() => Boolean, { description: 'Automatically moderate job posts before publishing' })
	autoModerateJobPosts: boolean;

	@Field(() => Boolean, { description: 'Automatically moderate company reviews' })
	autoModerateCompanyReviews: boolean;

	@Field(() => Boolean, { description: 'Enable profanity filter for user content' })
	profanityFilterEnabled: boolean;

	@Field(() => Number, { description: 'Maximum job posts allowed per company' })
	maxJobPostsPerCompany: number;

	@Field(() => Number, { description: 'Days until job posts automatically expire' })
	jobPostExpirationDays: number;

	@Field(() => Boolean, { description: 'Require manual review approval for company reviews' })
	reviewModerationRequired: boolean;
}
