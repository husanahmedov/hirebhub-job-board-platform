import { ObjectId } from 'bson';

export const shapeIntoMongoObjectId = (targetId: any) => {
	return typeof targetId === 'string' ? new ObjectId(targetId) : targetId;
};

/** AGGREGATION PIPELINES **/

export const JOBS_AGGREGATION_PIPELINES = {
	/** Pipeline to lookup company data */
	JOB_METRICS: {
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
		trending: {
			$expr: {
				$and: [{ $eq: [{ $gte: ['$viewsCount', 500] }, true] }, { $eq: [{ $gte: ['$applicationsCount', 25] }, true] }],
			},
		},
	},

	COMPANY_LOOKUP: {
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
				}
			],
		},
	},

	POSTED_BY_LOOKUP: {
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
	},

	APPLICATIONS_DATA_LOOKUP: {
		$lookup: {
			from: 'applications',
			localField: '_id',
			foreignField: 'jobId',
			as: 'applicationsData',
		},
	},
};
