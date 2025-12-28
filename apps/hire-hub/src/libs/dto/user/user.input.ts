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
import { UserStatus, UserRole } from '../../enums/user.enum';

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
	@IsOptional()
	@IsString()
	@MaxLength(100)
	@Field(() => String, { nullable: true })
	city?: string;

	@IsOptional()
	@IsString()
	@MaxLength(100)
	@Field(() => String, { nullable: true })
	region?: string;

	@IsOptional()
	@IsString()
	@MaxLength(100)
	@Field(() => String, { nullable: true })
	country?: string;

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
	@Field(() => LocationInput, { nullable: true })
	location?: LocationInput;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@Field(() => [String], { nullable: true })
	skills?: string[];

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
 * OAuth provider input
 */
@InputType()
export class OAuthProviderInput {
	@IsNotEmpty()
	@IsString()
	@Field(() => String)
	provider: string;

	@IsNotEmpty()
	@IsString()
	@Field(() => String)
	providerId: string;

	@IsOptional()
	@IsUrl()
	@Field(() => String, { nullable: true })
	profileUrl?: string;
}

/**
 * Notification settings input
 */
@InputType()
export class NotificationSettingsInput {
	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true, defaultValue: true })
	email?: boolean;

	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true, defaultValue: false })
	push?: boolean;
}

/**
 * User settings input
 */
@InputType()
export class UserSettingsInput {
	@IsOptional()
	@IsString()
	@Length(2, 5)
	@Field(() => String, { nullable: true, defaultValue: 'en' })
	language?: string;

	@IsOptional()
	@IsString()
	@Field(() => String, { nullable: true, defaultValue: 'UTC' })
	timezone?: string;

	@IsOptional()
	@ValidateNested()
	@Type(() => NotificationSettingsInput)
	@Field(() => NotificationSettingsInput, { nullable: true })
	notifications?: NotificationSettingsInput;
}

/**
 * Complete user registration input
 */
@InputType()
export class RegisterUserInput {
	@IsNotEmpty()
	@IsEmail()
	@Field(() => String)
	email: string;

	@IsNotEmpty()
	@IsString()
	@MinLength(8)
	@MaxLength(100)
	@Field(() => String)
	passwordHash: string;

	@IsNotEmpty()
	@IsString()
	@MinLength(2)
	@MaxLength(50)
	@Field(() => String)
	firstName: string;

	@IsNotEmpty()
	@IsString()
	@MinLength(2)
	@MaxLength(50)
	@Field(() => String)
	lastName: string;

	@IsOptional()
	@IsEnum(UserRole)
	@Field(() => String, { nullable: true, defaultValue: UserRole.CANDIDATE })
	role?: UserRole;
}

/**
 * User login input
 */
@InputType()
export class LoginUserInput {
	@IsNotEmpty()
	@IsEmail()
	@Field(() => String)
	email: string;

	@IsNotEmpty()
	@IsString()
	@Field(() => String)
	passwordHash: string;
}

/**
 * Update user basic info input
 */
@InputType()
export class UpdateUserInput {
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(50)
	@Field(() => String, { nullable: true })
	firstName?: string;

	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(50)
	@Field(() => String, { nullable: true })
	lastName?: string;

	@IsOptional()
	@IsEnum(UserRole)
	@Field(() => String, { nullable: true })
	role?: UserRole;

	@IsOptional()
	@IsEnum(UserStatus)
	@Field(() => String, { nullable: true })
	status?: UserStatus;
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

/**
 * Update user settings input
 */
@InputType()
export class UpdateSettingsInput {
	@IsOptional()
	@ValidateNested()
	@Type(() => UserSettingsInput)
	@Field(() => UserSettingsInput, { nullable: true })
	settings?: UserSettingsInput;
}

/**
 * Change password input
 */
@InputType()
export class ChangePasswordInput {
	@IsNotEmpty()
	@IsString()
	@Field(() => String)
	currentPassword: string;

	@IsNotEmpty()
	@IsString()
	@MinLength(8)
	@MaxLength(100)
	@Field(() => String)
	newPassword: string;
}

/**
 * Email verification input
 */
@InputType()
export class VerifyEmailInput {
	@IsNotEmpty()
	@IsString()
	@Field(() => String)
	token: string;
}

/**
 * Password reset request input
 */
@InputType()
export class ForgotPasswordInput {
	@IsNotEmpty()
	@IsEmail()
	@Field(() => String)
	email: string;
}

/**
 * Password reset input
 */
@InputType()
export class ResetPasswordInput {
	@IsNotEmpty()
	@IsString()
	@Field(() => String)
	token: string;

	@IsNotEmpty()
	@IsString()
	@MinLength(8)
	@MaxLength(100)
	@Field(() => String)
	newPassword: string;
}
