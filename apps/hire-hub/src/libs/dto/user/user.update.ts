import { Field, InputType } from '@nestjs/graphql';
import {
	IsNotEmpty,
	IsOptional,
	IsString,
	IsEnum,
	MinLength,
	MaxLength,
	ValidateNested,
	IsDateString,
	IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserStatus, UserRole, UserCountry } from '../../enums';
import {UpdateProfileInput, ProfileInput} from './';

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
	@IsEmail()
	@Field(() => String, { nullable: true })
	email?: string;

	@IsOptional()
	@IsEnum(UserStatus)
	@Field(() => String, { nullable: true })
	status?: UserStatus;

	@IsOptional()
	@ValidateNested()
	@Type(() => ProfileInput)
	@Field(() => ProfileInput, { nullable: true })
	profile?: ProfileInput;
}
