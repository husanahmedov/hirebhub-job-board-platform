import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { CompanyIndustry, CompanySize, CompanyPlan } from '../../enums/company';

/**
 * LocationOutput - GraphQL output type for company location
 */
@ObjectType({ description: 'Company location information with geospatial data' })
export class LocationOutput {
	@Field({ nullable: true, description: 'Street address of the company' })
	address?: string;

	@Field({ nullable: true, description: 'City where the company is located' })
	city?: string;

	@Field({ nullable: true, description: 'State or province' })
	state?: string;

	@Field({ nullable: true, description: 'Country where the company is located' })
	country?: string;

	@Field({ nullable: true, description: 'Postal/ZIP code' })
	zipCode?: string;

	@Field(() => [Float], {
		nullable: true,
		description: 'GeoJSON coordinates [longitude, latitude]',
	})
	coordinates?: number[];
}

/**
 * CompanyOutput - Main GraphQL output type for company data
 * Used when returning company information to clients
 */
@ObjectType({ description: 'Company information' })
export class CompanyOutput {
	@Field(() => ID, { description: 'Unique company identifier' })
	_id: string;

	@Field({ description: 'Company name' })
	name: string;

	@Field({ description: 'URL-friendly slug for the company' })
	slug: string;

	@Field(() => CompanyIndustry, {
		nullable: true,
		description: 'Industry classification',
	})
	industry?: CompanyIndustry;

	@Field(() => CompanySize, {
		nullable: true,
		description: 'Company size based on employee count',
	})
	size?: CompanySize;

	@Field({ nullable: true, description: 'Detailed company description' })
	description?: string;

	@Field({ nullable: true, description: 'Company website URL' })
	website?: string;

	@Field(() => LocationOutput, {
		nullable: true,
		description: 'Company location with geospatial data',
	})
	location?: LocationOutput;

	@Field({ nullable: true, description: 'URL to company logo image' })
	logoUrl?: string;

	@Field(() => [ID], {
		description: 'Array of recruiter user IDs associated with this company',
	})
	recruiterIds: string[];

	@Field({ description: 'Company verification status' })
	verified: boolean;

	@Field(() => CompanyPlan, { description: 'Subscription plan level' })
	plan: CompanyPlan;

	@Field({ description: 'Date when the company was created' })
	createdAt: Date;

	@Field({ description: 'Date when the company was last updated' })
	updatedAt: Date;

	@Field({ nullable: true, description: 'Soft delete timestamp' })
	deletedAt?: Date;

	// Virtual fields
	@Field(() => Int, {
		nullable: true,
		description: 'Number of active jobs posted by this company',
	})
	jobCount?: number;

	@Field(() => Int, {
		nullable: true,
		description: 'Number of reviews received by this company',
	})
	reviewCount?: number;

	@Field(() => Float, {
		nullable: true,
		description: 'Average rating from all company reviews',
	})
	averageRating?: number;
}

/**
 * PaginatedCompaniesOutput - Output type for paginated company lists
 */
@ObjectType({ description: 'Paginated list of companies' })
export class PaginatedCompaniesOutput {
	@Field(() => [CompanyOutput], { description: 'List of companies' })
	companies: CompanyOutput[];

	@Field(() => Int, { description: 'Total number of companies matching the query' })
	totalCount: number;

	@Field(() => Int, { description: 'Current page number' })
	page: number;

	@Field(() => Int, { description: 'Number of items per page' })
	limit: number;

	@Field(() => Int, { description: 'Total number of pages' })
	totalPages: number;

	@Field({ description: 'Whether there is a next page' })
	hasNextPage: boolean;

	@Field({ description: 'Whether there is a previous page' })
	hasPreviousPage: boolean;
}

/**
 * CompanyStatsOutput - Statistics about companies
 */
@ObjectType({ description: 'Company statistics' })
export class CompanyStatsOutput {
	@Field(() => Int, { description: 'Total number of companies' })
	totalCompanies: number;

	@Field(() => Int, { description: 'Number of verified companies' })
	verifiedCompanies: number;

	@Field(() => Int, { description: 'Number of companies by industry' })
	byIndustry: { [key: string]: number };

	@Field(() => Int, { description: 'Number of companies by size' })
	bySize: { [key: string]: number };

	@Field(() => Int, { description: 'Number of companies by plan' })
	byPlan: { [key: string]: number };
}
