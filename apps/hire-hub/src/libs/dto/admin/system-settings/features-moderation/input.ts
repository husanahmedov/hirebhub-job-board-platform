import { InputType, Field } from '@nestjs/graphql';
import { IsBoolean, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class FeaturesModerationSettingsInput {
	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true })
	bookmarksEnabled?: boolean;

	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true })
	notificationsEnabled?: boolean;

	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true })
	companyReviewsEnabled?: boolean;

	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true })
	advancedSearchEnabled?: boolean;

	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true })
	aiRecommendationsEnabled?: boolean;

	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true })
	chatEnabled?: boolean;
}
