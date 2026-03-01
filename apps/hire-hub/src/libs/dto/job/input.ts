import { InputType, Field, Int } from '@nestjs/graphql';
import {
	IsString,
	IsEnum,
	IsOptional,
	IsBoolean,
	IsArray,
	MinLength,
	MaxLength,
	IsNumber,
	Min,
	IsDate,
	ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JobType, JobLevel, SalaryCurrency, Visibility, JobProfession } from '../../enums/job';
import { SortOrder, PaginationInput } from '../..';

/**
 * JobLocationInput - Input type for job location
 */
@InputType({ description: 'Input for job location' })
export class JobLocationInput {
	@Field({ nullable: true, description: 'City where the job is located' })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	city?: string;

	@Field({ nullable: true, description: 'Region or state' })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	region?: string;

	@Field({ nullable: true, description: 'Country where the job is located' })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	country?: string;

	@Field({ nullable: true, description: 'Whether the job is remote' })
	@IsOptional()
	@IsBoolean()
	remote?: boolean;
}

/**
 * SalaryRangeInput - Input type for salary information
 */
@InputType({ description: 'Input for salary range' })
export class SalaryRangeInput {
	@Field(() => Int, { nullable: true, description: 'Minimum salary' })
	@IsOptional()
	@IsNumber()
	@Min(0)
	min?: number;

	@Field(() => Int, { nullable: true, description: 'Maximum salary' })
	@IsOptional()
	@IsNumber()
	@Min(0)
	max?: number;

	@Field(() => SalaryCurrency, {
		nullable: true,
		description: 'Currency for salary',
	})
	@IsOptional()
	@IsEnum(SalaryCurrency)
	currency?: SalaryCurrency;

	@Field(() => Visibility, {
		nullable: true,
		description: 'Visibility of salary information',
	})
	@IsOptional()
	@IsEnum(Visibility)
	visibility?: Visibility;
}

/**
 * CreateJobInput - Input type for creating a new job
 */
@InputType({ description: 'Input for creating a new job' })
export class CreateJobInput {
	@Field({ description: 'Company ID' })
	@IsString()
	companyId: string;

	@Field({ description: 'Job title' })
	@IsString()
	@MinLength(3, { message: 'Job title must be at least 3 characters' })
	@MaxLength(200, { message: 'Job title cannot exceed 200 characters' })
	title: string;

	@Field({ nullable: true, description: 'Full job description' })
	@IsOptional()
	@IsString()
	@MaxLength(10000)
	description?: string;

	@Field({ nullable: true, description: 'Rich text job description with HTML formatting' })
	@IsOptional()
	@IsString()
	@MaxLength(50000)
	richDescription?: string;

	@Field(() => [String], { nullable: true, description: 'Short description or summary' })
	@IsOptional()
	@IsString({ each: true })
	@MaxLength(150, { each: true })
	shortDescriptions?: string[];

	@Field(() => JobType, { description: 'Employment type' })
	@IsEnum(JobType)
	employmentType: JobType;

	@Field(() => JobLevel, { description: 'Seniority level' })
	@IsEnum(JobLevel)
	seniorityLevel: JobLevel;

	@Field(() => JobLocationInput, { description: 'Job location' })
	@ValidateNested()
	@Type(() => JobLocationInput)
	location: JobLocationInput;

	@Field(() => SalaryRangeInput, {
		nullable: true,
		description: 'Salary range',
	})
	@IsOptional()
	@ValidateNested()
	@Type(() => SalaryRangeInput)
	salaryRange?: SalaryRangeInput;

	@Field(() => [String], {
		nullable: true,
		description: 'Job tags for categorization',
	})
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	tags?: string[];

	@Field(() => [String], {
		nullable: true,
		description: 'Required skills',
	})
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	skills?: string[];

	@Field(() => [String], {
		nullable: true,
		description: 'Job requirements/qualifications',
	})
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	requirements?: string[];

	@Field(() => [String], {
		nullable: true,
		description: 'Benefits offered',
	})
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	benefits?: string[];

	@Field({ nullable: true, description: 'Application deadline' })
	@IsOptional()
	@IsDate()
	@Type(() => Date)
	applicationDeadline?: Date;

	@Field({ nullable: true, description: 'Whether the job is published' })
	@IsOptional()
	@IsBoolean()
	isPublished?: boolean;

	@Field(() => Visibility, {
		nullable: true,
		description: 'Visibility level',
	})
	@IsOptional()
	@IsEnum(Visibility)
	visibility?: Visibility;

	@Field(() => [String], {
		nullable: true,
		description: 'Images or media associated with the job posting',
	})
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	images?: string[];

	@Field({ nullable: true, description: 'Whether the job is marked as urgent' })
	@IsOptional()
	@IsBoolean()
	urgent?: boolean;

	@Field({ nullable: true, description: 'Whether the job is marked as featured' })
	@IsOptional()
	@IsBoolean()
	featured?: boolean;

	@Field({ nullable: true, description: 'Whether the job allows remote work' })
	@IsOptional()
	@IsBoolean()
	isRemote?: boolean;

	@Field(() => JobProfession, {
		nullable: true,
		description: 'Job profession or category (e.g., Software Engineer, Product Manager)',
	})
	@IsOptional()
	@IsEnum(JobProfession)
	jobProfession?: JobProfession;
}

/**
 * UpdateJobInput - Input type for updating a job
 */
@InputType({ description: 'Input for updating a job' })
export class UpdateJobInput {
	@Field({ description: 'Job ID to update' })
	@IsString()
	jobId: string;

	@Field({ nullable: true, description: 'Job title' })
	@IsOptional()
	@IsString()
	@MinLength(3)
	@MaxLength(200)
	title?: string;

	@Field({ nullable: true, description: 'Full job description' })
	@IsOptional()
	@IsString()
	@MaxLength(10000)
	description?: string;

	@Field({ nullable: true, description: 'Rich text job description with HTML formatting' })
	@IsOptional()
	@IsString()
	@MaxLength(50000)
	richDescription?: string;

	@Field(() => [String], { nullable: true, description: 'Short descriptions or summaries' })
	@IsOptional()
	@IsString({ each: true })
	@MaxLength(150, { each: true })
	shortDescriptions?: string[];

	@Field(() => JobType, { nullable: true, description: 'Employment type' })
	@IsOptional()
	@IsEnum(JobType)
	employmentType?: JobType;

	@Field(() => JobLevel, { nullable: true, description: 'Seniority level' })
	@IsOptional()
	@IsEnum(JobLevel)
	seniorityLevel?: JobLevel;

	@Field(() => JobLocationInput, { nullable: true, description: 'Job location' })
	@IsOptional()
	@ValidateNested()
	@Type(() => JobLocationInput)
	location?: JobLocationInput;

	@Field(() => SalaryRangeInput, {
		nullable: true,
		description: 'Salary range',
	})
	@IsOptional()
	@ValidateNested()
	@Type(() => SalaryRangeInput)
	salaryRange?: SalaryRangeInput;

	@Field(() => [String], { nullable: true, description: 'Job tags' })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	tags?: string[];

	@Field(() => [String], { nullable: true, description: 'Required skills' })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	skills?: string[];

	@Field(() => [String], {
		nullable: true,
		description: 'Job requirements',
	})
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	requirements?: string[];

	@Field(() => [String], { nullable: true, description: 'Benefits offered' })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	benefits?: string[];

	@Field({ nullable: true, description: 'Application deadline' })
	@IsOptional()
	@IsDate()
	@Type(() => Date)
	applicationDeadline?: Date;

	@Field({ nullable: true, description: 'Whether the job is published' })
	@IsOptional()
	@IsBoolean()
	isPublished?: boolean;

	@Field(() => Visibility, { nullable: true, description: 'Visibility level' })
	@IsOptional()
	@IsEnum(Visibility)
	visibility?: Visibility;
}

/**
 * JobFilterInput - Input type for filtering jobs
 */
@InputType({ description: 'Input for filtering jobs' })
export class JobFilterInput {
	@Field({ nullable: true, description: 'Search query for title and description' })
	@IsOptional()
	@IsString()
	search?: string;

	@Field({ nullable: true, description: 'Filter by company ID' })
	@IsOptional()
	@IsString()
	companyId?: string;

	@Field(() => [JobType], {
		nullable: true,
		description: 'Filter by employment types',
	})
	@IsOptional()
	@IsArray()
	@IsEnum(JobType, { each: true })
	employmentTypes?: JobType[];

	@Field(() => [JobLevel], {
		nullable: true,
		description: 'Filter by seniority levels',
	})
	@IsOptional()
	@IsArray()
	@IsEnum(JobLevel, { each: true })
	seniorityLevels?: JobLevel[];

	@Field({ nullable: true, description: 'Filter by city' })
	@IsOptional()
	@IsString()
	city?: string;

	@Field({ nullable: true, description: 'Filter by country' })
	@IsOptional()
	@IsString()
	country?: string;

	@Field({ nullable: true, description: 'Filter remote jobs only' })
	@IsOptional()
	@IsBoolean()
	remote?: boolean;

	@Field(() => [String], { nullable: true, description: 'Filter by tags' })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	tags?: string[];

	@Field(() => [String], { nullable: true, description: 'Filter by skills' })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	skills?: string[];

	@Field({ nullable: true, description: 'Filter by published status' })
	@IsOptional()
	@IsBoolean()
	isPublished?: boolean;

	@Field(() => Visibility, { nullable: true, description: 'Filter by visibility' })
	@IsOptional()
	@IsEnum(Visibility)
	visibility?: Visibility;

	@Field({ nullable: true, description: 'Filter jobs with salary info' })
	@IsOptional()
	@IsBoolean()
	hasSalary?: boolean;
}

/**
 * JobSortInput - Input type for sorting jobs
 */
@InputType({ description: 'Input for sorting jobs' })
export class JobSortInput {
	@Field({
		nullable: true,
		description: 'Field to sort by (createdAt, title, viewsCount, applicationsCount)',
	})
	@IsOptional()
	@IsString()
	field?: string;

	@Field({ nullable: true, description: 'Sort order (asc or desc)' })
	@IsOptional()
	@IsString()
	order?: 'asc' | 'desc';
}

/**
 * PaginationInput - Input type for pagination
 */
@InputType({ description: 'Input for pagination' })
export class JobPaginationInput {
	@Field(() => Int, { nullable: true, description: 'Page number (starts from 1)' })
	@IsOptional()
	@IsNumber()
	@Min(1)
	page?: number;

	@Field(() => Int, { nullable: true, description: 'Number of items per page' })
	@IsOptional()
	@IsNumber()
	@Min(1)
	limit?: number;
}

/**
 * GetJobsInput - Main input type for querying jobs
 */
@InputType({ description: 'Input for getting jobs with filters, sorting, and pagination' })
export class GetJobsInput {
	@Field(() => JobFilterInput, { nullable: true, description: 'Filter criteria' })
	@IsOptional()
	@ValidateNested()
	@Type(() => JobFilterInput)
	filter?: JobFilterInput;

	@Field(() => JobSortInput, { nullable: true, description: 'Sort options' })
	@IsOptional()
	@ValidateNested()
	@Type(() => JobSortInput)
	sort?: JobSortInput;

	@Field(() => JobPaginationInput, { nullable: true, description: 'Pagination options' })
	@IsOptional()
	@ValidateNested()
	@Type(() => JobPaginationInput)
	pagination?: JobPaginationInput;
}
