// ============================================
// * SESSION OUTPUTS
// ============================================
import { InputType, Field, ObjectType, ID } from '@nestjs/graphql';
import { IsString, IsOptional } from 'class-validator';
import { LocationOutput } from '../..';

@ObjectType()
class SessionLocationOutput {
	@Field({ nullable: true })
	country?: string;

	@Field({ nullable: true })
	region?: string;

	@Field({ nullable: true })
	city?: string;

	@Field({ nullable: true })
	latitude?: number;

	@Field({ nullable: true })
	longitude?: number;
}

@ObjectType()
export class SessionOutput {
	@Field(() => ID)
	id: string;

	@Field()
	deviceName: string;

	@Field()
	deviceType: string;

	@Field()
	browser: string;

	@Field({ nullable: true })
	os?: string;

	@Field()
	ipAddress: string;

	@Field(() => String, { nullable: true })
	location?: string;

	@Field()
	createdAt: Date;

	@Field({ nullable: true })
	lastUsedAt?: Date;

	@Field(() => Boolean, { nullable: true })
	isActive?: boolean;

	@Field(() => Boolean, { nullable: true })
	isCurrent?: boolean;

	@Field(() => String, { nullable: true })
	token?: string; // Hashed token, not exposed in API but used internally

	@Field(() => String, { nullable: true })
	userId: string; // Not exposed in API, used for internal reference

	@Field(() => SessionLocationOutput, { nullable: true })
	expiresAt?: Date;
}

@ObjectType()
export class MessageResponse {
	@Field()
	message: string;

	@Field({ defaultValue: true })
	success: boolean;
}
