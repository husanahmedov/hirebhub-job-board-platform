import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Refresh Token Input
 *
 * Used to request a new access token using a refresh token.
 */
@InputType()
export class RefreshTokenInput {
	@IsNotEmpty()
	@IsString()
	@Field(() => String, { description: 'JWT refresh token to exchange for a new access token' })
	refreshToken: string;
}
