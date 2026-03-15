import { Schema } from 'mongoose';
import { JobType, JobLevel, SalaryCurrency, Visibility, JobProfession } from '../libs/enums/job';

/**
 * Location Sub-Schema - Job location information
 */
const JobLocationSchema = new Schema(
	{
		city: {
			type: String,
			trim: true,
			maxlength: 100,
		},
		region: {
			type: String,
			trim: true,
			maxlength: 100,
		},
		country: {
			type: String,
			trim: true,
			maxlength: 100,
		},
		remote: {
			type: Boolean,
			default: false,
		},
	},
	{ _id: false },
);

/**
 * Salary Range Sub-Schema - Salary information with visibility control
 */
const SalaryRangeSchema = new Schema(
	{
		min: {
			type: Number,
			min: 0,
		},
		max: {
			type: Number,
			min: 0,
		},
		currency: {
			type: String,
			enum: Object.values(SalaryCurrency),
			default: SalaryCurrency.USD,
		},
		visibility: {
			type: String,
			enum: Object.values(Visibility),
			default: Visibility.PUBLIC,
		},
	},
	{ _id: false },
);

/**
 * Job Schema - Main schema for job postings
 *
 * This schema stores all information related to job postings including
 * company details, job requirements, salary information, and application tracking.
 */
const JobSchema = new Schema(
	{
		/**
		 * Reference to the company posting this job
		 */
		companyId: {
			type: Schema.Types.ObjectId,
			ref: 'Company',
			required: [false, 'Company ID is required'],
			index: true,
		},

		/**
		 * Reference to the user who posted this job (typically a recruiter or company owner)
		 */
		postedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'Posted by user ID is required'],
			index: true,
		},

		/**
		 * Job title
		 */
		title: {
			type: String,
			required: [true, 'Job title is required'],
			trim: true,
			minlength: [3, 'Job title must be at least 3 characters'],
			maxlength: [200, 'Job title cannot exceed 200 characters'],
		},

		jobProfession: {
			type: String,
			enum: Object.values(JobProfession),
			required: [true, 'Job profession is required'],
			index: true,
		},

		/**
		 * Full job description (HTML or markdown)
		 */
		description: {
			type: String,
			trim: true,
			maxlength: [10000, 'Description cannot exceed 10000 characters'],
		},

		/**
		 * Rich text job description with formatting (HTML)
		 * This allows recruiters to freely format job details including requirements and benefits
		 */
		richDescription: {
			type: String,
			trim: true,
			maxlength: [50000, 'Rich description cannot exceed 50000 characters'],
		},

		/**
		 * Short description or summary
		 */
		shortDescriptions: [
			{
				type: String,
				trim: true,
				maxlength: [150, 'Short description cannot exceed 150 characters'],
			},
		],

		/**
		 * Employment type (full-time, part-time, contract, etc.)
		 */
		employmentType: {
			type: String,
			enum: Object.values(JobType),
			required: [true, 'Employment type is required'],
			index: true,
		},

		/**
		 * Seniority level (entry, middle, senior, etc.)
		 */
		seniorityLevel: {
			type: String,
			enum: Object.values(JobLevel),
			required: [true, 'Seniority level is required'],
			index: true,
		},

		/**
		 * Job location information
		 */
		location: {
			type: JobLocationSchema,
			required: [true, 'Location is required'],
		},

		/**
		 * Salary range information
		 */
		salaryRange: {
			type: SalaryRangeSchema,
		},

		/**
		 * Job tags for categorization (e.g., "JavaScript", "Remote", "Healthcare")
		 */
		tags: {
			type: [String],
			default: [],
			index: true,
		},

		/**
		 * Required skills for the position
		 */
		skills: {
			type: [String],
			default: [],
		},

		/**
		 * Job requirements/qualifications (optional - for structured search/filtering)
		 * Can be auto-extracted from richDescription using AI
		 */
		requirements: {
			type: [String],
			default: [],
			required: false,
		},

		/**
		 * Benefits offered with this position (optional - for structured search/filtering)
		 * Can be auto-extracted from richDescription using AI
		 */
		benefits: {
			type: [String],
			default: [],
			required: false,
		},

		/**
		 * Application deadline
		 */
		applicationDeadline: {
			type: Date,
			index: true,
		},

		/**
		 * Whether the job is published and visible
		 */
		isPublished: {
			type: Boolean,
			default: false,
			index: true,
		},

		isRemote: {
			type: Boolean,
			default: false,
			index: true,
		},

		/**
		 * Visibility level (public, private, unlisted)
		 */
		visibility: {
			type: String,
			enum: Object.values(Visibility),
			default: Visibility.PUBLIC,
			index: true,
		},

		/**
		 * Number of times this job has been viewed
		 */
		viewsCount: {
			type: Number,
			default: 0,
			min: 0,
		},

		/**
		 * Images or media associated with the job posting
		 */
		images: {
			type: [String],
			default: [],
			required: false,
		},

		/**
		 * Number of applications received for this job
		 */
		applicationsCount: {
			type: Number,
			default: 0,
			min: 0,
		},

		/**
		 * Date when the job was closed/filled
		 */
		closedAt: {
			type: Date,
		},

		/**
		 * Soft delete timestamp
		 */
		deletedAt: {
			type: Date,
			index: true,
		},
		featured: {
			type: Boolean,
			default: false,
			index: true,
		},
		urgent: {
			type: Boolean,
			default: false,
			index: true,
		},
	},
	{
		timestamps: true,
		collection: 'jobs',
	},
);

// Indexes for common query patterns
JobSchema.index({ companyId: 1, isPublished: 1, deletedAt: 1 });
JobSchema.index({ employmentType: 1, seniorityLevel: 1, isPublished: 1 });
JobSchema.index({ 'location.city': 1, isPublished: 1 });
JobSchema.index({ 'location.remote': 1, isPublished: 1 });
JobSchema.index({ tags: 1, isPublished: 1 });
JobSchema.index({ createdAt: -1, isPublished: 1 });
JobSchema.index({ applicationDeadline: 1, isPublished: 1 });

// Text index for full-text search
JobSchema.index({ title: 'text', description: 'text', richDescription: 'text' });

export { JobSchema };
export type JobDocument = any;
