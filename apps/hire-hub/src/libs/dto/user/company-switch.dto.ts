import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsMongoId } from 'class-validator';

/**
 * Input for switching active company
 */
@InputType()
export class SwitchCompanyInput {
	@Field(() => String, { description: 'Company ID to switch to' })
	@IsNotEmpty({ message: 'Company ID is required' })
	@IsMongoId({ message: 'Invalid company ID format' })
	companyId: string;
}

/**
 * Company location nested type
 */
@ObjectType()
export class CompanyLocation {
	@Field(() => String, { nullable: true })
	city?: string;

	@Field(() => String, { nullable: true })
	region?: string;

	@Field(() => String, { nullable: true })
	country?: string;
}

/**
 * Output for company list item
 */
@ObjectType()
export class CompanyListItem {
	@Field(() => String)
	_id: string;

	@Field(() => String)
	name: string;

	@Field(() => String, { nullable: true })
	logoUrl?: string;

	@Field(() => Boolean)
	verified: boolean;

	@Field(() => String, { description: 'User role in this company: owner or recruiter' })
	role: 'owner' | 'recruiter';

	@Field(() => String, { nullable: true })
	industry?: string;

	@Field(() => String, { nullable: true })
	size?: string;
}

/**
 * Output for active company details
 */
@ObjectType()
export class ActiveCompanyOutput {
	@Field(() => String)
	_id: string;

	@Field(() => String)
	name: string;

	@Field(() => String, { nullable: true })
	logoUrl?: string;

	@Field(() => Boolean)
	verified: boolean;

	@Field(() => String, { nullable: true })
	industry?: string;

	@Field(() => String, { nullable: true })
	size?: string;

	@Field(() => CompanyLocation, { nullable: true })
	location?: CompanyLocation;
}