import { Schema } from 'mongoose';
import { CompanyIndustry, CompanySize, CompanyPlan } from '../libs/enums/company';
import { User } from '../libs';

/**
 * Location Sub-Schema - Nested schema for company location with geospatial support
 *
 * This sub-schema stores location data including address, city, country, and coordinates
 * for geospatial queries (e.g., finding companies within a certain distance).
 *
 * @type GeoJSON Point format for MongoDB geospatial queries
 */
const LocationSchema = new Schema(
	{
		/**
		 * Full street address of the company
		 * @example "123 Main Street, Suite 400"
		 */
		address: {
			type: String,
			trim: true,
			maxlength: 255,
		},

		/**
		 * City where the company is located
		 * @example "San Francisco"
		 */
		city: {
			type: String,
			trim: true,
			maxlength: 100,
		},

		/**
		 * State or province
		 * @example "California" or "CA"
		 */
		state: {
			type: String,
			trim: true,
			maxlength: 100,
		},

		/**
		 * Country where the company is located
		 * @example "United States"
		 */
		country: {
			type: String,
			trim: true,
			maxlength: 100,
		},

		/**
		 * Postal/ZIP code
		 * @example "94103"
		 */
		zipCode: {
			type: String,
			trim: true,
			maxlength: 20,
		},

		/**
		 * GeoJSON coordinates for geospatial queries
		 * @format GeoJSON Point { type: 'Point', coordinates: [longitude, latitude] }
		 * @example { type: 'Point', coordinates: [-122.4194, 37.7749] }
		 */
		coordinates: {
			type: {
				type: String,
				enum: ['Point'],
				default: 'Point',
			},
			coordinates: {
				type: [Number], // [longitude, latitude]
				validate: {
					validator: function (coords: number[]) {
						return coords.length === 2 && coords[0] >= -180 && coords[0] <= 180 && coords[1] >= -90 && coords[1] <= 90;
					},
					required: false,
					message: 'Coordinates must be [longitude, latitude] with valid ranges',
				},
			},
		},
	},
	{ _id: false }, // Don't create _id for subdocuments
);

/**
 * Company Schema - MongoDB schema definition for company documents
 *
 * @collection companies
 * @indexes
 * - name: Text index for full-text search
 * - slug: Unique index for URL-friendly company identifiers
 * - recruiterIds: Index for finding companies by recruiter
 * - industry + size: Compound index for filtering companies
 * - verified + plan: Compound index for verified/subscription queries
 * - location.coordinates: 2dsphere index for geospatial queries
 * - createdAt: Index for sorting by creation date
 * - deletedAt: Sparse index for soft-deleted companies
 *
 * @virtuals
 * - jobCount: Number of active jobs posted by this company
 * - reviewCount: Number of reviews received
 * - averageRating: Average rating from reviews
 *
 * @performance
 * - Automatic timestamps (createdAt, updatedAt)
 * - Optimized indexes for common queries
 * - Geospatial support for location-based searches
 * - Text search support for company name and description
 */
const CompanySchema = new Schema(
	{
		name: {
			type: String,
			required: [true, 'Company name is required'],
			trim: true,
			minlength: [2, 'Company name must be at least 2 characters'],
			maxlength: [200, 'Company name cannot exceed 200 characters'],
		},
		industry: {
			type: String,
			enum: Object.values(CompanyIndustry),
			required: false,
		},

		size: {
			type: String,
			enum: Object.values(CompanySize),
			required: false,
		},

		bio: {
			type: String,
			trim: true,
			maxlength: [100, 'Bio cannot exceed 100 characters'],
		},

		description: {
			type: String,
			trim: true,
			maxlength: [5000, 'Description cannot exceed 5000 characters'],
		},
		website: {
			type: String,
			trim: true,
			maxlength: 500,
			match: [/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/, 'Please provide a valid website URL'],
		},

		location: {
			type: LocationSchema,
			required: false,
		},

		logoUrl: {
			type: String,
			trim: true,
			maxlength: 1000,
		},

		ownerId: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'Company owner is required'],
			index: true,
		},

		recruiterIds: {
			type: [Schema.Types.ObjectId],
			ref: 'User',
			default: [],
			validate: {
				validator: function (ids: User[]) {
					return ids.length <= 100; // Max 100 recruiters per company
				},
				message: 'A company cannot have more than 100 recruiters',
			},
		},
		verified: {
			type: Boolean,
			default: false,
			index: true,
		},
		plan: {
			type: String,
			enum: Object.values(CompanyPlan),
			default: CompanyPlan.FREE,
		},

		activelyHiring: {
			type: Boolean,
			default: false,
			index: true,
			description: 'Indicates if the company is actively hiring (has active job postings)',
			// This field can be updated via a scheduled job that checks for active job postings
			// or can be set manually by admins/recruiters when they post jobs
		},

		openRoles: {
			type: Number,
			default: 0,
			description: 'Number of open job roles currently posted by the company',
		},

		founded: {
			type: Date,
			description: 'Date when the company was founded',
		},

		employeeCount: {
			type: Number,
			min: 0,
			description: 'Number of employees working at the company',
		},

		keyBenefits: {
			type: [String],
			default: [],
			description: 'List of key benefits offered by the company (e.g., health insurance, remote work, etc.)',
		},

		createdAt: {
			type: Date,
			default: Date.now,
		},
		updatedAt: {
			type: Date,
			default: Date.now,
		},
		deletedAt: {
			type: Date,
			default: null,
		},
	},
	{
		timestamps: true, // Automatically manage createdAt and updatedAt
		collection: 'companies',
		toJSON: { virtuals: true }, // Include virtuals when converting to JSON
		toObject: { virtuals: true }, // Include virtuals when converting to object
	},
);

// ==================== INDEXES ====================

/**
 * Text index for full-text search on name and description
 * Allows searching companies by name or description keywords
 * @weight name: 10 (higher priority), description: 5
 */
CompanySchema.index(
	{ name: 'text', description: 'text' },
	{
		weights: {
			name: 10, // Name matches are more important
			description: 5,
		},
		name: 'company_text_search',
	},
);

/**
 * Compound index for filtering by industry and size
 * Common query pattern: Show me all MEDIUM-sized IT companies
 */
CompanySchema.index({ industry: 1, size: 1 }, { name: 'industry_size_idx' });

/**
 * Compound index for verified and plan queries
 * Common query pattern: Show me all verified PRO companies
 */
CompanySchema.index({ verified: 1, plan: 1 }, { name: 'verified_plan_idx' });

/**
 * Index on ownerId for finding companies by owner
 * Allows efficient queries like: "Show me all companies this user owns"
 */
CompanySchema.index({ ownerId: 1 }, { name: 'owner_id_idx' });
// ==================== INDEXES ====================
// create uniquenes for owner for company
CompanySchema.index({ ownerId: 1 }, { unique: true, name: 'unique_owner_idx' });

/**
 * Index on recruiterIds for finding companies by recruiter
 * Allows efficient queries like: "Show me all companies this recruiter manages"
 */
CompanySchema.index({ recruiterIds: 1 }, { name: 'recruiter_ids_idx' });

/**
 * 2dsphere index for geospatial queries on location coordinates
 * Allows queries like: "Find companies within 50km of this point"
 */
CompanySchema.index({ 'location.coordinates': '2dsphere' }, { name: 'location_geo_idx' });

/**
 * Index on createdAt for sorting by creation date
 * Descending order for "newest first" queries
 */
CompanySchema.index({ createdAt: -1 }, { name: 'created_at_idx' });

/**
 * Sparse index on deletedAt for soft-deleted companies
 * Only indexes documents where deletedAt is not null
 * Improves performance when filtering out deleted companies
 */
CompanySchema.index({ deletedAt: 1 }, { sparse: true, name: 'deleted_at_idx' });

/**
 * Compound index for active companies (not deleted)
 * Optimizes queries that filter by deletion status and sort by creation date
 */
CompanySchema.index({ deletedAt: 1, createdAt: -1 }, { name: 'active_companies_idx' });

// ==================== VIRTUALS ====================

/**
 * Virtual field: jobCount
 * Returns the number of active jobs posted by this company
 * This is populated via aggregation in the service layer
 * @virtual
 */
CompanySchema.virtual('jobCount', {
	ref: 'Job',
	localField: '_id',
	foreignField: 'companyId',
	count: true,
	match: { deletedAt: null }, // Only count active jobs
});

/**
 * Virtual field: reviewCount
 * Returns the number of reviews received by this company
 * This is populated via aggregation in the service layer
 * @virtual
 */
CompanySchema.virtual('reviewCount', {
	ref: 'CompanyReview',
	localField: '_id',
	foreignField: 'companyId',
	count: true,
});

/**
 * Virtual field: averageRating
 * Returns the average rating from all company reviews
 * This is computed via aggregation in the service layer (not a true Mongoose virtual)
 * @virtual
 */
CompanySchema.virtual('averageRating').get(function () {
	// This will be computed in aggregation pipelines
	// Kept here for documentation purposes
	return (this as any)._averageRating || 0;
});

// ==================== MIDDLEWARE ====================

/**
 * Pre-save middleware: Update updatedAt timestamp
 */
CompanySchema.pre('save', function (next) {
	this.updatedAt = new Date();
	next();
});

/**
 * Pre-find middleware: Automatically exclude soft-deleted companies
 * This runs on find, findOne, findById, etc.
 */
CompanySchema.pre(/^find/, function (next) {
	// Only exclude deleted if not explicitly querying for them
	const query = (this as any).getQuery();
	if (!query.deletedAt) {
		(this as any).setQuery({ ...query, deletedAt: null });
	}
	next();
});

export default CompanySchema;
