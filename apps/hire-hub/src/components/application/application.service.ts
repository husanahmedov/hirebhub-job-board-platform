import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import {
	CreateApplicationInput,
	UpdateApplicationInput,
	GetApplicationsInput,
	AddNoteInput,
	ApplicationOutput,
	PaginatedApplicationsOutput,
	ApplicationStatsOutput,
	ApplicationNotFoundException,
	ApplicationAlreadyExistsException,
	JobNotFoundException,
	UserNotFoundException,
	BadRequestException,
	User,
	UserRole,
} from '../../libs';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { ApplicationStatus } from '../../libs/enums/applications';
import { JobService } from '../job/job.service';

import type { ObjectId } from 'mongoose';
import { CompanyService } from '../company/company.service';

/**
 * ApplicationService - Business logic for application management
 *
 * This service handles:
 * - Creating, updating, and deleting applications
 * - Querying applications with advanced filtering, sorting, and pagination
 * - Managing application notes and status transitions
 * - Preventing duplicate applications
 */
@Injectable()
export class ApplicationService {
	constructor(
		@InjectModel('Application')
		private readonly applicationModel: Model<ApplicationOutput>,
		private readonly jobService: JobService,
		private readonly companyService: CompanyService,
	) {}

	/**
	 * Create a new job application
	 */
	async createApplication(input: CreateApplicationInput, userId: string): Promise<ApplicationOutput> {
		try {
			const jobObjectId = shapeIntoMongoObjectId(input.jobId);

			// Check if job exists
			const job = await this.jobService.getJobById(input.jobId, false);

			if (!job) {
				throw new JobNotFoundException({ jobId: input.jobId });
			}

			// Check if user already applied to this job
			const existingApplication = await this.applicationModel.findOne({
				jobId: jobObjectId,
				candidateId: shapeIntoMongoObjectId(userId),
				deletedAt: null,
			});

			if (existingApplication) {
				throw new ApplicationAlreadyExistsException({
					message: 'You have already applied to this job',
				});
			}

			// Create the application
			const application = await this.applicationModel.create({
				...input,
				jobId: jobObjectId,
				candidateId: shapeIntoMongoObjectId(userId),
				companyId: job.companyId,
				status: ApplicationStatus.PENDING,
				appliedAt: new Date(),
			});

			// Increment application count on the job
			await this.jobService.incrementApplicationCount(jobObjectId);

			return this.mapToApplicationOutput(application);
		} catch (error) {
			if (error instanceof ApplicationAlreadyExistsException || error instanceof JobNotFoundException) {
				throw error;
			}
			throw new BadRequestException('Failed Operation', {
				message: 'Failed to create application',
				details: error.message,
			});
		}
	}

	/**
	 * Get applications with filtering, sorting, and pagination
	 */
	async getApplications(input: GetApplicationsInput = {}, user: User): Promise<PaginatedApplicationsOutput> {
		const { filter = {}, sort = {}, pagination = {} } = input;
		const { page = 1, limit = 20 } = pagination;
		const skip = (page - 1) * limit;

		const pipeline: PipelineStage[] = [];

		user.role === UserRole.CANDIDATE && (filter.candidateId = user._id.toString());
		user.role === UserRole.RECRUITER &&
			(filter.companyId = (await this.companyService.getRecruiterCompanyId(user._id.toString())) || undefined);
		user.role === UserRole.ADMIN && null;
		// ==================== STAGE 1: MATCH (Filtering) ====================
		const matchStage: any = {};

		// Soft delete filter
		if (!filter.includeDeleted) {
			matchStage.deletedAt = null;
		}

		// Filter by job
		if (filter.jobId) {
			matchStage.jobId = shapeIntoMongoObjectId(filter.jobId);
		}

		// Filter by candidate
		if (filter.candidateId) {
			matchStage.candidateId = shapeIntoMongoObjectId(filter.candidateId);
		}

		// Filter by company
		if (filter.companyId) {
			matchStage.companyId = shapeIntoMongoObjectId(filter.companyId);
		}

		// Filter by statuses
		if (filter.statuses && filter.statuses.length > 0) {
			matchStage.status = { $in: filter.statuses };
		}

		// Filter by sources
		if (filter.sources && filter.sources.length > 0) {
			matchStage.source = { $in: filter.sources };
		}

		// Filter by score range
		if (filter.minScore !== undefined || filter.maxScore !== undefined) {
			matchStage.score = {};
			if (filter.minScore !== undefined) {
				matchStage.score.$gte = filter.minScore;
			}
			if (filter.maxScore !== undefined) {
				matchStage.score.$lte = filter.maxScore;
			}
		}

		// Filter by applied date range
		if (filter.appliedFrom || filter.appliedTo) {
			matchStage.appliedAt = {};
			if (filter.appliedFrom) {
				matchStage.appliedAt.$gte = filter.appliedFrom;
			}
			if (filter.appliedTo) {
				matchStage.appliedAt.$lte = filter.appliedTo;
			}
		}

		pipeline.push({ $match: matchStage });

		// ==================== STAGE 2: LOOKUP (Populate) ====================
		// Populate job data
		pipeline.push({
			$lookup: {
				from: 'jobs',
				localField: 'jobId',
				foreignField: '_id',
				as: 'jobData',
			},
		});
		pipeline.push({
			$unwind: {
				path: '$jobData',
				preserveNullAndEmptyArrays: true,
			},
		});

		// Populate candidate data
		pipeline.push({
			$lookup: {
				from: 'users',
				localField: 'candidateId',
				foreignField: '_id',
				as: 'candidateData',
			},
		});
		pipeline.push({
			$unwind: {
				path: '$candidateData',
				preserveNullAndEmptyArrays: true,
			},
		});

		// Populate company data
		pipeline.push({
			$lookup: {
				from: 'companies',
				localField: 'companyId',
				foreignField: '_id',
				as: 'companyData',
			},
		});
		pipeline.push({
			$unwind: {
				path: '$companyData',
				preserveNullAndEmptyArrays: true,
			},
		});

		// ==================== STAGE 3: SORT ====================
		const sortField = sort.field || 'appliedAt';
		const sortOrder = sort.order === 'asc' ? 1 : -1;
		pipeline.push({ $sort: { [sortField]: sortOrder } });

		// ==================== STAGE 4: COUNT (for totalCount) ====================
		pipeline.push({
			$facet: {
				metadata: [{ $count: 'totalCount' }],
				data: [{ $skip: skip }, { $limit: limit }],
			},
		});

		const result = await this.applicationModel.aggregate(pipeline);
		const totalCount = result[0]?.metadata[0]?.totalCount || 0;
		const applications = result[0]?.data || [];

		const totalPages = Math.ceil(totalCount / limit);

		return {
			applications: applications.map((app) => this.mapToApplicationOutput(app)),
			totalCount,
			page,
			limit,
			totalPages,
			hasNextPage: page < totalPages,
			hasPreviousPage: page > 1,
		};
	}

	/**
	 * Get a single application by ID
	 */
	async getApplicationById(applicationId: string, candidateId?: string | ObjectId): Promise<ApplicationOutput> {
		try {
			const objectId = shapeIntoMongoObjectId(applicationId);
			const shapedCandidateId = shapeIntoMongoObjectId(candidateId);

			const pipeline: PipelineStage[] = [
				{
					$match: {
						_id: objectId,
						candidateId: shapedCandidateId,
						deletedAt: null,
					},
				},
				{
					$lookup: {
						from: 'jobs',
						localField: 'jobId',
						foreignField: '_id',
						as: 'jobData',
					},
				},
				{
					$unwind: {
						path: '$jobData',
						preserveNullAndEmptyArrays: true,
					},
				},
				{
					$lookup: {
						from: 'users',
						localField: 'candidateId',
						foreignField: '_id',
						as: 'candidateData',
					},
				},
				{
					$unwind: {
						path: '$candidateData',
						preserveNullAndEmptyArrays: true,
					},
				},
				{
					$lookup: {
						from: 'companies',
						localField: 'companyId',
						foreignField: '_id',
						as: 'companyData',
					},
				},
				{
					$unwind: {
						path: '$companyData',
						preserveNullAndEmptyArrays: true,
					},
				},
			];

			const result = await this.applicationModel.aggregate(pipeline);

			if (!result || result.length === 0) {
				throw new ApplicationNotFoundException({ applicationId });
			}

			return this.mapToApplicationOutput(result[0]);
		} catch (error) {
			if (error instanceof ApplicationNotFoundException) {
				throw error;
			}
			throw new BadRequestException('Failed to get application', {
				message: 'Failed to get application',
				details: error.message,
			});
		}
	}

	/**
	 * Update an application
	 */
	async updateApplication(input: UpdateApplicationInput, candidateId?: string | ObjectId): Promise<ApplicationOutput> {
		try {
			const objectId = shapeIntoMongoObjectId(input.applicationId);
			const shapedCandidateId = shapeIntoMongoObjectId(candidateId);

			// Check if application exists
			const existingApplication = await this.applicationModel.findOne({
				_id: objectId,
				candidateId: shapedCandidateId,
				deletedAt: null,
			});

			if (!existingApplication) {
				throw new ApplicationNotFoundException({ applicationId: input.applicationId });
			}

			// Prepare update data
			const updateData: any = {
				updatedAt: new Date(),
			};

			if (input.status !== undefined) {
				updateData.status = input.status;
			}
			if (input.coverLetter !== undefined) {
				updateData.coverLetter = input.coverLetter;
			}
			if (input.attachments !== undefined) {
				updateData.attachments = input.attachments;
			}
			if (input.score !== undefined) {
				updateData.score = input.score;
			}

			const updatedApplication = await this.applicationModel.findByIdAndUpdate(
				objectId,
				{ $set: updateData },
				{ new: true },
			);

			return this.getApplicationById(updatedApplication?._id.toString() || input.applicationId, candidateId);
		} catch (error) {
			if (error instanceof ApplicationNotFoundException) {
				throw error;
			}
			throw new BadRequestException('Failed to update application', {
				message: 'Failed to update application',
				details: error.message,
			});
		}
	}

	/**
	 * Delete an application (soft delete)
	 */
	async deleteApplication(applicationId: string): Promise<boolean> {
		try {
			const objectId = shapeIntoMongoObjectId(applicationId);

			// Check if application exists
			const application = await this.applicationModel.findOne({
				_id: objectId,
				deletedAt: null,
			});

			if (!application) {
				throw new ApplicationNotFoundException({ applicationId });
			}

			// Soft delete
			await this.applicationModel.findByIdAndUpdate(objectId, {
				$set: { deletedAt: new Date() },
			});

			// Decrement application count on the job
			await this.jobService.decrementApplicationCount(application.jobId);

			return true;
		} catch (error) {
			if (error instanceof ApplicationNotFoundException) {
				throw error;
			}
			throw new BadRequestException('Failed to delete application', {
				message: 'Failed to delete application',
				details: error.message,
			});
		}
	}

	/**
	 * Add a note to an application
	 */
	async addNote(input: AddNoteInput, userId: string): Promise<ApplicationOutput> {
		try {
			const objectId = shapeIntoMongoObjectId(input.applicationId);

			// Check if application exists
			const application = await this.applicationModel.findOne({
				_id: objectId,
				deletedAt: null,
			});

			if (!application) {
				throw new ApplicationNotFoundException({ applicationId: input.applicationId });
			}

			// Add note
			const note = {
				content: input.content,
				createdBy: shapeIntoMongoObjectId(userId),
				createdAt: new Date(),
			};

			await this.applicationModel.findByIdAndUpdate(objectId, {
				$push: { notes: note },
				$set: { updatedAt: new Date() },
			});

			return this.getApplicationById(input.applicationId);
		} catch (error) {
			if (error instanceof ApplicationNotFoundException) {
				throw error;
			}
			throw new BadRequestException('Failed to add note', {
				message: 'Failed to add note',
				details: error.message,
			});
		}
	}

	/**
	 * Get application statistics
	 */
	async getApplicationStats(filters?: {
		jobId?: string;
		candidateId?: string;
		companyId?: string;
	}): Promise<ApplicationStatsOutput> {
		try {
			const matchStage: any = { deletedAt: null };

			if (filters?.jobId) {
				matchStage.jobId = shapeIntoMongoObjectId(filters.jobId);
			}
			if (filters?.candidateId) {
				matchStage.candidateId = shapeIntoMongoObjectId(filters.candidateId);
			}
			if (filters?.companyId) {
				matchStage.companyId = shapeIntoMongoObjectId(filters.companyId);
			}

			const pipeline: PipelineStage[] = [
				{ $match: matchStage },
				{
					$group: {
						_id: null,
						totalApplications: { $sum: 1 },
						pendingApplications: {
							$sum: { $cond: [{ $eq: ['$status', ApplicationStatus.PENDING] }, 1, 0] },
						},
						reviewedApplications: {
							$sum: { $cond: [{ $eq: ['$status', ApplicationStatus.REVIEWED] }, 1, 0] },
						},
						shortlistedApplications: {
							$sum: { $cond: [{ $eq: ['$status', ApplicationStatus.SHORTLISTED] }, 1, 0] },
						},
						interviewApplications: {
							$sum: { $cond: [{ $eq: ['$status', ApplicationStatus.INTERVIEW] }, 1, 0] },
						},
						offeredApplications: {
							$sum: { $cond: [{ $eq: ['$status', ApplicationStatus.OFFERED] }, 1, 0] },
						},
						rejectedApplications: {
							$sum: { $cond: [{ $eq: ['$status', ApplicationStatus.REJECTED] }, 1, 0] },
						},
						hiredApplications: {
							$sum: { $cond: [{ $eq: ['$status', ApplicationStatus.HIRED] }, 1, 0] },
						},
						withdrawnApplications: {
							$sum: { $cond: [{ $eq: ['$status', ApplicationStatus.WITHDRAWN] }, 1, 0] },
						},
					},
				},
			];

			const result = await this.applicationModel.aggregate(pipeline);

			if (!result || result.length === 0) {
				return {
					totalApplications: 0,
					pendingApplications: 0,
					reviewedApplications: 0,
					shortlistedApplications: 0,
					interviewApplications: 0,
					offeredApplications: 0,
					rejectedApplications: 0,
					hiredApplications: 0,
					withdrawnApplications: 0,
				};
			}

			return result[0];
		} catch (error) {
			throw new BadRequestException('Failed to get application statistics', {
				message: 'Failed to get application statistics',
				details: error.message,
			});
		}
	}

	/**
	 * Map database model to GraphQL output type
	 */
	private mapToApplicationOutput(application: any): ApplicationOutput {
		return {
			_id: application._id.toString(),
			jobId: application.jobId.toString(),
			jobData: application.jobData,
			candidateId: application.candidateId.toString(),
			candidateData: application.candidateData,
			companyId: application.companyId.toString(),
			companyData: application.companyData,
			status: application.status,
			source: application.source,
			coverLetter: application.coverLetter,
			attachments: application.attachments || [],
			notes: application.notes || [],
			score: application.score,
			appliedAt: application.appliedAt,
			updatedAt: application.updatedAt,
			createdAt: application.createdAt,
			deletedAt: application.deletedAt,
		};
	}
}
