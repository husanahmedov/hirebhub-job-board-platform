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
	User,
	UserRole,
	UnauthorizedException,
	CompanyNotFoundException,
	Visibility,
	JobType,
	JobCreationFailedException,
} from '../../libs';
import { ErrorCode, ErrorMessage, BadRequestException } from '../../libs';
import { ViewService } from '../view/view.service';
import { JOBS_AGGREGATION_PIPELINES, shapeIntoMongoObjectId } from '../../libs/config';
import { StatsModifier } from '../../libs/interfaces/common';
import { CompanyService } from '../company/company.service';
import { SocketGateway } from '../../socket/socket.gateway';

@Injectable()
export class JobService {
	constructor(
		@InjectModel('Job')
		private readonly jobModel: Model<JobOutput>,
		private readonly viewService: ViewService,
		private readonly companyService: CompanyService,
		private readonly socketGateway: SocketGateway,
	) {}

	// =============================================================================================
	// --------------------------------- // [USER] // ----------------------------------------------
	// =============================================================================================

	/*****************************************************************************
	 * [SERVICE] CREATE JOB
	 *
	 * * This method creates a new job posting. It first checks if the user is authorized to post a job
	 * * for the specified company (either as an owner or recruiter). If authorized, it creates the job
	 * * with initial metrics set to zero. The method includes comprehensive error handling for various
	 * * failure scenarios, such as unauthorized access or database errors.
	 *
	 *******************************************************************************/
	public async createJob(input: CreateJobInput, userId: string): Promise<JobOutput> {
		const objUserId = shapeIntoMongoObjectId(userId);
		console.log('--- @Service Job Input ---', input);
		try {
			let job;
			if (!input.companyId || input.companyId === '' || input.companyId === undefined) {
				// --- if not owner or recruiter of company but solo recruiter (no company) allow to post job ---
				const isSoloRecruiter = await this.companyService.checkIsSoloRecruiter(userId.toString());
				if (!isSoloRecruiter) {
					const { employmentType } = input;
					if (
						employmentType === JobType.FREELANCE ||
						employmentType === JobType.MILESTONE ||
						employmentType === JobType.VOLUNTEER
					) {
						job = await this.jobModel.create({
							...input,
							postedBy: objUserId,
							viewsCount: 0,
							applicationsCount: 0,
						});
						await this.socketGateway.broardcastUpdate('LandingLiveJobUpdates', await this.countLiveLandingPageJobs());
						return this.mapToJobOutput(job);
					}
					throw new JobCreationFailedException(
						'You can only post Freelance, Milestone or Volunteer jobs as a solo recruiter',
						400,
					);
				}
				console.log(isSoloRecruiter);
				throw new UnauthorizedException('You must be associated with a company as an owner or recruiter to post a job');
			}
			console.log(input.companyId);
			const isOwnerOfCompany = await this.companyService.checkOwnerOfCompany(input.companyId!, userId.toString());
			// const isOwnerOfCompany: boolean = 4 === 4; // --- MOCKED FOR TESTING, REPLACE WITH ACTUAL CHECK ---
			switch (isOwnerOfCompany) {
				case false:
					const isRecruiterOfCompany = await this.companyService.checkRecruiterOfCompany(
						input.companyId!,
						userId.toString(),
					);
					switch (isRecruiterOfCompany) {
						case true:
							job = await this.jobModel.create({
								...input,
								postedBy: objUserId,
								viewsCount: 0,
								applicationsCount: 0,
							});
							await this.socketGateway.broardcastUpdate('LandingLiveJobUpdates', await this.countLiveLandingPageJobs());
							return this.mapToJobOutput(job);
						case false:
							throw new CompanyNotFoundException({
								message: `Company with ID "${input.companyId}" not found or you are not recruiter of this company`,
							});
					}
				case true:
					job = await this.jobModel.create({
						...input,
						// postedBy: '6956695b099e1e17b86baa09', // --- MOCKED USER ID FOR TESTING, REPLACE WITH objUserId ---
						postedBy: objUserId,
						viewsCount: 0,
						applicationsCount: 0,
					});
					await this.socketGateway.broardcastUpdate('LandingLiveJobUpdates', await this.countLiveLandingPageJobs());
					return this.mapToJobOutput(job);
				default:
					throw new CompanyNotFoundException({
						message: `Company with ID "${input.companyId}" not found or you are not owner of this company`,
					});
			}
		} catch (error) {
			if (error instanceof CompanyNotFoundException) {
				throw error;
			}
			console.log(error);

			throw new BadRequestException('Failed', {
				code: ErrorCode.BAD_REQUEST,
				message: 'Failed to create job',
				details: error.details,
			});
		}
	}

	/*****************************************************************************
	 * [SERVICE] GET MAIN HOMEPAGE JOBS
	 * * This method retrieves a list of job postings for the main homepage. It applies default filters to show only published and public jobs,
	 * * sorts them by creation date in descending order, and limits the results to the first page with a specified number of jobs. The method leverages
	 * * the existing `getJobs` method to perform the retrieval, ensuring consistency in filtering, sorting, and pagination logic. Comprehensive error handling
	 * * is included to manage potential issues during data retrieval.
	 * *****************************************************************************/
	public async getMainHomePageJobs(input?: GetJobsInput): Promise<PaginatedJobsOutput> {
		console.log('--- @Service getMainHomePageJobs called ---');
		return this.getJobs({
			filter: {
				isPublished: true,
				visibility: Visibility.PUBLIC,
			},
			sort: {
				field: 'createdAt',
				order: 'desc',
			},
			pagination: {
				page: input?.pagination?.page || 1,
				limit: input?.pagination?.limit || 10,
			},
		});
	}

	/*****************************************************************************
	 * [SERVICE] GET JOBS WITH FILTERING, SORTING, PAGINATION
	 *
	 * * This method retrieves a list of job postings based on various filters, sorting options, and pagination parameters.
	 * * It constructs a MongoDB aggregation pipeline to efficiently query the database, including text search, field-based filtering, sorting, and pagination.
	 * * The method also performs lookups to join related data from the Company and User collections, and calculates metrics for each job. Comprehensive error
	 * *  handling is included to manage potential issues during data retrieval.
	 *
	 *******************************************************************************/
	public async getJobs(input: GetJobsInput = {}): Promise<PaginatedJobsOutput> {
		const { filter = {}, sort = {}, pagination = {} } = input;
		const { page = 1, limit = 10 } = pagination;
		const skip = (page - 1) * limit;

		const pipeline: PipelineStage[] = [];

		/***
		 * PERFORMANCE: TEXT SEARCH
		 ***/
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

		/***
		 * FEATURE: FILTERING
		 ***/
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
		if (filter.location) {
			// coulbe be city or country, we will check both
			matchStage.$or = [
				{ 'location.city': { $regex: filter.location, $options: 'i' } },
				{ 'location.country': { $regex: filter.location, $options: 'i' } },
			];
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

		// salary range filter
		if (filter.minSalary !== undefined || filter.maxSalary !== undefined) {
			matchStage.salaryRange = matchStage.salaryRange || {};
			if (filter.minSalary !== undefined) {
				matchStage.salaryRange['$gte'] = filter.minSalary;
			}
			if (filter.maxSalary !== undefined) {
				matchStage.salaryRange['$lte'] = filter.maxSalary;
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
		pipeline.push(JOBS_AGGREGATION_PIPELINES.COMPANY_LOOKUP);

		// Join with Applications collection
		pipeline.push(JOBS_AGGREGATION_PIPELINES.APPLICATIONS_DATA_LOOKUP);

		// Join with User collection
		pipeline.push(JOBS_AGGREGATION_PIPELINES.POSTED_BY_LOOKUP);

		// ==================== STAGE 4: PROJECT (Shape the output) ====================
		pipeline.push({
			$addFields: {
				companyData: { $arrayElemAt: ['$companyData', 0] },
				postedByData: { $arrayElemAt: ['$postedByData', 0] },
				...JOBS_AGGREGATION_PIPELINES.JOB_METRICS,
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

		if (filter.recent) {
			sortStage.createdAt = -1; // Ensure recent jobs are sorted by newest
		}
		if (filter.higherCompensation) {
			sortStage['salaryRange.max'] = -1; // Sort by highest max salary
		}
		if (filter.lowerCompetition) {
			sortStage.applicationsCount = 1; // Sort by lowest number of applications
		}
		if (filter.deadlineSoon) {
			sortStage['applicationDeadline'] = 1; // Sort by soonest application deadline
		}
		if (filter.bestMatch) {
			// For best match, we can create a composite score based on various factors (this is a simplified example)
			pipeline.push({
				$addFields: {
					compositeScore: {
						$add: [
							{ $multiply: ['$viewsCount', 0.1] }, // Weight for views
							{ $multiply: ['$applicationsCount', 0.3] }, // Weight for applications
							{ $multiply: [{ $cond: [{ $gt: ['$salaryRange.max', 0] }, 1, 0] }, 0.2] }, // Weight for having salary info
							{
								$multiply: [
									{ $cond: [{ $lte: ['$applicationDeadline', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)] }, 1, 0] },
									0.2,
								],
							}, // Weight for upcoming deadline
							{
								$multiply: [
									{ $cond: [{ $gt: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] }, 1, 0] },
									0.2,
								],
							}, // Weight for recent posting
						],
					},
				},
			});
			sortStage.compositeScore = -1; // Sort by best match score
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

	/*****************************************************************************
	 * [SERVICE] GET JOB BY ID
	 *
	 * * This method retrieves a single job posting by its ID. It constructs an aggregation pipeline
	 * * to fetch the job along with related company and user data, as well as application metrics.
	 * * If the user is authenticated, it also increments the view count for the job. Comprehensive error
	 * *  handling is included to manage scenarios where the job is not found or other issues arise during data retrieval.
	 *
	 *******************************************************************************/
	public async getJobById(jobId: string, userId: string | null): Promise<JobOutput> {
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
					...JOBS_AGGREGATION_PIPELINES.JOB_METRICS,
				},
			},
		);
		pipeline.push({
			$addFields: {
				companyData: { $arrayElemAt: ['$companyData', 0] },
				postedByData: { $arrayElemAt: ['$postedByData', 0] },
			},
		});
		const [job] = await this.jobModel.aggregate(pipeline).exec();
		if (!job) {
			throw new JobNotFoundException(`Job with ID "${jobId}" not found`);
		}
		console.log('------------------- USER LOG INCREMENT VIEWS -------------------');
		console.log('User', userId);
		console.log('-------------------- USER LOG INCREMENT VIEWS ---------------------');
		if (userId) {
			const $resultIncrement = await this.viewService.incremenetViewCount({
				userId: objUserId,
				viewRefId: objJobId,
				viewGroup: ViewGroup.JOB,
			});
			if ($resultIncrement) {
				await this.jobStatsModifier({
					id: objJobId,
					targetKey: 'viewsCount',
					modifier: 1,
				});
				[job.viewsCount] = [job.viewsCount + 1];
			}
		}

		return this.mapToJobOutput(job);
	}

	/*****************************************************************************
	 * [SERVICE] UPDATE JOB
	 *
	 * * This method updates an existing job posting. It first checks if the job exists and is not deleted.
	 * * If the job is found, it updates the job with the provided data and returns the updated job information.
	 * *  Comprehensive error handling is included to manage scenarios where the job is not found or other
	 * *  issues arise during the update process.
	 *
	 *******************************************************************************/
	public async updateJob(input: UpdateJobInput, userId: string): Promise<JobOutput> {
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

	/*****************************************************************************
	 * [SERVICE] DELETE JOB (SOFT DELETE)
	 *
	 * * This method performs a soft delete of a job posting by setting the `deletedAt` field to the current date.
	 * * It first checks if the job exists and is not already deleted. If the job is found, it updates the `deletedAt`
	 * * field and returns a boolean indicating the success of the operation. Comprehensive error handling is included
	 * * to manage scenarios where the job is not found or other issues arise during the deletion process.
	 *
	 *******************************************************************************/
	public async deleteJob(jobId: string): Promise<boolean> {
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

	/*****************************************************************************
	 * [SERVICE] CLOSE JOB (MARK AS FILLED)
	 *
	 * * This method marks a job as closed by setting the `closedAt` field to the current date and `isPublished` to false.
	 * * It first checks if the job exists and is not already deleted. If the job is found, it updates the relevant fields
	 * * and returns the updated job information. Comprehensive error handling is included to manage scenarios where the job
	 * * is not found or other issues arise during the closure process.
	 *
	 *******************************************************************************/
	public async closeJob(jobId: string): Promise<JobOutput> {
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

	/*****************************************************************************
	 * [SERVICE] DECREMENT APPLICATION COUNT
	 *
	 * * This method decrements the application count for a job. It is typically called when an application is withdrawn or deleted.
	 * * The method updates the `applicationsCount` field by decrementing it by one. Comprehensive error handling is included to manage
	 * * potential issues during the update process.
	 *
	 *******************************************************************************/
	public async decrementApplicationCount(jobId: string): Promise<void> {
		await this.jobModel.findByIdAndUpdate(jobId, {
			$inc: { applicationsCount: -1 },
		});
	}

	/*****************************************************************************
	 * [SERVICE] GET JOB STATISTICS
	 *
	 * * This method retrieves various statistics related to job postings, such as total jobs, published jobs, draft jobs, closed jobs,
	 * * total applications, total views, and recent activity metrics. It constructs an aggregation pipeline to efficiently calculate these
	 * * statistics based on the provided company ID and user context. Comprehensive error handling is included to manage potential issues during
	 * * data retrieval.
	 *
	 *******************************************************************************/
	public async getJobStats(companyId?: string, user?: User): Promise<JobStatsOutput> {
		const query: any = { deletedAt: null };
		if (companyId) {
			query.companyId = companyId;
		}
		user?.role === UserRole.RECRUITER ? (query.postedBy = user._id) : null;

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
					last30DaysApplications: {
						$sum: {
							$cond: [
								{
									$and: [
										{ $gte: ['$createdAt', new Date(new Date().setDate(new Date().getDate() - 30))] },
										{ $ne: ['$applicationsCount', null] },
									],
								},
								'$applicationsCount',
								0,
							],
						},
					},
					last30DaysViews: {
						$sum: {
							$cond: [
								{
									$and: [
										{ $gte: ['$createdAt', new Date(new Date().setDate(new Date().getDate() - 30))] },
										{ $ne: ['$viewsCount', null] },
									],
								},
								'$viewsCount',
								0,
							],
						},
					},
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
				last30DaysApplications: 0,
				last30DaysViews: 0,
			}
		);
	}

	/*****************************************************************************
	 * [SERVICE] JOB STATS MODIFIER
	 *
	 * * This method modifies job statistics by incrementing or decrementing a specified metric (e.g., viewsCount, applicationsCount).
	 * * It takes a `StatsModifier` input which includes the job ID, the target key to modify, and the modifier value (positive or negative).
	 * * The method updates the specified metric for the job and includes error handling to manage potential issues during the update process.
	 *
	 *******************************************************************************/
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

	// =============================================================================================
	// --------------------------------- // [ADMIN] // ---------------------------------------------
	// =============================================================================================

	// =============================================================================================
	// --------------------------------- // [RECRUITERS] // ----------------------------------------
	// =============================================================================================

	// =============================================================================================
	// --------------------------------- // [PRIVATE(HELPERS), PUBLIC] // ----------------------------------
	// =============================================================================================

	/*****************************************************************************
	 * [PRIVATE] MAP RAW JOB DATA TO JOB OUTPUT
	 *
	 * * This private method takes raw job data from the database (which may include additional fields and nested data)
	 * * and maps it to the defined `JobOutput` format. It ensures that all necessary fields are included and properly formatted
	 * * for the API response. This method is used internally by the service to maintain a consistent output structure.
	 *
	 *******************************************************************************/
	private mapToJobOutput(job: any): JobOutput {
		return {
			_id: job._id.toString(),
			companyId: job.companyId?.toString(),
			companyData: job.companyData || undefined,
			postedBy: job.postedBy?.toString(),
			postedByData: job.postedByData || undefined,
			title: job.title,
			description: job.description,
			richDescription: job.richDescription,
			shortDescriptions: job.shortDescriptions || [],
			employmentType: job.employmentType,
			seniorityLevel: job.seniorityLevel,
			location: job.location,
			salaryRange: job.salaryRange,
			tags: job.tags || [],
			skills: job.skills || [],
			requirements: job.requirements || [],
			benefits: job.benefits || [],
			applicationDeadline: job.applicationDeadline,
			jobProfession: job.jobProfession || undefined,
			// metrics
			metrics: {
				viewsCount: job.viewsCount,
				applicationsCount: job.applicationsCount,
				applicationRate: job.metrics?.applicationRate,
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
			trending: job.trending,
			isPublished: job.isPublished,
			visibility: job.visibility,
			createdAt: job.createdAt,
			updatedAt: job.updatedAt,
			closedAt: job.closedAt,
			deletedAt: job.deletedAt,
		};
	}

	public async countLiveLandingPageJobs(): Promise<any> {
		const pipeline: PipelineStage[] = [];
		// Calculate the timestamp for 24 hours ago
		const twentyFourHoursAgo = new Date();
		twentyFourHoursAgo.setHours(0, 0, 0, 0); // Set to the start of the day (00:00:00)

		// Step 1: Filter published and public jobs
		pipeline.push({
			$match: {
				isPublished: true,
				visibility: Visibility.PUBLIC,
			},
		});

		// Step 2: Add field to check if created today
		pipeline.push({
			$addFields: {
				isCreatedToday: {
					$cond: [
						{
							$gte: ['$createdAt', twentyFourHoursAgo],
						},
						1,
						0,
					],
				},
			},
		});

		// Step 3: Lookup company information to get company name
		pipeline.push({
			$lookup: {
				from: 'companies',
				localField: 'companyId',
				foreignField: '_id',
				as: 'companyData',
			},
		});

		// Step 4: Unwind company data (flatten the array)
		pipeline.push({
			$unwind: {
				path: '$companyData',
				preserveNullAndEmptyArrays: true,
			},
		});

		// Step 5: Group by company to count jobs per company (only today's jobs)
		pipeline.push({
			$group: {
				_id: '$companyData.name',
				count: {
					$sum: '$isCreatedToday',
				},
				latestCreatedAt: { $max: '$createdAt' },
			},
		});

		// Step 5.5: Filter out null company names
		pipeline.push({
			$match: {
				_id: { $ne: null },
				count: { $gt: 0 }, // Only include companies with jobs created today
			},
		});

		// Step 6: Convert grouped data to array of objects format with relative time
		pipeline.push({
			$group: {
				_id: null,
				companies: {
					$push: {
						name: '$_id',
						count: '$count',
						time: {
							$cond: [
								{
									$gte: ['$latestCreatedAt', new Date(Date.now() - 60 * 60 * 1000)],
								},
								{
									$concat: [
										{
											$toString: {
												$floor: {
													$divide: [{ $subtract: [new Date(), '$latestCreatedAt'] }, 60 * 1000],
												},
											},
										},
										'm ago',
									],
								},
								{
									$cond: [
										{
											$gte: ['$latestCreatedAt', new Date(Date.now() - 24 * 60 * 60 * 1000)],
										},
										{
											$concat: [
												{
													$toString: {
														$floor: {
															$divide: [{ $subtract: [new Date(), '$latestCreatedAt'] }, 60 * 60 * 1000],
														},
													},
												},
												'h ago',
											],
										},
										{
											$concat: [
												{
													$toString: {
														$floor: {
															$divide: [{ $subtract: [new Date(), '$latestCreatedAt'] }, 24 * 60 * 60 * 1000],
														},
													},
												},
												'd ago',
											],
										},
									],
								},
							],
						},
					},
				},
				totalToday: { $sum: '$count' },
			},
		});

		// Step 7: Limit companies to top 3
		pipeline.push({
			$addFields: {
				companies: { $slice: ['$companies', 3] },
			},
		});

		// Step 8: Project final result
		pipeline.push({
			$project: {
				_id: 0,
				totalToday: 1,
				companies: 1,
			},
		});

		const result = await this.jobModel.aggregate(pipeline).exec();
		return result[0] || { totalToday: 0, companies: [] };
	}
}
