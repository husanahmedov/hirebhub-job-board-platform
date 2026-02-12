import { Field, InputType, Int, GraphQLISODateTime } from '@nestjs/graphql';
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
	IsMongoId,
	Length,
	MinLength,
	MaxLength,
	ValidateNested,
	IsDateString,
	Min,
	Max,
	Validate,
	ValidatorConstraint,
	ValidatorConstraintInterface,
	ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserStatus, UserRole, UserCountry, EmploymentType, WorkPreference } from '../../enums';

// ============================================================
// Nested Input Types (Building Blocks)
// ============================================================

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

/**
 * Custom validator to check for duplicate qualifications names
 */
@ValidatorConstraint({ name: 'UniqueQualifications', async: false })
export class UniqueQualificationsConstraint implements ValidatorConstraintInterface {
	validate(qualifications: QualificationsInput[], args: ValidationArguments) {
		if (!qualifications || !Array.isArray(qualifications)) {
			return true;
		}

		const names = qualifications.map((q) => q.profcertorawards?.toLowerCase().trim());
		const uniqueNames = new Set(names);

		return names.length === uniqueNames.size;
	}

	defaultMessage(args: ValidationArguments) {
		return 'Duplicate qualification names are not allowed. Each profcertorawards must be unique.';
	}
}

/**
 * Qualifications/Certifications input
 */
@InputType()
export class QualificationsInput {
	@IsNotEmpty()
	@IsString()
	@MaxLength(200)
	@Field(() => String, { description: 'Name of professional certification or award' })
	profcertorawards: string;

	@IsNotEmpty()
	@IsString()
	@MaxLength(200)
	@Field(() => String, { description: 'Organization that conferred the qualification' })
	conferOrganization: string;

	@IsNotEmpty()
	@IsString()
	@MaxLength(1000)
	@Field(() => String, { description: 'Summary of the qualification' })
	summary: string;

	@IsNotEmpty()
	@IsNumber()
	@Min(1900)
	@Max(new Date().getFullYear() + 1)
	@Field(() => Int, { description: 'Year the qualification was awarded' })
	year: number;
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
 * Contact info input
 */
@InputType()
export class ContactInfoInput {
	@IsOptional()
	@IsString()
	@MaxLength(20)
	@Field(() => String, { nullable: true })
	phone_number?: string;

	@IsOptional()
	@IsEmail()
	@MaxLength(255)
	@Field(() => String, { nullable: true })
	email?: string;
}

/**
 * Open to opportunities input
 */
@InputType()
export class OpenToInput {
	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true, defaultValue: false })
	work?: boolean;

	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true, defaultValue: false })
	hiring?: boolean;

	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true, defaultValue: false })
	freelance?: boolean;

	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true, defaultValue: false })
	mentorship?: boolean;
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
	@Type(() => ContactInfoInput)
	@Field(() => ContactInfoInput, { nullable: true })
	contactInfo?: ContactInfoInput;

	@IsOptional()
	@ValidateNested()
	@Type(() => OpenToInput)
	@Field(() => OpenToInput, { nullable: true })
	openTo?: OpenToInput;

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

// ============================================================
// Main Input Types (Registration, Login, Updates)
// ============================================================

/**
 * Complete user registration input - Combines all registration steps
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

	@IsNotEmpty()
	@IsEnum(UserRole)
	@Field(() => UserRole, { nullable: false })
	role: UserRole;

	@IsOptional()
	@ValidateNested()
	@Type(() => ProfileInput)
	@Field(() => ProfileInput, { nullable: true })
	profile?: ProfileInput;

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => QualificationsInput)
	@Validate(UniqueQualificationsConstraint)
	@Field(() => [QualificationsInput], { nullable: true })
	qualifications?: QualificationsInput[];

	@IsOptional()
	@ValidateNested()
	@Type(() => UserSettingsInput)
	@Field(() => UserSettingsInput, { nullable: true })
	settings?: UserSettingsInput;
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

@InputType()
export class UpdateUserAccountInput {
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
	@IsEmail()
	@Field(() => String, { nullable: true })
	contactEmail?: string;

	@IsOptional()
	@IsString()
	@MinLength(30)
	@MaxLength(200)
	@Field(() => String, { nullable: true })
	professionalHeadline?: string;

	@IsOptional()
	@IsString()
	@MinLength(6)
	@MaxLength(50)
	@Field(() => String, { nullable: true })
	publicProfileUrl?: string;

	@IsOptional()
	@IsEnum(UserCountry)
	@Field(() => String, { nullable: true })
	country?: UserCountry;

	@IsOptional()
	@IsString()
	@MinLength(6)
	@MaxLength(100)
	@Field(() => String, { nullable: true })
	website?: string;

	@IsOptional()
	@IsString()
	@MaxLength(20)
	@Field(() => String, { nullable: true })
	phoneNumber?: string;

	@IsOptional()
	@IsString()
	@MaxLength(100)
	@Field(() => String, { nullable: true })
	recoveryEmail?: string;

	@IsOptional()
	@IsString()
	@Field(() => String, { nullable: true })
	email?: string;

	// @IsOptional()
	// @IsArray()
	// @ValidateNested({ each: true })
	// @Type(() => QualificationsInput)
	// @Field(() => [QualificationsInput], { nullable: true })
	// qualifications?: QualificationsInput[];
}

/**
 * Update user basic info input
 */
@InputType()
export class UpdateUserInput {
	@IsOptional()
	@ValidateNested()
	@Type(() => UpdateUserAccountInput)
	@Field(() => UpdateUserAccountInput, { nullable: true })
	account?: UpdateUserAccountInput;
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

/**
 * Email verification input
 */
@InputType({ description: 'Email verification input' })
export class VerifyEmailInput {
	@Field(() => String, { description: 'User email address' })
	@IsEmail({}, { message: 'Invalid email address' })
	email: string;

	@Field(() => String, { description: '6-digit verification code' })
	@IsString()
	@Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
	code: string;
}

/**
 * Resend verification code input
 */
@InputType({ description: 'Resend verification code input' })
export class ResendVerificationInput {
	@Field(() => String, { description: 'User email address' })
	@IsEmail({}, { message: 'Invalid email address' })
	email: string;
}

/**
 * Refresh token input
 */
@InputType()
export class RefreshTokenInput {
	@IsNotEmpty()
	@IsString()
	@Field(() => String, { description: 'JWT refresh token to exchange for a new access token' })
	refreshToken: string;
}

/**
 * Switch company input
 */
@InputType()
export class SwitchCompanyInput {
	@Field(() => String, { description: 'Company ID to switch to' })
	@IsNotEmpty({ message: 'Company ID is required' })
	@IsMongoId({ message: 'Invalid company ID format' })
	companyId: string;
}

/***********************************************************
 * [DTO] - FILE UPLOAD INPUT
 **********************************************************/
@InputType({ description: 'Input type for uploading or updating user file' })
export class FileUploadInput {
	@Field(() => String, { description: 'URL of the uploaded file' })
	@IsNotEmpty({ message: 'File URL is required' })
	url: string;

	@Field(() => String, { description: 'Filename of the uploaded file' })
	@IsNotEmpty({ message: 'Filename is required' })
	filename: string;
}
