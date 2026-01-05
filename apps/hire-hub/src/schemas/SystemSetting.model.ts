import { Schema } from 'mongoose';
import { SystemCategoryEnum, SystemDataTypeEnum } from '../libs/enums';

/**
 * SystemSetting Schema - Key-value storage for system-wide configuration
 *
 * This schema provides a flexible way to store and manage system settings
 * without requiring schema changes for new settings. Each setting is stored
 * as a separate document with metadata for categorization and auditing.
 *
 * @collection system_settings
 * @indexes
 * - key: Unique index for fast setting lookups
 * - category: Index for retrieving settings by category
 * - category + key: Compound index for optimal queries
 *
 * @features
 * - Flexible value storage (Mixed type supports any data structure)
 * - Categorization for logical grouping
 * - Type information for validation
 * - Edit control flags
 * - Audit trail with timestamps and user tracking
 *
 * @categories
 * - platform: Core platform configuration
 * - moderation: Content moderation rules
 * - limits: Rate limits and quotas
 * - features: Feature flags
 * - notifications: Notification settings
 * - security: Security and privacy settings
 * - search: Search and discovery settings
 */
const SystemSettingSchema = new Schema(
	{
		/**
		 * Unique key identifier for the setting
		 * @example 'autoModerateJobPosts', 'maxJobPostsPerCompany'
		 * @unique Must be unique across all settings
		 * @indexed Automatically indexed via unique constraint
		 */
		key: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			maxlength: 100,
		},

		/**
		 * Category for logical grouping of settings
		 * @indexed For efficient category-based queries
		 */
		category: {
			type: String,
			required: true,
			enum: Object.values(SystemCategoryEnum),
			index: true,
		},

		/**
		 * The actual value of the setting
		 * Supports any data type: boolean, number, string, array, object
		 */
		value: {
			type: Schema.Types.Mixed,
			required: true,
		},

		/**
		 * Data type of the value (for validation and UI rendering)
		 */
		type: {
			type: String,
			required: true,
			enum: Object.values(SystemDataTypeEnum),
		},

		/**
		 * Human-readable description for admin UI
		 * @optional
		 */
		description: {
			type: String,
			required: false,
			maxlength: 500,
		},

		/**
		 * Whether this setting can be modified through admin panel
		 * Some critical settings should only be changed via code/config
		 * @default true
		 */
		isEditable: {
			type: Boolean,
			default: true,
		},

		/**
		 * Admin user who last updated this setting
		 * @ref User
		 * @optional
		 */
		lastUpdatedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: false,
		},
	},
	{
		timestamps: true, // Automatically manage createdAt and updatedAt
		collection: 'system_settings',
	},
);

/**
 * Compound index for optimal category + key queries
 * This supports both:
 * - Finding a specific setting: { category: 'moderation', key: 'autoModerate' }
 * - Finding all settings in a category: { category: 'moderation' }
 */
SystemSettingSchema.index({ category: 1, key: 1 });

/**
 * Index for key-only lookups
 * Already covered by unique constraint, but explicitly defined for clarity
 */
SystemSettingSchema.index({ key: 1 });

export { SystemSettingSchema };
