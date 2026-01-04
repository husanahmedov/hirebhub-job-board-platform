// features output DTO

import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Output type for features settings
 * Returns the current values of all features settings
 */
@ObjectType()
export class FeaturesSettings {
	@Field(() => Boolean, { description: 'Indicates if bookmarks feature is enabled' })
	bookmarksEnabled?: boolean;

	@Field(() => Boolean, { description: 'Indicates if notifications feature is enabled' })
	notificationsEnabled?: boolean;

	@Field(() => Boolean, { description: 'Indicates if company reviews feature is enabled' })
	companyReviewsEnabled?: boolean;

	@Field(() => Boolean, { description: 'Indicates if advanced search feature is enabled' })
	advancedSearchEnabled?: boolean;

	@Field(() => Boolean, { description: 'Indicates if AI recommendations feature is enabled' })
	aiRecommendationsEnabled?: boolean;

	@Field(() => Boolean, { description: 'Indicates if chat feature is enabled' })
	chatEnabled?: boolean;
}
