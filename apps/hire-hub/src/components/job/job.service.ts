import { Injectable, NotFoundException } from '@nestjs/common';
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
	ViewInput,
	ViewGroup,
} from '../../libs';
import { ErrorCode, ErrorMessage, BadRequestException } from '../../libs';
import { ViewService } from '../view/view.service';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { StatsModifier } from '../../libs/interfaces/common';

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
		private readonly jobModel: Model<JobOutput>,
		private readonly viewService: ViewService,
	) {}

	/**
	 * Create a new job posting
	 */
	async createJob(input: CreateJobInput, userId: string): Promise<JobOutput> {
		try {
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
			throw new BadRequestException('Failed', {
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
							logoUrl: 1,
							verified: 1,
						},
					},
				],
			},
		});

		pipeline.push({
			$lookup: {
				from: 'applications',
				localField: '_id',
				foreignField: 'jobId',
				as: 'applicationsData',
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
	async getJobById(jobId: string, userId: string | null): Promise<JobOutput> {
		const objUserId = userId ? shapeIntoMongoObjectId(userId) : null;
		const objJobId = shapeIntoMongoObjectId(jobId);
		const pipeline: PipelineStage[] = [];
		pipeline.push(
			{
				$match: { _id: objJobId, deletedAt: null },
			},
			{
				$lookup: {
					from: 'companies',
					localField: 'companyId',
					foreignField: '_id',
					as: 'companyData',
					pipeline: [
						{
							$unwind: {
								path: '$companyData',
								preserveNullAndEmptyArrays: true,
							},
						},
					],
				},
			},
			{
				$lookup: {
					from: 'users',
					localField: 'postedBy',
					foreignField: '_id',
					as: 'postedByData',
				},
			},
			{
				$lookup: {
					from: 'applications',
					localField: '_id',
					foreignField: 'jobId',
					as: 'applicationsData',
				},
			},
			{
				$addFields: {
					metrics: {
						applicationsCount: '$applicationsCount',
						viewsCount: '$viewsCount',
						applicationRate: {
							$cond: [
								{ $eq: ['$viewsCount', 0] },
								0,
								{
									$round: [
										{
											$multiply: [{ $divide: ['$applicationsCount', '$viewsCount'] }, 100],
										},
										2,
									],
								},
							],
						},
					},
					engagementScore: {
						$add: ['$viewsCount', { $multiply: ['$applicationsCount', 10] }],
					},
					timeInfo: {
						daysSincePosted: {
							$round: [
								{
									$divide: [{ $subtract: [new Date(), '$createdAt'] }, 1000 * 60 * 60 * 24],
								},
								0,
							],
						},
						daysUntilDeadline: {
							$cond: [
								{ $ne: ['$applicationDeadline', null] },
								{
									$round: [
										{
											$divide: [{ $subtract: ['$applicationDeadline', new Date()] }, 1000 * 60 * 60 * 24],
										},
										0,
									],
								},
								null,
							],
						},
						isExpiringSoon: {
							$cond: [
								{
									$and: [
										{ $ne: ['$applicationDeadline', null] },
										{ $lte: [{ $subtract: ['$applicationDeadline', new Date()] }, 7 * 24 * 60 * 60 * 1000] },
									],
								},
								true,
								false,
							],
						},
					},
					flags: {
						isPopular: { $gte: ['$viewsCount', 1000] },
						isHot: { $gte: ['$applicationsCount', 50] },
						needsPromotion: {
							$and: [
								{ $lt: ['$viewsCount', 100] },
								{ $gte: [{ $subtract: [new Date(), '$createdAt'] }, 7 * 24 * 60 * 60 * 1000] },
							],
						},
						hasSalary: {
							$and: [{ $ne: ['$salaryRange', null] }, { $gt: ['$salaryRange.min', 0] }],
						},
					},
				},
			},
		);
		const [job] = await this.jobModel.aggregate(pipeline).exec();
		console.log(job);

		if (!job) {
			throw new JobNotFoundException(`Job with ID "${jobId}" not found`);
		}
		if (userId) {
			await this.viewService.incremenetViewCount({
				userId: objUserId,
				viewRefId: objJobId,
				viewGroup: ViewGroup.JOB,
			});
		}

		return this.mapToJobOutput(job);
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

		const updatedJob = await this.jobModel
			.findByIdAndUpdate(jobId, updateData, { new: true })
			.populate('companyId', 'name logoUrl verified')
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
			.populate('companyId', 'name logoUrl verified')
			.populate('postedBy', 'firstName lastName email profilePicture')
			.lean();

		if (!job) {
			throw new JobNotFoundException(`Job with ID "${jobId}" not found`);
		}

		return this.mapToJobOutput(job);
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
			companyData: job.companyId?._id ? job.companyData[0] : undefined,
			postedBy: job.postedBy?._id?.toString() || job.postedBy?.toString(),
			postedByData: job.postedBy?._id ? job.postedByData[0] : undefined,
			title: job.title,
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
			// metrics
			metrics: {
				applicationsCount: job.applicationsCount ? job.applicationsCount : 0,
				viewsCount: job.viewsCount ? job.viewsCount : 0,
			},
			// engagement score
			engagementScore: job.engagementScore,
			// time info
			timeInfo: {
				daysSincePosted: job.timeInfo?.daysSincePosted,
				daysUntilDeadline: job.timeInfo?.daysUntilDeadline,
				isExpiringSoon: job.timeInfo?.isExpiringSoon,
			},
			// flags
			flags: {
				isPopular: job.flags?.isPopular,
				isHot: job.flags?.isHot,
				needsPromotion: job.flags?.needsPromotion,
				hasSalary: job.flags?.hasSalary,
			},
			isPublished: job.isPublished,
			visibility: job.visibility,
			createdAt: job.createdAt,
			updatedAt: job.updatedAt,
			closedAt: job.closedAt,
			deletedAt: job.deletedAt,
		};
	}
	/**
	 * Increment application count for a job
	 */
	public async jobStatsModifier(input: StatsModifier): Promise<void> {
		try {
			await this.jobModel.findByIdAndUpdate(input.id, {
				$inc: { [input.targetKey]: input.modifier },
			});
		} catch (error) {
			console.log(`---------Error: ${error} ---------`);
			throw new BadRequestException('Failed to modify job stats', {
				message: 'Failed to modify job stats',
				details: error.message,
			});
		}
	}
}
