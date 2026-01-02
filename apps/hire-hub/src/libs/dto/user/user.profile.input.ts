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
import { UserStatus, UserRole, UserCountry } from '../../index';

/**
 * Geographic coordinates input for location
 */
@InputType()
export class GeoCoordinatesInput {
	@IsOptional()
	@IsString()
	@Field(() => String, { nullable: true, defaultValue: 'Point' })
	type?: string;

	@IsOptional()
	@IsArray()
	@IsNumber({}, { each: true })
	@Field(() => [Number], { nullable: true, description: '[longitude, latitude]' })
	coordinates?: number[];
}

/**
 * Location input with geographic data
 */
@InputType()
export class LocationInput {
	@IsNotEmpty()
	@IsString()
	@MaxLength(100)
	@Field(() => String, { nullable: false })
	city: string;

	@IsNotEmpty()
	@IsString()
	@MaxLength(100)
	@Field(() => String, { nullable: false })
	region: string;

	@IsNotEmpty()
	@IsEnum(UserCountry)
	@Field(() => UserCountry, { nullable: false })
	country: UserCountry;

	@IsOptional()
	@ValidateNested()
	@Type(() => GeoCoordinatesInput)
	@Field(() => GeoCoordinatesInput, { nullable: true })
	geo?: GeoCoordinatesInput;
}

/**
 * Education entry input
 */
@InputType()
export class EducationInput {
	@IsNotEmpty()
	@IsString()
	@MaxLength(200)
	@Field(() => String)
	school: string;

	@IsNotEmpty()
	@IsString()
	@MaxLength(100)
	@Field(() => String)
	degree: string;

	@IsOptional()
	@IsString()
	@MaxLength(100)
	@Field(() => String, { nullable: true })
	fieldOfStudy?: string;

	@IsNotEmpty()
	@IsDateString()
	@Field(() => Date)
	startYear: Date;

	@IsOptional()
	@IsDateString()
	@Field(() => Date, { nullable: true })
	endYear?: Date;
}

/**
 * Work experience entry input
 */
@InputType()
export class ExperienceInput {
	@IsNotEmpty()
	@IsString()
	@MaxLength(200)
	@Field(() => String)
	company: string;

	@IsNotEmpty()
	@IsString()
	@MaxLength(100)
	@Field(() => String)
	title: string;

	@IsOptional()
	@IsString()
	@MaxLength(200)
	@Field(() => String, { nullable: true })
	location?: string;

	@IsNotEmpty()
	@IsDateString()
	@Field(() => Date)
	startDate: Date;

	@IsOptional()
	@IsDateString()
	@Field(() => Date, { nullable: true })
	endDate?: Date;

	@IsOptional()
	@IsString()
	@MaxLength(1000)
	@Field(() => String, { nullable: true })
	description?: string;
}

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
