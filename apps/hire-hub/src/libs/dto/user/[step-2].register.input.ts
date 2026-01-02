import { Field, InputType } from '@nestjs/graphql';
import {
	IsNotEmpty,
	IsOptional,
	IsString,
	IsEmail,
	IsEnum,
	IsBoolean,
	IsArray,
	IsUrl,
	IsNumber,
	IsDate,
	Length,
	MinLength,
	MaxLength,
	ValidateNested,
	IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserStatus, UserRole, UserCountry, LocationInput, EducationInput, ExperienceInput } from '../../index';

/**
 * User profile input
 */
@InputType()
export class ProfileInput {
	@IsOptional()
	@IsString()
	@MaxLength(200)
	@Field(() => String, { nullable: true })
	headline?: string;

	@IsOptional()
	@IsString()
	@MaxLength(2000)
	@Field(() => String, { nullable: true })
	bio?: string;

	@IsOptional()
	@ValidateNested()
	@Type(() => LocationInput)
	@Field(() => LocationInput, { nullable: false })
	location: LocationInput;

	@IsNotEmpty()
	@IsArray()
	@IsString({ each: true })
	@Field(() => [String], { nullable: false })
	skills: string[];

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => EducationInput)
	@Field(() => [EducationInput], { nullable: true })
	education?: EducationInput[];

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ExperienceInput)
	@Field(() => [ExperienceInput], { nullable: true })
	experience?: ExperienceInput[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@Field(() => [String], { nullable: true })
	socialLinks?: string[];

	@IsOptional()
	@IsString()
	@Field(() => String, { nullable: true })
	resumeId?: string;

	@IsOptional()
	@IsUrl()
	@Field(() => String, { nullable: true })
	avatarUrl?: string;

	@IsOptional()
	@IsUrl()
	@Field(() => String, { nullable: true })
	bannerUrl?: string;
}

/**
 * Update user profile input
 */
@InputType()
export class UpdateProfileInput {
	@IsOptional()
	@ValidateNested()
	@Type(() => ProfileInput)
	@Field(() => ProfileInput, { nullable: true })
	profile?: ProfileInput;
}
