import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JobService } from './job.service';
import {
	JobOutput,
	PaginatedJobsOutput,
	JobStatsOutput,
	CreateJobInput,
	UpdateJobInput,
	GetJobsInput,
	User,
} from '../../libs';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../libs';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthUser } from '../auth/decorators/authUser.decorator';

/**
 * JobResolver - GraphQL resolver for job queries and mutations
 *
 * This resolver exposes GraphQL endpoints for:
 * - Querying jobs with advanced filtering, sorting, and pagination
 * - Getting individual jobs by ID or slug
 * - Creating, updating, and deleting jobs
 * - Closing jobs (marking as filled)
 * - Getting job statistics
 *
 * @see JobService for business logic implementation
 */
@Resolver()
export class JobResolver {
	constructor(private readonly jobService: JobService) {}

	/**
	 * Query: Get jobs with filters, sorting, and pagination
	 *
	 * @example GraphQL Query:
	 * ```graphql
	 * query GetJobs {
	 *   getJobs(
	 *     input: {
	 *       filter: {
	 *         search: "developer"
	 *         employmentTypes: [FULL_TIME, REMOTE]
	 *         seniorityLevels: [SENIOR, MIDDLE]
	 *         city: "San Francisco"
	 *         remote: true
	 *         tags: ["JavaScript", "React"]
	 *         isPublished: true
	 *       }
	 *       sort: {
	 *         field: "createdAt"
	 *         order: "desc"
	 *       }
	 *       pagination: {
	 *         page: 1
	 *         limit: 20
	 *       }
	 *     }
	 *   ) {
	 *     jobs {
	 *       _id
	 *       title
	 *       slug
	 *       companyData {
	 *         name
	 *         logoUrl
	 *       }
	 *       employmentType
	 *       seniorityLevel
	 *       location {
	 *         city
	 *         country
	 *         remote
	 *       }
	 *       salaryRange {
	 *         min
	 *         max
	 *         currency
	 *       }
	 *       tags
	 *       viewsCount
	 *       applicationsCount
	 *     }
	 *     totalCount
	 *     page
	 *     totalPages
	 *     hasNextPage
	 *   }
	 * }
	 * ```
	 */
	@Query(() => PaginatedJobsOutput, {
		name: 'getJobs',
		description: 'Get jobs with advanced filtering, sorting, and pagination',
	})
	async getJobs(@Args('input', { nullable: true }) input: GetJobsInput = {}): Promise<PaginatedJobsOutput> {
		return this.jobService.getJobs(input);
	}

	/**
	 * Query: Get a single job by ID
	 *
	 * @example GraphQL Query:
	 * ```graphql
	 * query GetJobById {
	 *   getJobById(jobId: "507f1f77bcf86cd799439011", incrementView: true) {
	 *     _id
	 *     title
	 *     description
	 *     companyData {
	 *       name
	 *       logoUrl
	 *     }
	 *     location {
	 *       city
	 *       country
	 *       remote
	 *     }
	 *     salaryRange {
	 *       min
	 *       max
	 *       currency
	 *     }
	 *     skills
	 *     requirements
	 *     benefits
	 *     viewsCount
	 *     applicationsCount
	 *   }
	 * }
	 * ```
	 */
	@Query(() => JobOutput, {
		name: 'getJobById',
		description: 'Get a single job by ID',
	})
	async getJobById(
		@Args('jobId', { type: () => ID }) jobId: string,
		@Args('incrementView', { type: () => Boolean, nullable: true, defaultValue: false })
		incrementView: boolean,
	): Promise<JobOutput> {
		return this.jobService.getJobById(jobId, incrementView);
	}

	/**
	 * Query: Get a single job by slug
	 *
	 * @example GraphQL Query:
	 * ```graphql
	 * query GetJobBySlug {
	 *   getJobBySlug(slug: "senior-software-engineer-react", incrementView: true) {
	 *     _id
	 *     title
	 *     description
	 *     companyData {
	 *       name
	 *       logoUrl
	 *     }
	 *     employmentType
	 *     seniorityLevel
	 *     location {
	 *       city
	 *       country
	 *       remote
	 *     }
	 *   }
	 * }
	 * ```
	 */
	@Query(() => JobOutput, {
		name: 'getJobBySlug',
		description: 'Get a single job by slug',
	})
	async getJobBySlug(
		@Args('slug') slug: string,
		@Args('incrementView', { type: () => Boolean, nullable: true, defaultValue: false })
		incrementView: boolean,
	): Promise<JobOutput> {
		return this.jobService.getJobBySlug(slug, incrementView);
	}

	/**
	 * Query: Get a single job by ID or slug (combined)
	 *
	 * This unified query automatically detects whether the input is an ID or slug
	 * and returns the appropriate job. This is more convenient than having separate
	 * queries for ID and slug.
	 *
	 * @example GraphQL Query (with ID):
	 * ```graphql
	 * query GetJob {
	 *   getJobByIdOrSlug(idOrSlug: "507f1f77bcf86cd799439011", incrementView: true) {
	 *     _id
	 *     title
	 *     description
	 *     companyData {
	 *       name
	 *       logoUrl
	 *     }
	 *   }
	 * }
	 * ```
	 *
	 * @example GraphQL Query (with slug):
	 * ```graphql
	 * query GetJob {
	 *   getJobByIdOrSlug(idOrSlug: "senior-software-engineer-react", incrementView: true) {
	 *     _id
	 *     title
	 *     description
	 *   }
	 * }
	 * ```
	 */
	@Query(() => JobOutput, {
		name: 'getJobByIdOrSlug',
		description: 'Get a single job by ID or slug (automatically detects which one)',
	})
	async getJobByIdOrSlug(
		@Args('idOrSlug') idOrSlug: string,
		@Args('incrementView', { type: () => Boolean, nullable: true, defaultValue: false })
		incrementView: boolean,
	): Promise<JobOutput> {
		return this.jobService.getJobByIdOrSlug(idOrSlug, incrementView);
	}

	/**
	 * Query: Get job statistics
	 *
	 * @example GraphQL Query:
	 * ```graphql
	 * query GetJobStats {
	 *   getJobStats(companyId: "507f1f77bcf86cd799439011") {
	 *     totalJobs
	 *     publishedJobs
	 *     draftJobs
	 *     closedJobs
	 *     totalApplications
	 *     totalViews
	 *   }
	 * }
	 * ```
	 */
	@Roles(UserRole.RECRUITER, UserRole.ADMIN)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Query(() => JobStatsOutput, {
		name: 'getJobStats',
		description: 'Get job statistics',
	})
	async getJobStats(
		@Args('companyId', { type: () => ID, nullable: true }) companyId?: string,
	): Promise<JobStatsOutput> {
		return this.jobService.getJobStats(companyId);
	}

	/**
	 * Mutation: Create a new job
	 *
	 * @example GraphQL Mutation:
	 * ```graphql
	 * mutation CreateJob {
	 *   createJob(
	 *     input: {
	 *       companyId: "507f1f77bcf86cd799439011"
	 *       title: "Senior Software Engineer"
	 *       slug: "senior-software-engineer-react"
	 *       description: "We are looking for an experienced engineer..."
	 *       shortDescription: "Senior role with React expertise"
	 *       employmentType: FULL_TIME
	 *       seniorityLevel: SENIOR
	 *       location: {
	 *         city: "San Francisco"
	 *         country: "United States"
	 *         remote: true
	 *       }
	 *       salaryRange: {
	 *         min: 120000
	 *         max: 180000
	 *         currency: USD
	 *         visibility: PUBLIC
	 *       }
	 *       tags: ["JavaScript", "React", "Node.js"]
	 *       skills: ["React", "TypeScript", "GraphQL"]
	 *       requirements: ["5+ years of experience", "Strong communication skills"]
	 *       benefits: ["Health insurance", "Remote work", "401k"]
	 *       isPublished: true
	 *       visibility: PUBLIC
	 *     }
	 *   ) {
	 *     _id
	 *     title
	 *     slug
	 *   }
	 * }
	 * ```
	 */
	@Roles(UserRole.RECRUITER, UserRole.ADMIN)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Mutation(() => JobOutput, {
		name: 'createJob',
		description: 'Create a new job posting',
	})
	async createJob(@Args('input') input: CreateJobInput, @AuthUser('_id') userId: string): Promise<JobOutput> {
		return this.jobService.createJob(input, userId);
	}

	/**
	 * Mutation: Update a job
	 *
	 * @example GraphQL Mutation:
	 * ```graphql
	 * mutation UpdateJob {
	 *   updateJob(
	 *     input: {
	 *       jobId: "507f1f77bcf86cd799439011"
	 *       title: "Senior Software Engineer (Updated)"
	 *       description: "Updated job description..."
	 *       isPublished: true
	 *     }
	 *   ) {
	 *     _id
	 *     title
	 *     updatedAt
	 *   }
	 * }
	 * ```
	 */
	@Roles(UserRole.RECRUITER, UserRole.ADMIN)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Mutation(() => JobOutput, {
		name: 'updateJob',
		description: 'Update a job posting',
	})
	async updateJob(@Args('input') input: UpdateJobInput, @AuthUser('_id') userId: string): Promise<JobOutput> {
		return this.jobService.updateJob(input, userId);
	}

	/**
	 * Mutation: Delete a job (soft delete)
	 *
	 * @example GraphQL Mutation:
	 * ```graphql
	 * mutation DeleteJob {
	 *   deleteJob(jobId: "507f1f77bcf86cd799439011")
	 * }
	 * ```
	 */
	@Roles(UserRole.RECRUITER, UserRole.ADMIN)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Mutation(() => Boolean, {
		name: 'deleteJob',
		description: 'Delete a job (soft delete)',
	})
	async deleteJob(@Args('jobId', { type: () => ID }) jobId: string): Promise<boolean> {
		return this.jobService.deleteJob(jobId);
	}

	/**
	 * Mutation: Close a job (mark as filled)
	 *
	 * @example GraphQL Mutation:
	 * ```graphql
	 * mutation CloseJob {
	 *   closeJob(jobId: "507f1f77bcf86cd799439011") {
	 *     _id
	 *     closedAt
	 *     isPublished
	 *   }
	 * }
	 * ```
	 */
	@Roles(UserRole.RECRUITER, UserRole.ADMIN)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Mutation(() => JobOutput, {
		name: 'closeJob',
		description: 'Close a job (mark as filled)',
	})
	async closeJob(@Args('jobId', { type: () => ID }) jobId: string): Promise<JobOutput> {
		return this.jobService.closeJob(jobId);
	}
}
