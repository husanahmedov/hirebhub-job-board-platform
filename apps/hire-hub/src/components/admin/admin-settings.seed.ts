import { Model } from 'mongoose';
import {
	SystemCategoryEnum,
	SystemContentModerationKeysEnum,
	SystemDataTypeEnum,
	SystemRateLimitModerationKeysEnum,
} from '../../libs/enums/system-settings.enum';

/**
 * Seed default system settings
 *
 * This function initializes all default system settings if they don't exist.
 * Should be called on application bootstrap to ensure all settings are available.
 *
 * @param systemSettingModel - The SystemSetting mongoose model
 */
export async function seedDefaultSystemSettings(systemSettingModel: Model<any>): Promise<void> {
	const defaultSettings = [
		// Content Moderation Settings
		{
			key: SystemContentModerationKeysEnum.AUTO_MODERATE_JOB_POSTS,
			category: SystemCategoryEnum.MODERATION,
			value: false,
			type: SystemDataTypeEnum.BOOLEAN,
			description: 'Automatically moderate job posts before publishing',
			isEditable: true,
		},
		{
			key: SystemContentModerationKeysEnum.AUTO_MODERATE_COMPANY_REVIEWS,
			category: SystemCategoryEnum.MODERATION,
			value: true,
			type: SystemDataTypeEnum.BOOLEAN,
			description: 'Automatically moderate company reviews',
			isEditable: true,
		},
		{
			key: SystemContentModerationKeysEnum.PROFANITY_FILTER_ENABLED,
			category: SystemCategoryEnum.MODERATION,
			value: true,
			type: SystemDataTypeEnum.BOOLEAN,
			description: 'Enable profanity filter for user content',
			isEditable: true,
		},
		{
			key: SystemContentModerationKeysEnum.MAX_JOB_POSTS_PER_COMPANY,
			category: SystemCategoryEnum.MODERATION,
			value: 50,
			type: SystemDataTypeEnum.NUMBER,
			description: 'Maximum job posts allowed per company',
			isEditable: true,
		},
		{
			key: SystemContentModerationKeysEnum.JOB_POST_EXPIRATION_DAYS,
			category: SystemCategoryEnum.MODERATION,
			value: 30,
			type: SystemDataTypeEnum.NUMBER,
			description: 'Days until job posts automatically expire',
			isEditable: true,
		},
		{
			key: SystemContentModerationKeysEnum.REVIEW_MODERATION_REQUIRED,
			category: SystemCategoryEnum.MODERATION,
			value: true,
			type: SystemDataTypeEnum.BOOLEAN,
			description: 'Require manual review approval for company reviews',
			isEditable: true,
		},

		// rate limits default settings
		{
			key: SystemRateLimitModerationKeysEnum.MAX_APPLICATIONS_PER_DAY,
			category: SystemCategoryEnum.RATE_LIMITS,
			value: 100,
			type: SystemDataTypeEnum.NUMBER,
			description: 'Maximum job applications allowed per user per day',
		},
		{
			key: SystemRateLimitModerationKeysEnum.MAX_JOB_POSTS_PER_MONTH,
			category: SystemCategoryEnum.RATE_LIMITS,
			value: 20,
			type: SystemDataTypeEnum.NUMBER,
			description: 'Maximum job posts allowed per company per month',
		},
		{
			key: SystemRateLimitModerationKeysEnum.MAX_RESUME_UPLOADS,
			category: SystemCategoryEnum.RATE_LIMITS,
			value: 10,
			type: SystemDataTypeEnum.NUMBER,
			description: 'Maximum resume uploads allowed per user',
		},
		{
			key: SystemRateLimitModerationKeysEnum.API_RATE_LIMIT_PER_MINUTE,
			category: SystemCategoryEnum.RATE_LIMITS,
			value: 60,
			type: SystemDataTypeEnum.NUMBER,
			description: 'API rate limit per minute per user',
		},
		{
			key: SystemRateLimitModerationKeysEnum.BULK_OPERATION_LIMIT,
			category: SystemCategoryEnum.RATE_LIMITS,
			value: 1000,
			type: SystemDataTypeEnum.NUMBER,
			description: 'Maximum records allowed in bulk operations',
		},
	];

	console.log('🌱 Seeding default system settings...');

	let insertedCount = 0;
	let existingCount = 0;

	// Insert settings that don't exist yet
	for (const setting of defaultSettings) {
		const result = await systemSettingModel.updateOne(
			{ key: setting.key, category: setting.category },
			{ $setOnInsert: setting },
			{ upsert: true },
		);

		if (result.upsertedCount > 0) {
			insertedCount++;
		} else {
			existingCount++;
		}
	}

	console.log(`✅ Seeding complete: ${insertedCount} new settings added, ${existingCount} existing settings found`);
}
