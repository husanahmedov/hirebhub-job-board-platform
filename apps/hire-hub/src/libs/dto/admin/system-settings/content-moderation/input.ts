import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

/**
 * Input type for updating content moderation settings
 * All fields are optional to support partial updates
 */
@InputType()
export class UpdateContentModerationInput {
    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true, description: 'Automatically moderate job posts before publishing' })
    autoModerateJobPosts?: boolean;

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true, description: 'Automatically moderate company reviews' })
    autoModerateCompanyReviews?: boolean;

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true, description: 'Enable profanity filter for user content' })
    profanityFilterEnabled?: boolean;

    @IsOptional()
    @IsNumber()
    @Field(() => Number, { nullable: true, description: 'Maximum job posts allowed per company' })
    maxJobPostsPerCompany?: number;

    @IsOptional()
    @IsNumber()
    @Field(() => Number, { nullable: true, description: 'Days until job posts automatically expire' })
    jobPostExpirationDays?: number;

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true, description: 'Require manual review approval for company reviews' })
    reviewModerationRequired?: boolean;
}