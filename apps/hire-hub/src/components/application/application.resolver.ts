import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ApplicationService } from './application.service';
import {
	ApplicationOutput,
	PaginatedApplicationsOutput,
	ApplicationStatsOutput,
	CreateApplicationInput,
	UpdateApplicationInput,
	GetApplicationsInput,
	AddNoteInput,
	User,
} from '../../libs';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../libs';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthUser } from '../auth/decorators/authUser.decorator';

import type { ObjectId } from 'mongoose';

/**
 * ApplicationResolver - GraphQL resolver for application queries and mutations
 *
 * This resolver exposes GraphQL endpoints for:
 * - Querying applications with advanced filtering, sorting, and pagination
 * - Getting individual applications by ID
 * - Creating, updating, and deleting applications
 * - Managing application notes
 * - Getting application statistics
 */
@Resolver()
export class ApplicationResolver {
	constructor(private readonly applicationService: ApplicationService) {}

	/**
	 * Query: Get applications with filters, sorting, and pagination
	 */
	@Roles(UserRole.CANDIDATE, UserRole.ADMIN, UserRole.RECRUITER)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Query(() => PaginatedApplicationsOutput, {
		name: 'getApplications',
		description: 'Get applications with advanced filtering, sorting, and pagination',
	})
	async getApplications(
		@Args('input', { nullable: true }) input: GetApplicationsInput = {},
		@AuthUser() user: User,
	): Promise<PaginatedApplicationsOutput> {
		return this.applicationService.getApplications(input, user);
	}

	/**
	 * Query: Get a single application by ID
	 */
	@Query(() => ApplicationOutput, {
		name: 'getApplicationById',
		description: 'Get a single application by ID',
	})
	@UseGuards(AuthGuard)
	async getApplicationById(
		@Args('applicationId', { type: () => ID }) applicationId: string,
		@AuthUser('_id') candidateId: ObjectId | string,
	): Promise<ApplicationOutput> {
		return this.applicationService.getApplicationById(applicationId, candidateId);
	}

	/**
	 * Query: Get application statistics
	 */
	@Query(() => ApplicationStatsOutput, {
		name: 'getApplicationStats',
		description: 'Get application statistics with optional filters',
	})
	@UseGuards(AuthGuard)
	async getApplicationStats(
		@Args('jobId', { type: () => ID, nullable: true }) jobId?: string,
		@Args('candidateId', { type: () => ID, nullable: true }) candidateId?: string,
		@Args('companyId', { type: () => ID, nullable: true }) companyId?: string,
	): Promise<ApplicationStatsOutput> {
		return this.applicationService.getApplicationStats({
			jobId,
			candidateId,
			companyId,
		});
	}

	/**
	 * Mutation: Create a new application
	 */
	@Mutation(() => ApplicationOutput, {
		name: 'createApplication',
		description: 'Create a new job application',
	})
	@UseGuards(AuthGuard)
	async createApplication(
		@Args('input') input: CreateApplicationInput,
		@AuthUser() user: User,
	): Promise<ApplicationOutput> {
		return this.applicationService.createApplication(input, user._id);
	}

	/**
	 * Mutation: Update an application
	 */
	@Mutation(() => ApplicationOutput, {
		name: 'updateApplication',
		description: 'Update an existing application',
	})
	@UseGuards(AuthGuard)
	async updateApplication(
		@Args('input') input: UpdateApplicationInput,
		@AuthUser('_id') candidateId: ObjectId | string,
	): Promise<ApplicationOutput> {
		return this.applicationService.updateApplication(input, candidateId);
	}

	/**
	 * Mutation: Delete an application (soft delete)
	 */
	@Mutation(() => Boolean, {
		name: 'deleteApplication',
		description: 'Delete an application (soft delete)',
	})
	@UseGuards(AuthGuard)
	async deleteApplication(@Args('applicationId', { type: () => ID }) applicationId: string): Promise<boolean> {
		return this.applicationService.deleteApplication(applicationId);
	}

	/**
	 * Mutation: Add a note to an application
	 */
	@Mutation(() => ApplicationOutput, {
		name: 'addApplicationNote',
		description: 'Add a note to an application',
	})
	@Roles(UserRole.RECRUITER, UserRole.ADMIN)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	async addApplicationNote(@Args('input') input: AddNoteInput, @AuthUser() user: User): Promise<ApplicationOutput> {
		return this.applicationService.addNote(input, user._id);
	}
}
