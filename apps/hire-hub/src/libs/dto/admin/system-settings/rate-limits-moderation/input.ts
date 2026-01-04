import { InputType, Field } from '@nestjs/graphql';
import { IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class RateLimitsSettingsInput {
    @IsOptional()
    @IsNumber()
    @Field(() => Number, { nullable: true })
    maxApplicationsPerDay?: number;

    @IsOptional()
    @IsNumber()
    @Field(() => Number, { nullable: true })
    maxJobPostsPerMonth?: number;

    @IsOptional()
    @IsNumber()
    @Field(() => Number, { nullable: true })
    maxResumeUploads?: number;

    @IsOptional()
    @IsNumber()
    @Field(() => Number, { nullable: true })
    apiRateLimitPerMinute?: number;

    @IsOptional()
    @IsNumber()
    @Field(() => Number, { nullable: true })
    bulkOperationLimit?: number;
}
