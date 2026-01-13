import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import {
	CreateJobInput,
	UpdateJobInput,
	GetJobsInput,
	JobOutput,
	PaginatedJobsOutput,
	JobStatsOutput,
	JobNotFoundException,
} from '../../libs';
import { ErrorCode, ErrorMessage } from '../../libs';

/**
 * JobService - Business logic for job management
 *
 * This service handles:
 * - Creating, updating, and deleting jobs
 * - Querying jobs with advanced filtering, sorting, and pagination
 * - Managing job statistics (views, applications)
 * - Validating job data and business rules
 */
@Injectable()
export class JobService {
	constructor(
		@InjectModel('Job')
		private readonly jobModel: Model<any>,
	) {}

	/**
	 * Create a new job posting
	 */
	async createJob(input: CreateJobInput, userId: string): Promise<JobOutput> {
		try {
			// Check if slug already exists
			const existingJob = await this.jobModel.findOne({
				slug: input.slug,
				deletedAt: null,
			});

			if (existingJob) {
				throw new BadRequestException({
					code: ErrorCode.BAD_REQUEST,
					message: 'Job with this slug already exists',
				});
			}

			const job = await this.jobModel.create({
				...input,
				postedBy: userId,
				viewsCount: 0,
				applicationsCount: 0,
			});

			return this.mapToJobOutput(job);
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException({
				code: ErrorCode.BAD_REQUEST,
				message: 'Failed to create job',
				details: error.message,
			});
		}
	}

	/**
	 * Get jobs with filtering, sorting, and pagination using aggregation pipeline
	 */
	async getJobs(input: GetJobsInput = {}): Promise<PaginatedJobsOutput> {
		const { filter = {}, sort = {}, pagination = {} } = input;
		const { page = 1, limit = 20 } = pagination;
		const skip = (page - 1) * limit;

		const pipeline: PipelineStage[] = [];

		// ==================== STAGE 1: TEXT SEARCH ====================
		// If search query exists, add text search stage with score
		if (filter.search) {
			pipeline.push({
				$match: {
					$text: { $search: filter.search, $caseSensitive: false },
				},
			});
			pipeline.push({
				$addFields: {
					textScore: { $meta: 'textScore' },
				},
			});
		}

		// ==================== STAGE 2: MATCH (Filtering) ====================
		const matchStage: any = {
			deletedAt: null,
		};

		// Company filter
		if (filter.companyId) {
			matchStage.companyId = filter.companyId;
		}

		// Employment types
		if (filter.employmentTypes && filter.employmentTypes.length > 0) {
			matchStage.employmentType = { $in: filter.employmentTypes };
		}

		// Seniority levels
		if (filter.seniorityLevels && filter.seniorityLevels.length > 0) {
			matchStage.seniorityLevel = { $in: filter.seniorityLevels };
		}

		// Location filters
		if (filter.city) {
			matchStage['location.city'] = new RegExp(filter.city, 'i');
		}
		if (filter.country) {
			matchStage['location.country'] = new RegExp(filter.country, 'i');
		}
		if (filter.remote !== undefined) {
			matchStage['location.remote'] = filter.remote;
		}

		// Tags filter
		if (filter.tags && filter.tags.length > 0) {
			matchStage.tags = { $in: filter.tags };
		}

		// Skills filter
		if (filter.skills && filter.skills.length > 0) {
			matchStage.skills = { $all: filter.skills };
		}

		// Published filter
		if (filter.isPublished !== undefined) {
			matchStage.isPublished = filter.isPublished;
		}

		// Visibility filter
		if (filter.visibility) {
			matchStage.visibility = filter.visibility;
		}

		// Salary filter
		if (filter.hasSalary !== undefined) {
			if (filter.hasSalary) {
				matchStage.salaryRange = { $exists: true, $ne: null };
			} else {
				matchStage.$or = [{ salaryRange: { $exists: false } }, { salaryRange: null }];
			}
		}

		// Add match stage if we have any filters
		if (Object.keys(matchStage).length > 0) {
			pipeline.push({ $match: matchStage });
		}
		console.log('------------------- PIPELINE -------------------');
		console.log('Pipeline', pipeline);
		console.log(JSON.stringify(filter, null, 2));
		console.log('-----------------------------------------------');

		// ==================== STAGE 3: LOOKUP (Joins) ====================
		// Join with Company collection
		pipeline.push({
			$lookup: {
				from: 'companies',
				localField: 'companyId',
				foreignField: '_id',
				as: 'companyData',
				pipeline: [
					{
						$project: {
							_id: 1,
							name: 1,
							slug: 1,
							logoUrl: 1,
							verified: 1,
						},
					},
				],
			},
		});

		// Join with User collection
		pipeline.push({
			$lookup: {
				from: 'users',
				localField: 'postedBy',
				foreignField: '_id',
				as: 'postedByData',
				pipeline: [
					{
						$project: {
							_id: 1,
							firstName: 1,
							lastName: 1,
							email: 1,
							profilePicture: 1,
						},
					},
				],
			},
		});

		// ==================== STAGE 4: PROJECT (Shape the output) ====================
		pipeline.push({
			$addFields: {
				companyData: { $arrayElemAt: ['$companyData', 0] },
				postedByData: { $arrayElemAt: ['$postedByData', 0] },
			},
		});

		// ==================== STAGE 5: SORT ====================
		const sortStage: any = {};

		// If text search is active and no explicit sort is provided, sort by relevance
		if (filter.search && !sort.field) {
			sortStage.textScore = -1;
			sortStage.createdAt = -1;
		} else if (sort.field) {
			sortStage[sort.field] = sort.order === 'asc' ? 1 : -1;
		} else {
			sortStage.createdAt = -1; // Default sort by newest
		}

		pipeline.push({ $sort: sortStage });

		// ==================== STAGE 6: FACET (Parallel execution for data + count) ====================
		// This runs two pipelines in parallel: one for data, one for count
		pipeline.push({
			$facet: {
				// Pipeline for getting paginated data
				data: [{ $skip: skip }, { $limit: limit }],
				// Pipeline for getting total count
				metadata: [{ $count: 'totalCount' }],
			},
		});

		// ==================== EXECUTE AGGREGATION ====================
		const result = await this.jobModel.aggregate(pipeline).exec();

		const jobs = result[0]?.data || [];
		const totalCount = result[0]?.metadata[0]?.totalCount || 0;
		const totalPages = Math.ceil(totalCount / limit);

		return {
			jobs: jobs.map((job) => this.mapToJobOutput(job)),
			totalCount,
			page,
			limit,
			totalPages,
			hasNextPage: page < totalPages,
			hasPreviousPage: page > 1,
		};
	}

	/**
	 * Get a single job by ID
	 */
	async getJobById(jobId: string, incrementView = false): Promise<JobOutput> {
		const job = await this.jobModel
			.findOne({ _id: jobId, deletedAt: null })
			.populate('companyId', 'name slug logoUrl verified')
			.populate('postedBy', 'firstName lastName email profilePicture')
			.lean();

		if (!job) {
			throw new JobNotFoundException(`Job with ID "${jobId}" not found`);
		}

		// Increment view count if requested
		if (incrementView) {
			await this.jobModel.findByIdAndUpdate(jobId, {
				$inc: { viewsCount: 1 },
			});
			(job as any).viewsCount = ((job as any).viewsCount || 0) + 1;
		}

		return this.mapToJobOutput(job);
	}

	/**
	 * Get a single job by slug
	 */
	async getJobBySlug(slug: string, incrementView = false): Promise<JobOutput> {
		const job = await this.jobModel
			.findOne({ slug, deletedAt: null })
			.populate('companyId', 'name slug logoUrl verified')
			.populate('postedBy', 'firstName lastName email profilePicture')
			.lean();

		if (!job) {
			throw new JobNotFoundException(`Job with slug "${slug}" not found`);
		}

		// Increment view count if requested
		if (incrementView) {
			await this.jobModel.findOneAndUpdate(
				{ slug },
				{
					$inc: { viewsCount: 1 },
				},
			);
			(job as any).viewsCount = ((job as any).viewsCount || 0) + 1;
		}

		return this.mapToJobOutput(job);
	}

	/**
	 * Get a single job by ID or slug (combined method)
	 * Automatically detects if the input is a valid ObjectId or a slug
	 */
	async getJobByIdOrSlug(idOrSlug: string, incrementView = false): Promise<JobOutput> {
		// Check if the input looks like a MongoDB ObjectId (24 hex characters)
		const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);

		if (isObjectId) {
			// Try to get by ID first
			return this.getJobById(idOrSlug, incrementView);
		} else {
			// Otherwise, treat it as a slug
			return this.getJobBySlug(idOrSlug, incrementView);
		}
	}

	/**
	 * Update a job
	 */
	async updateJob(input: UpdateJobInput, userId: string): Promise<JobOutput> {
		const { jobId, ...updateData } = input;

		// Check if job exists
		const existingJob = await this.jobModel.findOne({
			_id: jobId,
			deletedAt: null,
		});

		if (!existingJob) {
			throw new NotFoundException({
				code: ErrorCode.NOT_FOUND,
				message: ErrorMessage[ErrorCode.NOT_FOUND],
			});
		}

		// Check if slug is being updated and if it's unique
		if (updateData.slug && updateData.slug !== existingJob.slug) {
			const slugExists = await this.jobModel.findOne({
				slug: updateData.slug,
				_id: { $ne: jobId },
				deletedAt: null,
			});

			if (slugExists) {
				throw new BadRequestException({
					code: ErrorCode.BAD_REQUEST,
					message: 'Job with this slug already exists',
				});
			}
		}

		const updatedJob = await this.jobModel
			.findByIdAndUpdate(jobId, updateData, { new: true })
			.populate('companyId', 'name slug logoUrl verified')
			.populate('postedBy', 'firstName lastName email profilePicture')
			.lean();

		return this.mapToJobOutput(updatedJob);
	}

	/**
	 * Delete a job (soft delete)
	 */
	async deleteJob(jobId: string): Promise<boolean> {
		const job = await this.jobModel.findOne({
			_id: jobId,
			deletedAt: null,
		});

		if (!job) {
			throw new JobNotFoundException(`Job with ID "${jobId}" not found`);
		}

		await this.jobModel.findByIdAndUpdate(jobId, {
			deletedAt: new Date(),
		});

		return true;
	}

	/**
	 * Close a job (mark as filled)
	 */
	async closeJob(jobId: string): Promise<JobOutput> {
		const job = await this.jobModel
			.findByIdAndUpdate(
				jobId,
				{
					closedAt: new Date(),
					isPublished: false,
				},
				{ new: true },
			)
			.populate('companyId', 'name slug logoUrl verified')
			.populate('postedBy', 'firstName lastName email profilePicture')
			.lean();

		if (!job) {
			throw new JobNotFoundException(`Job with ID "${jobId}" not found`);
		}

		return this.mapToJobOutput(job);
	}

	/**
	 * Increment application count for a job
	 */
	async incrementApplicationCount(jobId: string): Promise<void> {
		await this.jobModel.findByIdAndUpdate(jobId, {
			$inc: { applicationsCount: 1 },
		});
	}

	/**
	 * Decrement application count for a job
	 */
	async decrementApplicationCount(jobId: string): Promise<void> {
		await this.jobModel.findByIdAndUpdate(jobId, {
			$inc: { applicationsCount: -1 },
		});
	}

	/**
	 * Get job statistics
	 */
	async getJobStats(companyId?: string): Promise<JobStatsOutput> {
		const query: any = { deletedAt: null };
		if (companyId) {
			query.companyId = companyId;
		}

		const [stats] = await this.jobModel.aggregate([
			{ $match: query },
			{
				$group: {
					_id: null,
					totalJobs: { $sum: 1 },
					publishedJobs: {
						$sum: { $cond: [{ $eq: ['$isPublished', true] }, 1, 0] },
					},
					draftJobs: {
						$sum: { $cond: [{ $eq: ['$isPublished', false] }, 1, 0] },
					},
					closedJobs: {
						$sum: { $cond: [{ $ne: ['$closedAt', null] }, 1, 0] },
					},
					totalApplications: { $sum: '$applicationsCount' },
					totalViews: { $sum: '$viewsCount' },
				},
			},
		]);

		return (
			stats || {
				totalJobs: 0,
				publishedJobs: 0,
				draftJobs: 0,
				closedJobs: 0,
				totalApplications: 0,
				totalViews: 0,
			}
		);
	}

	/**
	 * Map database document to JobOutput
	 */
	private mapToJobOutput(job: any): JobOutput {
		return {
			_id: job._id.toString(),
			companyId: job.companyId?._id?.toString() || job.companyId?.toString(),
			companyData: job.companyId?._id ? job.companyId : undefined,
			postedBy: job.postedBy?._id?.toString() || job.postedBy?.toString(),
			postedByData: job.postedBy?._id ? job.postedBy : undefined,
			title: job.title,
			slug: job.slug,
			description: job.description,
			shortDescription: job.shortDescription,
			employmentType: job.employmentType,
			seniorityLevel: job.seniorityLevel,
			location: job.location,
			salaryRange: job.salaryRange,
			tags: job.tags || [],
			skills: job.skills || [],
			requirements: job.requirements || [],
			benefits: job.benefits || [],
			applicationDeadline: job.applicationDeadline,
			isPublished: job.isPublished,
			visibility: job.visibility,
			viewsCount: job.viewsCount || 0,
			applicationsCount: job.applicationsCount || 0,
			createdAt: job.createdAt,
			updatedAt: job.updatedAt,
			closedAt: job.closedAt,
			deletedAt: job.deletedAt,
		};
	}
}
