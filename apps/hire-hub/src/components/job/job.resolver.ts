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
import { WithoutGuard } from '../auth/guards/without.guard';

/***
 * FEATURE: JOB OPERATIONS
 ***/
@Resolver()
export class JobResolver {
	constructor(private readonly jobService: JobService) {}

	/***
	 * API: GET JOBS
	 ***/
	@Query(() => PaginatedJobsOutput, {
		name: 'getJobs',
		description: 'Get jobs with advanced filtering, sorting, and pagination',
	})
	async getJobs(@Args('input', { nullable: true }) input: GetJobsInput = {}): Promise<PaginatedJobsOutput> {
		return this.jobService.getJobs(input);
	}

	/***
	 * API: GET JOB BY ID
	 ***/
	@UseGuards(WithoutGuard)
	@Query(() => JobOutput, {
		name: 'getJobById',
		description: 'Get a single job by ID',
	})
	async getJobById(
		@Args('jobId', { type: () => ID }) jobId: string,
		@AuthUser('_id')
		userId: string,
	): Promise<JobOutput> {
		return this.jobService.getJobById(jobId, userId);
	}

	/***
	 * API: GET JOB STATS
	 ***/
	@Roles(UserRole.RECRUITER, UserRole.ADMIN)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Query(() => JobStatsOutput, {
		name: 'getJobStats',
		description: 'Get job statistics',
	})
	async getJobStats(
		@Args('companyId', { type: () => ID, nullable: true }) companyId?: string,
		@AuthUser() user?: User,
	): Promise<JobStatsOutput> {
		return this.jobService.getJobStats(companyId, user);
	}

	/***
	 * FEATURE: CREATE JOB
	 ***/
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

	/***
	 * FEATURE: UPDATE JOB
	 ***/
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

	/***
	 * CRITICAL: DELETE JOB
	 ***/
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

	/***
	 * FEATURE: JOB CLOSURE
	 ***/
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
