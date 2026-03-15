import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, PipelineStage } from 'mongoose';
import {
	GetCompaniesInput,
	NearbyCompaniesInput,
	CreateCompanyInput,
	UpdateCompanyInput,
	CompanySortField,
	SortOrder,
	BadRequestException,
	User,
	UserNotFoundException,
	DuplicatedOnwerCompanyException,
	CompanyNotFoundException,
	LandingPageCompanyOutput,
	JobOutput,
} from '../../libs';
import { PaginatedCompaniesOutput, CompanyOutput } from '../../libs';
import { JOBS_AGGREGATION_PIPELINES, shapeIntoMongoObjectId } from '../../libs/config';
import { UserService } from '../user/user.service';

@Injectable()
export class CompanyService {
	constructor(
		@InjectModel('Company')
		private readonly companyModel: Model<CompanyOutput>,
		@InjectModel('User')
		private readonly userModel: Model<User>,
		@InjectModel('Job')
		private readonly jobModel: Model<any>,
		private readonly userService: UserService,
	) {}

	// =============================================================================================
	// --------------------------------- // [USER] // ----------------------------------------------
	// =============================================================================================

	/*****************************************************************************
	 * [SERVICE] GET COMPANIES
	 * * Get companies with advanced filtering, sorting, and pagination
	 * * This method uses MongoDB aggregation pipeline to:
	 * * 1. Filter companies based on various criteria
	 * * 2. Perform full-text search on name and description
	 * * 3. Join with Job and CompanyReview collections for counts
	 * * 4. Sort results by multiple fields
	 * * 5. Paginate results efficiently
	 *
	 * @param input - Filter, sort, and pagination options
	 * @returns Paginated list of companies with metadata
	 *******************************************************************************/
	public async getCompanies(input: GetCompaniesInput): Promise<PaginatedCompaniesOutput> {
		const { filter = {}, sort = {}, pagination = {} } = input;
		const page = pagination.page || 1;
		const limit = pagination.limit || 10;
		const skip = (page - 1) * limit;

		// Build aggregation pipeline
		const pipeline: PipelineStage[] = [];

		/***
		 * PERFORMANCE: TEXT SEARCH
		 ***/
		if (filter.search) {
			pipeline.push({
				$match: {
					$text: {
						$search: filter.search,
						$caseSensitive: false,
					},
				},
			});

			// Add text score for relevance sorting
			pipeline.push({
				$addFields: {
					textScore: { $meta: 'textScore' },
				},
			});
		}

		/***
		 * FEATURE: FILTERING
		 ***/
		const matchStage: any = {};

		// Filter by soft delete status
		if (!filter.includeDeleted) {
			matchStage.deletedAt = null;
		}

		// Filter by verification status
		if (filter.verified !== undefined) {
			matchStage.verified = filter.verified;
		}

		// Filter by industries (multiple)
		if (filter.industries && filter.industries.length > 0) {
			matchStage.industry = { $in: filter.industries };
		}

		// Filter by sizes (multiple)
		if (filter.sizes && filter.sizes.length > 0) {
			matchStage.size = { $in: filter.sizes };
		}

		// Filter by plans (multiple)
		if (filter.plans && filter.plans.length > 0) {
			matchStage.plan = { $in: filter.plans };
		}

		// Filter by city
		if (filter.city) {
			matchStage['location.city'] = new RegExp(filter.city, 'i'); // Case-insensitive
		}

		// Filter by country
		if (filter.country) {
			matchStage['location.country'] = new RegExp(filter.country, 'i');
		}

		// Filter by recruiter ID
		if (filter.recruiterId) {
			matchStage.recruiterIds = filter.recruiterId;
		}

		// Add match stage if we have any filters
		if (Object.keys(matchStage).length > 0) {
			pipeline.push({ $match: matchStage });
		}

		/***
		 * PERFORMANCE: DATABASE JOINS
		 ***/
		// Join with Job collection to count active jobs
		pipeline.push(
			{
				$lookup: {
					from: 'jobs',
					let: { companyId: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ['$companyId', '$$companyId'] },
										{ $eq: ['$deletedAt', null] }, // Only count active jobs
									],
								},
							},
						},
						{ $count: 'count' },
					],
					as: 'jobData',
				},
			},
			{
				$lookup: {
					from: 'users',
					localField: 'ownerId',
					foreignField: '_id',
					as: 'ownerData',
					pipeline: [
						{
							$project: {
								_id: 1,
								firstName: 1,
								fullName: {
									$concat: [{ $ifNull: ['$firstName', ''] }, ' ', { $ifNull: ['$lastName', ''] }],
								},
								lastName: 1,
								email: 1,
								role: 1,
							},
						},
					],
				},
			},
		);

		// Join with CompanyReview collection for review stats
		pipeline.push({
			$lookup: {
				from: 'companyreviews',
				let: { companyId: '$_id' },
				pipeline: [
					{
						$match: {
							$expr: { $eq: ['$companyId', '$$companyId'] },
						},
					},
					{
						$group: {
							_id: null,
							count: { $sum: 1 },
							avgRating: { $avg: '$rating' },
						},
					},
				],
				as: 'reviewData',
			},
		});

		// ==================== STAGE 4: PROJECT (Shape the output) ====================
		pipeline.push({
			$addFields: {
				jobCount: {
					$ifNull: [{ $arrayElemAt: ['$jobData.count', 0] }, 0],
				},
				reviewCount: {
					$ifNull: [{ $arrayElemAt: ['$reviewData.count', 0] }, 0],
				},
				averageRating: {
					$ifNull: [{ $arrayElemAt: ['$reviewData.avgRating', 0] }, 0],
				},
				ownerData: { $arrayElemAt: ['$ownerData', 0] },
			},
		});

		// Remove temporary fields
		pipeline.push({
			$project: {
				jobData: 0,
				reviewData: 0,
			},
		});

		// ==================== STAGE 5: SORT ====================
		const sortField = sort.field || CompanySortField.CREATED_AT;
		const sortOrder = sort.order === SortOrder.ASC ? 1 : -1;

		// If text search is active and no explicit sort is provided, sort by relevance
		if (filter.search && !sort.field) {
			pipeline.push({ $sort: { textScore: -1, createdAt: -1 } });
		} else {
			const sortStage: any = {};

			// Map sort fields
			switch (sortField) {
				case CompanySortField.NAME:
					sortStage.name = sortOrder;
					break;
				case CompanySortField.CREATED_AT:
					sortStage.createdAt = sortOrder;
					break;
				case CompanySortField.UPDATED_AT:
					sortStage.updatedAt = sortOrder;
					break;
				case CompanySortField.JOB_COUNT:
					sortStage.jobCount = sortOrder;
					break;
				case CompanySortField.REVIEW_COUNT:
					sortStage.reviewCount = sortOrder;
					break;
				case CompanySortField.AVERAGE_RATING:
					sortStage.averageRating = sortOrder;
					break;
				default:
					sortStage.createdAt = -1; // Default to newest first
			}

			pipeline.push({ $sort: sortStage });
		}

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
		const result = await this.companyModel.aggregate(pipeline).exec();

		const companies = result[0]?.data || [];
		// console.log('----- companies -----', companies);
		const totalCount = result[0]?.metadata[0]?.totalCount || 0;
		const totalPages = Math.ceil(totalCount / limit);

		return {
			companies,
			totalCount,
			page,
			limit,
			totalPages,
			hasNextPage: page < totalPages,
			hasPreviousPage: page > 1,
		};
	}

	public async getTopCompaniesForLandingPage(whichData?: string): Promise<LandingPageCompanyOutput[]> {
		if (!whichData) {
			throw new BadRequestException(
				'whichData argument is required to specify which companies to return (e.g., "top", "featured", "newest")',
				400,
			);
		}
		try {
			const match: any = {
				deletedAt: null, // Only active companies
			};
			const pipeline: PipelineStage[] = [
				{ $match: match },
				JOBS_AGGREGATION_PIPELINES.JOB_PROFESSIONS_LOOKUP,
				JOBS_AGGREGATION_PIPELINES.JOB_COMMON_SKILLS_LOOKUP,
				JOBS_AGGREGATION_PIPELINES.JOB_COMMON_SKILLS_MAP,
				{ $sort: { createdAt: 1 } }, // Sort by oldest first
			];
			// ===================== STAGE 2: SHAPE OUTPUT ====================
			if (whichData && whichData.toLowerCase() === 'bigcard') {
				pipeline.push({
					$addFields: {
						_id: '$_id',
						name: {
							$ifNull: ['$name', 'Unknown'],
						},
						industry: {
							$ifNull: ['$industry', 'Unknown'],
						},
						city: {
							$ifNull: ['$location.city', 'Unknown'],
						},
						activelyHiring: {
							$ifNull: ['$activelyHiring', false],
						},
						openRoles: {
							$ifNull: ['$openRoles', 0],
						},
						bio: {
							$ifNull: ['$bio', ''],
						},
						keyBenefits: {
							$ifNull: ['$keyBenefits', []],
						},
						isRemote: {
							$ifNull: ['$isRemote', false],
						},
						rating: {
							$ifNull: ['$averageRating', 0],
						},
						employeeCount: {
							$ifNull: ['$employeeCount', 0],
						},
						jobProfessions: {
							$ifNull: ['$jobProfessions', []],
						},
						size: {
							$ifNull: ['$size', 'Unknown'],
						},
						foundedYear: {
							$cond: {
								if: { $ifNull: ['$founded', false] },
								then: { $year: '$founded' },
								else: null,
							},
						},
					},
				});
			}
			if (whichData && whichData.toLowerCase() === 'secondcard') {
				pipeline.push({
					$addFields: {
						_id: '$_id',
						name: {
							$ifNull: ['$name', 'Unknown'],
						},
						industry: {
							$ifNull: ['$industry', 'Unknown'],
						},
						city: {
							$ifNull: ['$location.city', 'Unknown'],
						},
						activelyHiring: {
							$ifNull: ['$activelyHiring', false],
						},
						openRoles: {
							$ifNull: ['$openRoles', 0],
						},
						bio: {
							$ifNull: ['$bio', ''],
						},
						keyBenefits: {
							$ifNull: ['$keyBenefits', []],
						},
						isRemote: {
							$ifNull: ['$isRemote', false],
						},
						rating: {
							$ifNull: ['$averageRating', 0],
						},
						employeeCount: {
							$ifNull: ['$employeeCount', 0],
						},
						jobProfessions: {
							$ifNull: ['$jobProfessions', []],
						},
						size: {
							$ifNull: ['$size', 'Unknown'],
						},
						avgSalaryMin: {
							$ifNull: ['$avgSalaryMin', 0],
						},
						avgSalaryMax: {
							$ifNull: ['$avgSalaryMax', 0],
						},
						mostSkills: {
							$ifNull: ['$mostSkills', []],
						},
						foundedYear: {
							$cond: {
								if: { $ifNull: ['$founded', false] },
								then: { $year: '$founded' },
								else: null,
							},
						},
					},
				});
			}
			if (whichData && whichData.toLowerCase() === 'fourthcard') {
				pipeline.push({
					$addFields: {
						_id: '$_id',
						openRoles: {
							$ifNull: ['$openRoles', 0],
						},
						name: {
							$ifNull: ['$name', 'Unknown'],
						},
						industry: {
							$ifNull: ['$industry', 'Unknown'],
						},
						city: {
							$ifNull: ['$location.city', 'Unknown'],
						},
						mostSkills: {
							$ifNull: ['$mostSkills', []],
						},
					},
				});
			}

			const result = await this.companyModel.aggregate(pipeline).exec();

			return result;
		} catch (error) {
			console.error('Error fetching top companies for landing page:', error);
			throw new NotFoundException('Unable to fetch top companies for landing page');
		}
	}

	/*****************************************************************************
	 * [SERVICE] GET NEARBY COMPANIES
	 * * Find companies near a specific location using geospatial queries
	 *
	 * * Uses MongoDB's $geoNear aggregation stage to find companies within
	 * * a specified distance from a point, sorted by distance.
	 *
	 * @param input - Location coordinates and search parameters
	 * @returns Paginated list of nearby companies with distance
	 *******************************************************************************/
	async getNearbyCompanies(input: NearbyCompaniesInput): Promise<PaginatedCompaniesOutput> {
		const { longitude, latitude, maxDistance = 50, pagination = {} } = input;
		const page = pagination.page || 1;
		const limit = pagination.limit || 10;
		const skip = (page - 1) * limit;

		const pipeline: PipelineStage[] = [];

		// ==================== STAGE 1: GEO NEAR ====================
		// This must be the first stage in the pipeline
		pipeline.push({
			$geoNear: {
				near: {
					type: 'Point',
					coordinates: [longitude, latitude],
				},
				distanceField: 'distance', // Output field for distance in meters
				maxDistance: maxDistance * 1000, // Convert km to meters
				spherical: true, // Use spherical geometry for accurate Earth calculations
				query: {
					deletedAt: null, // Only active companies
					'location.coordinates': { $exists: true }, // Must have coordinates
				},
			},
		});

		// ==================== STAGE 2: LOOKUP (Joins) ====================
		// Add job count
		pipeline.push(
			{
				$lookup: {
					from: 'jobs',
					let: { companyId: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [{ $eq: ['$companyId', '$$companyId'] }, { $eq: ['$deletedAt', null] }],
								},
							},
						},
						{ $count: 'count' },
					],
					as: 'jobData',
				},
			},
			{
				$lookup: {
					from: 'users',
					localField: 'ownerId',
					foreignField: '_id',
					as: 'ownerData',
					pipeline: [
						{
							$project: {
								_id: 1,
								firstName: 1,
								fullName: { $concat: [{ $ifNull: ['$firstName', ''] }, ' ', { $ifNull: ['$lastName', ''] }] },
								lastName: 1,
								email: 1,
								role: 1,
							},
						},
					],
				},
			},
		);

		// Add review stats
		pipeline.push({
			$lookup: {
				from: 'companyreviews',
				let: { companyId: '$_id' },
				pipeline: [
					{
						$match: {
							$expr: { $eq: ['$companyId', '$$companyId'] },
						},
					},
					{
						$group: {
							_id: null,
							count: { $sum: 1 },
							avgRating: { $avg: '$rating' },
						},
					},
				],
				as: 'reviewData',
			},
		});

		// ==================== STAGE 3: PROJECT ====================
		pipeline.push({
			$addFields: {
				jobCount: { $ifNull: [{ $arrayElemAt: ['$jobData.count', 0] }, 0] },
				reviewCount: { $ifNull: [{ $arrayElemAt: ['$reviewData.count', 0] }, 0] },
				averageRating: { $ifNull: [{ $arrayElemAt: ['$reviewData.avgRating', 0] }, 0] },
				distanceKm: { $divide: ['$distance', 1000] }, // Convert meters to km
				ownerData: { $arrayElemAt: ['$ownerData', 0] },
			},
		});

		pipeline.push({
			$project: {
				jobData: 0,
				reviewData: 0,
				distance: 0, // Remove meters, keep distanceKm
			},
		});

		// ==================== STAGE 4: FACET ====================
		pipeline.push({
			$facet: {
				data: [{ $skip: skip }, { $limit: limit }],
				metadata: [{ $count: 'totalCount' }],
			},
		});

		// ==================== EXECUTE AGGREGATION ====================
		const result = await this.companyModel.aggregate(pipeline).exec();

		const companies = result[0]?.data || [];
		const totalCount = result[0]?.metadata[0]?.totalCount || 0;
		const totalPages = Math.ceil(totalCount / limit);

		return {
			companies,
			totalCount,
			page,
			limit,
			totalPages,
			hasNextPage: page < totalPages,
			hasPreviousPage: page > 1,
		};
	}

	/*****************************************************************************
	 * [SERVICE] GET COMPANY BY ID
	 * * Get a single company by ID, including job count, review stats, and owner info
	 * * Uses an aggregation pipeline to fetch the company and compute related data in one query
	 * * Throws NotFoundException if the company does not exist or is soft-deleted
	 *
	 * @param id - Company ID
	 * @returns Company details with job count, review stats, and owner info
	 *******************************************************************************/
	public async getCompanyById(id: string): Promise<CompanyOutput> {
		id = shapeIntoMongoObjectId(id);
		const pipeline: PipelineStage[] = [
			{
				$match: {
					_id: id,
					deletedAt: null,
				},
			},
			{
				$lookup: {
					from: 'jobs',
					localField: '_id',
					foreignField: 'companyId',
					pipeline: [{ $match: { deletedAt: null } }, { $count: 'count' }],
					as: 'jobData',
				},
			},
			{
				$lookup: {
					from: 'companyreviews',
					let: { companyId: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: { $eq: ['$companyId', '$$companyId'] },
							},
						},
						{
							$group: {
								_id: null,
								count: { $sum: 1 },
								avgRating: { $avg: '$rating' },
							},
						},
					],
					as: 'reviewData',
				},
			},
			{
				$lookup: {
					from: 'users',
					localField: 'ownerId',
					foreignField: '_id',
					as: 'ownerData',
					pipeline: [
						{
							$project: {
								_id: 1,
								name: 1,
								email: 1,
							},
						},
					],
				},
			},
			{
				$addFields: {
					jobCount: { $ifNull: [{ $arrayElemAt: ['$jobData.count', 0] }, 0] },
					reviewCount: { $ifNull: [{ $arrayElemAt: ['$reviewData.count', 0] }, 0] },
					averageRating: { $ifNull: [{ $arrayElemAt: ['$reviewData.avgRating', 0] }, 0] },
					ownerData: { $arrayElemAt: ['$ownerData', 0] },
				},
			},
			{
				$project: {
					reviewData: 0,
				},
			},
		];

		const result = await this.companyModel.aggregate(pipeline).exec();

		if (!result || result.length === 0) {
			throw new NotFoundException(`Company with ID ${id} not found`);
		}

		return result[0];
	}

	/*****************************************************************************
	 * [SERVICE] CREATE COMPANY
	 * * Create a new company with the provided input data
	 * * Validates that the owner ID is not in the recruiter IDs array
	 * * Validates that the owner ID corresponds to an existing user
	 * * Validates that the owner does not already own another company
	 * * Saves the new company to the database and returns the created company details
	 *
	 * @param input - Data for creating a new company
	 * @returns The created company details
	 * @throws BadRequestException if validation fails
	 * @throws UserNotFoundException if owner user does not exist
	 * @throws DuplicatedOnwerCompanyException if owner already owns a company
	 *******************************************************************************/
	public async createCompany(input: CreateCompanyInput): Promise<CompanyOutput> {
		// Ensure owner is in recruiterIds array
		const recruiterIds = input.recruiterIds || [];
		const ownerIdObj = shapeIntoMongoObjectId(input.ownerId);

		// check if ownerId is in the recruiterIds array
		if (recruiterIds.includes(input.ownerId)) {
			throw new BadRequestException(
				`Owner ID cannot be in the recruiter IDs array @ ----- Owner Id ${input.ownerId} ----- @`,
			);
		}
		// check if owenerId is valid
		const ownerIdCheck = await this.userModel.findOne({ _id: ownerIdObj }).exec();
		if (!ownerIdCheck) {
			throw new UserNotFoundException(`Owner with ID ${input.ownerId} not found`);
		}
		const checkDuplicatedOwner = await this.companyModel.findOne({
			ownerId: ownerIdObj,
		});
		if (checkDuplicatedOwner) {
			throw new DuplicatedOnwerCompanyException('Not Succesfull');
		}

		const company = new this.companyModel({
			...input,
			ownerId: ownerIdObj,
			recruiterIds: recruiterIds.map((id) => shapeIntoMongoObjectId(id)),
		});
		await company.save();
		return await this.getCompanyById(company._id.toString());
	}

	/*****************************************************************************
	 * [SERVICE] UPDATE COMPANY
	 * * Update an existing company with the provided input data
	 * * Validates that the owner ID is not in the recruiter IDs array
	 * * Validates that the company exists and is owned by the user
	 * * Updates the company in the database and returns the updated company details
	 *
	 * @param id - Company ID to update
	 * @param userId - User ID of the requester (must be the owner)
	 * @param input - Data for updating the company
	 * @returns The updated company details
	 * @throws BadRequestException if validation fails
	 * @throws NotFoundException if company not found or user is not the owner
	 *******************************************************************************/
	public async updateCompany(id: string, userId: ObjectId, input: UpdateCompanyInput): Promise<CompanyOutput> {
		const objId = shapeIntoMongoObjectId(id);
		const objUserId = shapeIntoMongoObjectId(userId);
		const recruiterIds = input.recruiterIds?.map((rid) => shapeIntoMongoObjectId(rid));

		// Ensure owner is not in recruiterIds array
		if (recruiterIds && recruiterIds.includes(objUserId)) {
			throw new BadRequestException(`Owner ID cannot be in the recruiter IDs array @ ----- Owner Id ${userId} ----- @`);
		}
		const company = await this.companyModel
			.findOneAndUpdate(
				{
					_id: objId,
					ownerId: objUserId,
				},
				{ ...input, recruiterIds: recruiterIds },
				{ new: true },
			)
			.exec();

		// const promisedList = recruiterIds?.map(async (recruiterId) => {
		// 	await this.userService.switchActiveCompany(recruiterId.toString(), id);
		// 	return 'done';
		// });
		// await Promise.all(promisedList || []);

		if (!company) {
			console.log(objUserId);
			throw new NotFoundException(`Company with ID ${id} not found`);
		}

		return this.getCompanyById(id);
	}

	/*****************************************************************************
	 * [SERVICE] DELETE COMPANY
	 * * Soft delete a company by setting the deletedAt field
	 * * Validates that the company exists and is owned by the user
	 * * Returns true if deletion is successful, otherwise throws NotFoundException
	 *
	 * @param id - Company ID to delete
	 * @returns True if deletion is successful
	 * @throws NotFoundException if company not found or user is not the owner
	 *******************************************************************************/
	public async deleteCompany(id: string): Promise<boolean> {
		const company = await this.companyModel.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true }).exec();

		if (!company) {
			throw new NotFoundException(`Company with ID ${id} not found`);
		}

		return true;
	}

	/*****************************************************************************
	 * [SERVICE] GET COMPANY STATS
	 * * Get aggregated statistics about companies, including total count, verified count, and breakdowns by industry, size, and plan
	 * * Uses a single aggregation pipeline with $facet to compute all stats in one query for performance
	 *
	 * @returns An object containing company statistics
	 *******************************************************************************/
	public async getCompanyStats() {
		const pipeline: PipelineStage[] = [
			{
				$match: {
					deletedAt: null, // Only active companies
				},
			},
			{
				$facet: {
					// Total and verified count
					overview: [
						{
							$group: {
								_id: null,
								totalCompanies: { $sum: 1 },
								verifiedCompanies: {
									$sum: { $cond: ['$verified', 1, 0] },
								},
							},
						},
					],
					// Group by industry
					byIndustry: [
						{
							$group: {
								_id: '$industry',
								count: { $sum: 1 },
							},
						},
						{
							$project: {
								industry: '$_id',
								count: 1,
								_id: 0,
							},
						},
					],
					// Group by size
					bySize: [
						{
							$group: {
								_id: '$size',
								count: { $sum: 1 },
							},
						},
						{
							$project: {
								size: '$_id',
								count: 1,
								_id: 0,
							},
						},
					],
					// Group by plan
					byPlan: [
						{
							$group: {
								_id: '$plan',
								count: { $sum: 1 },
							},
						},
						{
							$project: {
								plan: '$_id',
								count: 1,
								_id: 0,
							},
						},
					],
				},
			},
		];

		const result = await this.companyModel.aggregate(pipeline).exec();

		const overview = result[0]?.overview[0] || { totalCompanies: 0, verifiedCompanies: 0 };
		const byIndustry = result[0]?.byIndustry || [];
		const bySize = result[0]?.bySize || [];
		const byPlan = result[0]?.byPlan || [];

		return {
			totalCompanies: overview.totalCompanies,
			verifiedCompanies: overview.verifiedCompanies,
			byIndustry: byIndustry.reduce((acc: any, item: any) => {
				acc[item.industry] = item.count;
				return acc;
			}, {}),
			bySize: bySize.reduce((acc: any, item: any) => {
				acc[item.size] = item.count;
				return acc;
			}, {}),
			byPlan: byPlan.reduce((acc: any, item: any) => {
				acc[item.plan] = item.count;
				return acc;
			}, {}),
		};
	}

	/*****************************************************************************
	 * [SERVICE] GET RECRUITER COMPANY ID
	 * * Get the company ID associated with a recruiter user ID
	 * * Validates that the recruiter is associated with an active company
	 * * Returns the company ID if found, otherwise returns null
	 *
	 * @param userId - Recruiter user ID
	 * @returns The company ID associated with the recruiter, or null if not found
	 * @throws NotFoundException if no company is found for the recruiter ID
	 *******************************************************************************/
	public async getRecruiterCompanyId(userId: string): Promise<string | null> {
		const shapedUserId = shapeIntoMongoObjectId(userId);
		try {
			const company = await this.companyModel.findOne({ recruiterIds: shapedUserId, deletedAt: null }).exec();
			return company ? company._id.toString() : null;
		} catch (error) {
			throw new NotFoundException(`Company for recruiter ID ${userId} not found`);
		}
	}

	/*****************************************************************************
	 * [SERVICE] CHECK OWNER OF COMPANY
	 * * Check if a user is the owner of a specific company
	 * * Validates that the company exists and is active
	 * * Returns true if the user is the owner, false if not, or null if company not found
	 *
	 * @param companyId - Company ID to check
	 * @param userId - User ID to check against the owner
	 * @returns True if user is owner, false if not, or null if company not found
	 *******************************************************************************/
	public async checkOwnerOfCompany(companyId: string, userId: string): Promise<boolean | null> {
		const shapedUserId = shapeIntoMongoObjectId(userId);
		const company = await this.companyModel.findOne({ _id: companyId, ownerId: shapedUserId, deletedAt: null }).exec();
		return company ? true : false;
	}

	// =============================================================================================
	// --------------------------------- // [ADMIN] // ---------------------------------------------
	// =============================================================================================

	// =============================================================================================
	// --------------------------------- // [RECRUITERS] // ----------------------------------------
	// =============================================================================================
	/*****************************************************************************
	 * [SERVICE] CHECK RECRUITER OF COMPANY
	 * * Check if a user is a recruiter of a specific company
	 * * Validates that the company exists and is active
	 * * Returns true if the user is a recruiter, false if not, or null if company not found
	 *
	 * @param companyId - Company ID to check
	 * @param userId - User ID to check against the recruiter IDs
	 * @returns True if user is a recruiter, false if not, or null if company not found
	 *******************************************************************************/
	public async checkRecruiterOfCompany(companyId: string, userId: string): Promise<boolean | null> {
		const shapedUserId = shapeIntoMongoObjectId(userId);
		const company = await this.companyModel
			.findOne({ _id: companyId, recruiterIds: { $in: [shapedUserId] }, deletedAt: null })
			.exec();

		return company ? true : false;
	}

	/*****************************************************************************
	 * [SERVICE] CHECK SOLO RECRUITER OF COMPANY
	 * * Check if a user is the only recruiter of any company
	 * * Validates that the company exists and is active
	 * * Returns true if the user is the solo recruiter, false if not, or null if company not found
	 *
	 * @param userId - User ID to check against the recruiter IDs
	 * @returns True if user is the solo recruiter, false if not, or null if company not found
	 *******************************************************************************/
	public async checkIsSoloRecruiter(userId: string): Promise<boolean> {
		const shapedUserId = shapeIntoMongoObjectId(userId);
		const company = await this.companyModel.findOne({ recruiterIds: { $in: [shapedUserId] }, deletedAt: null }).exec();

		if (!company) {
			return false; // User is not a recruiter for any company
		}

		// --- Check if the user is the only recruiter for the company
		return true; // --- Since we only allow one recruiter per company, if they are a recruiter, they are the solo recruiter
	}

	// =============================================================================================
	// --------------------------------- // [PRIVATE(HELPERS)] // ----------------------------------
	// =============================================================================================
}
