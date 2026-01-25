import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { JobType, JobLevel, SalaryCurrency, Visibility } from '../../enums/job';
import { CompanyOutput } from '../company/output';
import { ApplicationOutput, PublicUser } from '../../';

/**
 * JobLocationOutput - GraphQL output type for job location
 */
@ObjectType({ description: 'Job location information' })
export class JobLocationOutput {
	@Field({ nullable: true, description: 'City where the job is located' })
	city?: string;

	@Field({ nullable: true, description: 'Region or state' })
	region?: string;

	@Field({ nullable: true, description: 'Country where the job is located' })
	country?: string;

	@Field({ description: 'Whether the job is remote' })
	remote: boolean;
}

/**
 * SalaryRangeOutput - GraphQL output type for salary information
 */
@ObjectType({ description: 'Salary range information' })
export class SalaryRangeOutput {
	@Field(() => Int, { nullable: true, description: 'Minimum salary' })
	min?: number;

	@Field(() => Int, { nullable: true, description: 'Maximum salary' })
	max?: number;

	@Field(() => SalaryCurrency, { description: 'Currency for salary' })
	currency: SalaryCurrency;

	@Field(() => Visibility, { description: 'Visibility of salary information' })
	visibility: Visibility;
}

@ObjectType({ description: 'Job metrics information' })
export class JobMetrics {
	@Field(() => Int, { description: 'Number of views' })
	viewsCount: number;

	@Field(() => Int, { description: 'Number of applications' })
	applicationsCount: number;

	@Field(() => Int, { nullable: true, description: 'Application rate percentage' })
	applicationRate?: number;
}

@ObjectType({ description: 'Job time information' })
export class JobTimeInfo {
	@Field(() => Int, { nullable: true, description: 'Days since the job was posted' })
	daysSincePosted?: number;

	@Field(() => Int, { nullable: true, description: 'Days until the application deadline' })
	daysUntilDeadline?: number;

	@Field(() => Boolean, { nullable: true, description: 'Whether the job is expiring soon' })
	isExpiringSoon?: boolean;
}

@ObjectType({ description: 'Job flags information' })
export class JobFlags {
	@Field(() => Boolean, { description: 'Whether the job is popular' })
	isPopular?: boolean;

	@Field(() => Boolean, { description: 'Whether the job is hot' })
	isHot?: boolean;

	@Field(() => Boolean, { description: 'Whether the job needs promotion' })
	needsPromotion?: boolean;

	@Field(() => Boolean, { description: 'Whether the job has salary information' })
	hasSalary?: boolean;
}

/**
 * JobOutput - Main GraphQL output type for job data
 */
@ObjectType({ description: 'Job posting information' })
export class JobOutput {
	@Field(() => ID, { description: 'Unique job identifier' })
	_id: string;

	@Field(() => ID, { description: 'Company ID' })
	companyId: string;

	@Field(() => CompanyOutput, {
		nullable: true,
		description: 'Company details',
	})
	companyData?: CompanyOutput;

	@Field(() => ID, { description: 'User ID who posted this job' })
	postedBy: string;

	@Field(() => PublicUser, {
		nullable: true,
		description: 'User who posted this job',
	})
	postedByData?: PublicUser;

	@Field({ description: 'Job title' })
	title: string;

	@Field({ nullable: true, description: 'Full job description' })
	description?: string;

	@Field({ nullable: true, description: 'Rich text job description with HTML formatting' })
	richDescription?: string;

	@Field(() => [String], { nullable: true, description: 'Short descriptions or summaries' })
	shortDescriptions?: string[];

	@Field(() => JobType, { description: 'Employment type' })
	employmentType: JobType;

	@Field(() => JobLevel, { description: 'Seniority level' })
	seniorityLevel: JobLevel;

	@Field(() => JobLocationOutput, { description: 'Job location' })
	location: JobLocationOutput;

	@Field(() => SalaryRangeOutput, {
		nullable: true,
		description: 'Salary range',
	})
	salaryRange?: SalaryRangeOutput;

	@Field(() => [String], { description: 'Job tags' })
	tags: string[];

	@Field(() => [String], { description: 'Required skills' })
	skills: string[];

	@Field(() => [String], { description: 'Job requirements' })
	requirements: string[];

	@Field(() => [String], { description: 'Benefits offered' })
	benefits: string[];

	@Field({ nullable: true, description: 'Application deadline' })
	applicationDeadline?: Date;

	@Field({ description: 'Whether the job is published' })
	isPublished: boolean;

	@Field(() => Visibility, { description: 'Visibility level' })
	visibility: Visibility;

	@Field(() => JobMetrics, { description: 'Job metrics data', nullable: true })
	metrics?: JobMetrics;

	@Field(() => Int, { nullable: true, description: 'Engagement score for the job' })
	engagementScore?: number;

	@Field(() => JobTimeInfo, { nullable: true, description: 'Job time related information' })
	timeInfo?: JobTimeInfo;

	@Field(() => JobFlags, { nullable: true, description: 'Job flags information' })
	flags?: JobFlags;

	@Field(() => Boolean, { nullable: true, description: 'Whether the job is trending' })
	trending?: boolean;

	@Field(() => Boolean, { nullable: true, description: 'Whether the job is featured' })
	featured?: boolean;

	@Field(() => Boolean, { nullable: true, description: 'Whether the job is urgent' })
	urgent?: boolean;

	@Field(() => ApplicationOutput, {
		nullable: true,
		description: 'Application details if the current user has applied',
	})
	applicationsData?: ApplicationOutput;

	@Field({ description: 'Date when the job was created' })
	createdAt: Date;

	@Field({ description: 'Date when the job was last updated' })
	updatedAt: Date;

	@Field({ nullable: true, description: 'Date when the job was closed' })
	closedAt?: Date;

	@Field({ nullable: true, description: 'Soft delete timestamp' })
	deletedAt?: Date;
}

/**
 * PaginatedJobsOutput - Output type for paginated job lists
 */
@ObjectType({ description: 'Paginated list of jobs' })
export class PaginatedJobsOutput {
	@Field(() => [JobOutput], { description: 'List of jobs' })
	jobs: JobOutput[];

	@Field(() => Int, { description: 'Total number of jobs matching the query' })
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
 * JobStatsOutput - Output type for job statistics
 */
@ObjectType({ description: 'Job statistics' })
export class JobStatsOutput {
	@Field(() => Int, { description: 'Total number of jobs' })
	totalJobs: number;

	@Field(() => Int, { description: 'Number of published jobs' })
	publishedJobs: number;

	@Field(() => Int, { description: 'Number of draft jobs' })
	draftJobs: number;

	@Field(() => Int, { description: 'Number of closed jobs' })
	closedJobs: number;

	@Field(() => Int, { description: 'Total number of applications' })
	totalApplications: number;

	@Field(() => Int, { description: 'Total number of views' })
	totalViews: number;

	@Field(() => Int, { description: 'Number of applications in the last 30 days' })
	last30DaysApplications?: number;

	@Field(() => Int, { description: 'Number of views in the last 30 days' })
	last30DaysViews?: number;
}
