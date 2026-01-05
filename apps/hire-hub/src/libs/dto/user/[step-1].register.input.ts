import { Field, InputType } from '@nestjs/graphql';
import {
	IsNotEmpty,
	IsOptional,
	IsString,
	IsEmail,
	IsEnum,
	IsBoolean,
	IsUrl,
	Length,
	MinLength,
	MaxLength,
	ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProfileInput } from '../../index';
import { UserStatus, UserCountry, UserRole } from '../../enums';

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

	@IsNotEmpty()
	@IsEnum(UserRole)
	@Field(() => UserRole, { nullable: false })
	role: UserRole;
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
