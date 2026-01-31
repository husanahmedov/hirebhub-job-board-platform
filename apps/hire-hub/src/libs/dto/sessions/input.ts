// ============================================
// * SESSION INPUTS
// ============================================
import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { IsString, IsOptional } from 'class-validator';

@InputType()
class SessionLocationInput {
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

@InputType()
export class SessionInput {
	@Field()
	@IsString()
	userId: string;

	@Field()
	@IsString()
	deviceName: string;

	@Field()
	@IsString()
	deviceType: string;

	@Field()
	@IsString()
	browser: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	os?: string;

	@Field()
	@IsString()
	ipAddress: string;

	@Field(() => String, { nullable: true })
	location?: string;
}
