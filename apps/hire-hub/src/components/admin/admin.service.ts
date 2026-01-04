import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateContentSettingsInput, ContentSettings } from '../../libs/dto/admin';

/**
 * AdminService - Handles all admin-related operations
 *
 * This service provides methods for managing system settings,
 * including content moderation, rate limits, and feature flags.
 */
@Injectable()
export class AdminService {
	constructor(
		@InjectModel('SystemSetting')
		private systemSettingModel: Model<any>,
	) {}

	/**
	 * Update content settings
	 * @param input - Partial update input for content settings
	 * @param adminId - ID of the admin making the changes
	 * @returns Updated content settings
	 */
	async updateContentSettings(input: UpdateContentSettingsInput, adminId: string): Promise<ContentSettings> {
		const updates: Promise<any>[] = [];

		// Convert input fields to key-value updates
		for (const [key, value] of Object.entries(input)) {
			if (value !== undefined) {
				updates.push(
					this.systemSettingModel.updateOne(
						{ key, category: 'moderation' },
						{
							value,
							lastUpdatedBy: adminId,
							updatedAt: new Date(),
						},
						{ upsert: true }, // Create if doesn't exist
					),
				);
			}
		}

		// Execute all updates in parallel
		await Promise.all(updates);

		// Return updated settings
		return this.getContentSettings();
	}

	/**
	 * Get all content settings
	 * @returns Current content settings
	 */
	async getContentSettings(): Promise<ContentSettings> {
		const settings = await this.systemSettingModel.find({ category: 'moderation' }).lean().exec();

		// Convert array of settings to object with default values
		const result: any = {
			autoModerateJobPosts: false,
			autoModerateCompanyReviews: true,
			profanityFilterEnabled: true,
			maxJobPostsPerCompany: 50,
			jobPostExpirationDays: 30,
			reviewModerationRequired: true,
		};

		// Override with actual values from database
		settings.forEach((setting) => {
			if (setting.key in result) {
				result[setting.key] = setting.value;
			}
		});

		return result;
	}

	/**
	 * Initialize default content settings if they don't exist
	 * This should be called on application bootstrap
	 */
	async initializeDefaultContentSettings(): Promise<void> {
		const defaultSettings = [
			{
				key: 'autoModerateJobPosts',
				category: 'moderation',
				value: false,
				type: 'boolean',
				description: 'Automatically moderate job posts before publishing',
				isEditable: true,
			},
			{
				key: 'autoModerateCompanyReviews',
				category: 'moderation',
				value: true,
				type: 'boolean',
				description: 'Automatically moderate company reviews',
				isEditable: true,
			},
			{
				key: 'profanityFilterEnabled',
				category: 'moderation',
				value: true,
				type: 'boolean',
				description: 'Enable profanity filter for user content',
				isEditable: true,
			},
			{
				key: 'maxJobPostsPerCompany',
				category: 'moderation',
				value: 50,
				type: 'number',
				description: 'Maximum job posts allowed per company',
				isEditable: true,
			},
			{
				key: 'jobPostExpirationDays',
				category: 'moderation',
				value: 30,
				type: 'number',
				description: 'Days until job posts automatically expire',
				isEditable: true,
			},
			{
				key: 'reviewModerationRequired',
				category: 'moderation',
				value: true,
				type: 'boolean',
				description: 'Require manual review approval for company reviews',
				isEditable: true,
			},
		];

		// Insert settings that don't exist yet
		for (const setting of defaultSettings) {
			await this.systemSettingModel.updateOne(
				{ key: setting.key, category: setting.category },
				{ $setOnInsert: setting },
				{ upsert: true },
			);
		}
	}
}
