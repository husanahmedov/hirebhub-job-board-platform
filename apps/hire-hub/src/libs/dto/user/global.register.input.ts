import { Field, GraphQLISODateTime, InputType } from '@nestjs/graphql';
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
import { UserStatus, UserRole, UserCountry, EmploymentType, WorkPreference } from '../../enums';

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
	@IsNumber()
	@Field(() => Number)
	startYear: number;

	@IsOptional()
	@IsNumber()
	@Field(() => Number, { nullable: true })
	endYear?: number;
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
	@IsEnum(EmploymentType)
	@Field(() => EmploymentType)
	employmentType: string;

	@IsNotEmpty()
	@IsBoolean()
	@Field(() => Boolean)
	currentlyWorkingHere: boolean;

	@IsNotEmpty()
	@IsEnum(WorkPreference)
	@Field(() => WorkPreference)
	locationType: string;

	@IsNotEmpty()
	@IsArray()
	@IsString({ each: true })
	@Field(() => [String])
	skills: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@Field(() => [String], { nullable: true })
	media?: string[];

	@IsNotEmpty()
	@IsNumber()
	@Field(() => Number)
	startDate: number;

	@IsOptional()
	@IsNumber()
	@Field(() => Number, { nullable: true })
	endDate?: number;

	@IsOptional()
	@IsString()
	@MaxLength(1000)
	@Field(() => String, { nullable: true })
	description?: string;
}
