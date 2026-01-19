import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsString, Length } from 'class-validator';

/**
 * Input type for email verification
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
 * Input type for resending verification code
 */
@InputType({ description: 'Resend verification code input' })
export class ResendVerificationInput {
	@Field(() => String, { description: 'User email address' })
	@IsEmail({}, { message: 'Invalid email address' })
	email: string;
}

