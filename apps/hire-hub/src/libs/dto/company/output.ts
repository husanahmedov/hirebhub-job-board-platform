import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { CompanyIndustry, CompanySize, CompanyPlan } from '../../enums/company';
import { PublicUser } from '../..';
import { IsOptional } from 'class-validator';

/********************************************************************************
 * [DTO] LocationOutput - Output type for company location information
 *******************************************************************************/
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

/********************************************************************************
 * [DTO] CompanyOutput - GraphQL output type for company information
 *******************************************************************************/
@ObjectType({ description: 'Company information' })
export class CompanyOutput {
	@Field(() => ID, { description: 'Unique company identifier' })
	_id: string;

	@Field({ description: 'Company name' })
	name: string;

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

	@Field(() => ID, {
		description: 'Owner user ID - The user who owns this company',
	})
	ownerId: string;

	@IsOptional()
	@Field(() => PublicUser, {
		description: 'Owner user details',
	})
	ownerData?: PublicUser;

	@Field(() => [ID], {
		description: 'Array of recruiter user IDs associated with this company',
		nullable: true,
	})
	recruiterIds?: string[];

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

	@Field(() => Int, {
		nullable: true,
		description: 'Average minimum salary across all job postings for this company',
	})
	avgSalaryMin?: number;

	@Field(() => Int, {
		nullable: true,
		description: 'Average maximum salary across all job postings for this company',
	})
	avgSalaryMax?: number;
}

/********************************************************************************
 * [DTO] PaginatedCompaniesOutput - Output type for paginated company lists
 *******************************************************************************/
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

/********************************************************************************
 * [DTO] CompanyStatsOutput - Output type for company statistics
 *******************************************************************************/
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

/********************************************************************************
 * [DTO] LandingPageCompanyOutput - Output type for companies displayed on the landing page
 *******************************************************************************/
@ObjectType()
export class LandingPageCompanyJobProfessionOutput {
	@Field({ nullable: true, description: 'Job profession name' })
	name?: string;

	@Field(() => Int, { nullable: true, description: 'Number of open roles in this profession' })
	count?: number;
}

/********************************************************************************
 * [DTO] LandingPageCompanyOutput - Output type for companies displayed on the landing page
 *******************************************************************************/
@ObjectType()
export class LandingPageCompanyOutput {
	@Field(() => ID, { description: 'Unique company identifier' })
	_id: string;

	@Field(() => String, { description: 'Company name', nullable: true })
	name?: string;

	@Field(() => String, { description: 'Industry the company belongs to', nullable: true })
	industry?: string;

	@Field(() => String, { description: 'Job location city', nullable: true })
	city?: string;

	@Field(() => Boolean, { description: 'Whether the company is actively hiring', nullable: true })
	activelyHiring?: boolean;

	@Field(() => Int, { description: 'Number of open job roles', nullable: true })
	openRoles?: number;

	@Field(() => String, { nullable: true, description: 'Bio or tagline for the company (max 100 characters)' })
	bio?: string;

	@Field(() => [LandingPageCompanyJobProfessionOutput], {
		description: 'Job professions with open role counts, e.g. [{ name: "ENGINEERING", count: 5 }]',
		nullable: true,
	})
	jobProfessions?: LandingPageCompanyJobProfessionOutput[];

	@Field(() => [String], { nullable: true, description: 'List of key benefits offered by the company' })
	keyBenefits?: string[];

	@Field(() => Boolean, { nullable: true, description: 'Whether the company is remote-friendly' })
	isRemote?: boolean;

	@Field(() => Float, { nullable: true, description: 'Average company rating from reviews' })
	rating?: number;

	@Field(() => Int, { nullable: true, description: 'Number of employees in the company' })
	employeeCount?: number;

	@Field(() => Int, { nullable: true, description: 'Year the company was founded' })
	foundedYear?: number;

	@Field(() => String, { nullable: true, description: 'Size of the company' })
	size?: string;

	@Field(() => Int, { nullable: true, description: 'Average minimum salary across all job postings for this company' })
	avgSalaryMin?: number;

	@Field(() => Int, { nullable: true, description: 'Average maximum salary across all job postings for this company' })
	avgSalaryMax?: number;

	@Field(() => [String], {
		nullable: true,
		description: 'Most common skills required across the company’s job postings',
	})
	mostSkills?: string[]; // Add a field for most common skills required across the company's job postings
}
