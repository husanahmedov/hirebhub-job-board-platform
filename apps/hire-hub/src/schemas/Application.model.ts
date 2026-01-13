import { Schema } from 'mongoose';
import { ApplicationStatus, ApplicationSource } from '../libs/enums/applications';

/**
 * Attachment Sub-Schema - File attachments for applications (resume, cover letter, etc.)
 */
const AttachmentSchema = new Schema(
	{
		fileName: {
			type: String,
			required: true,
			trim: true,
		},
		fileUrl: {
			type: String,
			required: true,
			trim: true,
		},
		fileType: {
			type: String,
			required: true,
		},
		fileSize: {
			type: Number,
			required: true,
		},
		uploadedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ _id: false },
);

/**
 * Note Sub-Schema - Internal notes about the application (for recruiters)
 */
const NoteSchema = new Schema(
	{
		content: {
			type: String,
			required: true,
			trim: true,
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		createdAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ _id: true },
);

/**
 * Application Schema - Main schema for job applications
 *
 * This schema stores all information related to job applications including
 * candidate information, job reference, status tracking, and communication history.
 *
 * @collection applications
 */
const ApplicationSchema = new Schema(
	{
		/**
		 * Reference to the job posting
		 */
		jobId: {
			type: Schema.Types.ObjectId,
			ref: 'Job',
			required: [true, 'Job ID is required'],
			index: true,
		},

		/**
		 * Reference to the candidate (user) applying
		 */
		candidateId: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'Candidate ID is required'],
			index: true,
		},

		/**
		 * Reference to the company (denormalized for quick access)
		 */
		companyId: {
			type: Schema.Types.ObjectId,
			ref: 'Company',
			required: [true, 'Company ID is required'],
			index: true,
		},

		/**
		 * Application status
		 */
		status: {
			type: String,
			enum: Object.values(ApplicationStatus),
			default: ApplicationStatus.PENDING,
			required: [true, 'Status is required'],
			index: true,
		},

		/**
		 * Source of the application
		 */
		source: {
			type: String,
			enum: Object.values(ApplicationSource),
			default: ApplicationSource.PLATFORM,
			required: [true, 'Source is required'],
		},

		/**
		 * Cover letter text
		 */
		coverLetter: {
			type: String,
			trim: true,
			maxlength: [5000, 'Cover letter cannot exceed 5000 characters'],
		},

		/**
		 * Array of file attachments (resume, portfolio, certificates, etc.)
		 */
		attachments: {
			type: [AttachmentSchema],
			default: [],
		},

		/**
		 * Internal notes from recruiters/hiring managers
		 */
		notes: {
			type: [NoteSchema],
			default: [],
		},

		/**
		 * Application score/rating (0-100)
		 */
		score: {
			type: Number,
			min: 0,
			max: 100,
			default: null,
		},

		/**
		 * Date when application was submitted
		 */
		appliedAt: {
			type: Date,
			default: Date.now,
			required: true,
			index: true,
		},

		/**
		 * Date when application was last updated
		 */
		updatedAt: {
			type: Date,
			default: Date.now,
		},

		/**
		 * Date when application was created
		 */
		createdAt: {
			type: Date,
			default: Date.now,
			immutable: true,
		},

		/**
		 * Soft delete timestamp
		 */
		deletedAt: {
			type: Date,
			default: null,
			index: true,
		},
	},
	{
		timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
		collection: 'applications',
	},
);

// ==================== INDEXES ====================

/**
 * Compound index for preventing duplicate applications
 * A user can only apply once to a specific job
 */
ApplicationSchema.index(
	{ jobId: 1, candidateId: 1 },
	{
		unique: true,
		partialFilterExpression: { deletedAt: null },
		name: 'unique_job_candidate_application',
	},
);

/**
 * Index for querying applications by company
 */
ApplicationSchema.index({ companyId: 1, status: 1, deletedAt: 1 });

/**
 * Index for querying applications by job
 */
ApplicationSchema.index({ jobId: 1, status: 1, appliedAt: -1 });

/**
 * Index for querying applications by candidate
 */
ApplicationSchema.index({ candidateId: 1, appliedAt: -1, deletedAt: 1 });

/**
 * Index for filtering by status and date
 */
ApplicationSchema.index({ status: 1, appliedAt: -1 });

// ==================== MIDDLEWARE ====================

/**
 * Pre-save middleware to update the updatedAt timestamp
 */
ApplicationSchema.pre('save', function (next) {
	this.updatedAt = new Date();
	next();
});

/**
 * Pre-update middleware to update the updatedAt timestamp
 */
ApplicationSchema.pre('findOneAndUpdate', function (next) {
	this.set({ updatedAt: new Date() });
	next();
});

export default ApplicationSchema;
