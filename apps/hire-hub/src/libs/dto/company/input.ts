import { InputType, Field, Int, Float } from '@nestjs/graphql';
import {
	IsString,
	IsEnum,
	IsOptional,
	IsBoolean,
	IsArray,
	MinLength,
	MaxLength,
	IsUrl,
	IsNumber,
	Min,
	Max,
} from 'class-validator';
import { CompanyIndustry, CompanySize, CompanyPlan } from '../../enums/company';

/**
 * LocationInput - Input type for company location
 */
@InputType({ description: 'Input for company location with geospatial data' })
export class CompanyLocationInput {
	@Field({ nullable: true, description: 'Street address of the company' })
	@IsOptional()
	@IsString()
	@MaxLength(255)
	address?: string;

	@Field({ nullable: true, description: 'City where the company is located' })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	city?: string;

	@Field({ nullable: true, description: 'State or province' })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	state?: string;

	@Field({ nullable: true, description: 'Country where the company is located' })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	country?: string;

	@Field({ nullable: true, description: 'Postal/ZIP code' })
	@IsOptional()
	@IsString()
	@MaxLength(20)
	zipCode?: string;

	@Field(() => [Float], {
		nullable: true,
		description: 'GeoJSON coordinates [longitude, latitude]',
	})
	@IsOptional()
	@IsArray()
	coordinates?: number[];
}

/**
 * CreateCompanyInput - Input type for creating a new company
 */
@InputType({ description: 'Input for creating a new company' })
export class CreateCompanyInput {
	@Field({ description: 'Company name' })
	@IsString()
	@MinLength(2, { message: 'Company name must be at least 2 characters' })
	@MaxLength(200, { message: 'Company name cannot exceed 200 characters' })
	name: string;

	@Field({ description: 'URL-friendly slug for the company' })
	@IsString()
	@MinLength(2)
	@MaxLength(250)
	slug: string;

	@Field({ description: 'Owner user ID - The user who owns this company' })
	@IsString()
	ownerId: string;

	@Field(() => CompanyIndustry, {
		nullable: true,
		description: 'Industry classification',
	})
	@IsOptional()
	@IsEnum(CompanyIndustry)
	industry?: CompanyIndustry;

	@Field(() => CompanySize, {
		nullable: true,
		description: 'Company size based on employee count',
	})
	@IsOptional()
	@IsEnum(CompanySize)
	size?: CompanySize;

	@Field({ nullable: true, description: 'Detailed company description' })
	@IsOptional()
	@IsString()
	@MaxLength(5000, { message: 'Description cannot exceed 5000 characters' })
	description?: string;

	@Field({ nullable: true, description: 'Company website URL' })
	@IsOptional()
	@IsUrl({}, { message: 'Please provide a valid website URL' })
	@MaxLength(500)
	website?: string;

	@Field(() => CompanyLocationInput, {
		nullable: true,
		description: 'Company location with geospatial data',
	})
	@IsOptional()
	location?: CompanyLocationInput;

	@Field({ nullable: true, description: 'URL to company logo image' })
	@IsOptional()
	@IsUrl()
	@MaxLength(1000)
	logoUrl?: string;

	@Field(() => [String], {
		nullable: true,
		description: 'Array of recruiter user IDs',
	})
	@IsOptional()
	@IsArray()
	recruiterIds?: string[];
}

/**
 * UpdateCompanyInput - Input type for updating an existing company
 */
@InputType({ description: 'Input for updating an existing company' })
export class UpdateCompanyInput {
	@Field({ nullable: true, description: 'Company name' })
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(200)
	name?: string;

	@Field({ nullable: true, description: 'URL-friendly slug' })
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(250)
	slug?: string;

	@Field(() => CompanyIndustry, {
		nullable: true,
		description: 'Industry classification',
	})
	@IsOptional()
	@IsEnum(CompanyIndustry)
	industry?: CompanyIndustry;

	@Field(() => CompanySize, {
		nullable: true,
		description: 'Company size',
	})
	@IsOptional()
	@IsEnum(CompanySize)
	size?: CompanySize;

	@Field({ nullable: true, description: 'Company description' })
	@IsOptional()
	@IsString()
	@MaxLength(5000)
	description?: string;

	@Field({ nullable: true, description: 'Company website URL' })
	@IsOptional()
	@IsUrl()
	@MaxLength(500)
	website?: string;

	@Field(() => CompanyLocationInput, { nullable: true })
	@IsOptional()
	location?: CompanyLocationInput;

	@Field({ nullable: true, description: 'Company logo URL' })
	@IsOptional()
	@IsUrl()
	@MaxLength(1000)
	logoUrl?: string;

	@Field(() => [String], { nullable: true })
	@IsOptional()
	@IsArray()
	recruiterIds?: string[];

	@Field({ nullable: true, description: 'Verification status' })
	@IsOptional()
	@IsBoolean()
	verified?: boolean;

	@Field(() => CompanyPlan, { nullable: true })
	@IsOptional()
	@IsEnum(CompanyPlan)
	plan?: CompanyPlan;
}

/**
 * CompanyFilterInput - Input type for filtering companies
 * Used in queries to filter company results
 */
@InputType({ description: 'Input for filtering companies' })
export class CompanyFilterInput {
	@Field({ nullable: true, description: 'Search by company name or description' })
	@IsOptional()
	@IsString()
	search?: string;

	@Field(() => [CompanyIndustry], {
		nullable: true,
		description: 'Filter by industries',
	})
	@IsOptional()
	@IsArray()
	@IsEnum(CompanyIndustry, { each: true })
	industries?: CompanyIndustry[];

	@Field(() => [CompanySize], {
		nullable: true,
		description: 'Filter by company sizes',
	})
	@IsOptional()
	@IsArray()
	@IsEnum(CompanySize, { each: true })
	sizes?: CompanySize[];

	@Field(() => [CompanyPlan], {
		nullable: true,
		description: 'Filter by subscription plans',
	})
	@IsOptional()
	@IsArray()
	@IsEnum(CompanyPlan, { each: true })
	plans?: CompanyPlan[];

	@Field({ nullable: true, description: 'Filter by verification status' })
	@IsOptional()
	@IsBoolean()
	verified?: boolean;

	@Field({ nullable: true, description: 'Filter by city' })
	@IsOptional()
	@IsString()
	city?: string;

	@Field({ nullable: true, description: 'Filter by country' })
	@IsOptional()
	@IsString()
	country?: string;

	@Field({ nullable: true, description: 'Filter by recruiter ID' })
	@IsOptional()
	@IsString()
	recruiterId?: string;

	@Field({ nullable: true, description: 'Include soft-deleted companies' })
	@IsOptional()
	@IsBoolean()
	includeDeleted?: boolean;
}

/**
 * CompanySortInput - Input type for sorting companies
 */
export enum CompanySortField {
	NAME = 'name',
	CREATED_AT = 'createdAt',
	UPDATED_AT = 'updatedAt',
	JOB_COUNT = 'jobCount',
	REVIEW_COUNT = 'reviewCount',
	AVERAGE_RATING = 'averageRating',
}

export enum SortOrder {
	ASC = 'asc',
	DESC = 'desc',
}

@InputType({ description: 'Input for sorting companies' })
export class CompanySortInput {
	@Field(() => String, {
		nullable: true,
		description: 'Field to sort by',
		defaultValue: CompanySortField.CREATED_AT,
	})
	@IsOptional()
	@IsEnum(CompanySortField)
	field?: CompanySortField;

	@Field(() => String, {
		nullable: true,
		description: 'Sort order (asc/desc)',
		defaultValue: SortOrder.DESC,
	})
	@IsOptional()
	@IsEnum(SortOrder)
	order?: SortOrder;
}

/**
 * CompanyPaginationInput - Input type for pagination
 */
@InputType({ description: 'Input for pagination' })
export class CompanyPaginationInput {
	@Field(() => Int, {
		nullable: true,
		description: 'Page number (starting from 1)',
		defaultValue: 1,
	})
	@IsOptional()
	@IsNumber()
	@Min(1)
	page?: number;

	@Field(() => Int, {
		nullable: true,
		description: 'Number of items per page',
		defaultValue: 10,
	})
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Max(100)
	limit?: number;
}

/**
 * GetCompaniesInput - Combined input for getting companies with filtering, sorting, and pagination
 */
@InputType({ description: 'Input for getting companies with filters, sorting, and pagination' })
export class GetCompaniesInput {
	@Field(() => CompanyFilterInput, {
		nullable: true,
		description: 'Filters to apply',
	})
	@IsOptional()
	filter?: CompanyFilterInput;

	@Field(() => CompanySortInput, {
		nullable: true,
		description: 'Sorting options',
	})
	@IsOptional()
	sort?: CompanySortInput;

	@Field(() => CompanyPaginationInput, {
		nullable: true,
		description: 'Pagination options',
	})
	@IsOptional()
	pagination?: CompanyPaginationInput;

	@IsOptional()
	ownerId?: string;
}

/**
 * NearbyCompaniesInput - Input for finding companies near a location
 */
@InputType({ description: 'Input for finding companies near a location' })
export class NearbyCompaniesInput {
	@Field(() => Float, { description: 'Longitude of the search center' })
	@IsNumber()
	@Min(-180)
	@Max(180)
	longitude: number;

	@Field(() => Float, { description: 'Latitude of the search center' })
	@IsNumber()
	@Min(-90)
	@Max(90)
	latitude: number;

	@Field(() => Int, {
		nullable: true,
		description: 'Maximum distance in kilometers',
		defaultValue: 50,
	})
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Max(1000)
	maxDistance?: number;

	@Field(() => CompanyPaginationInput, {
		nullable: true,
		description: 'Pagination options',
	})
	@IsOptional()
	pagination?: CompanyPaginationInput;
}
