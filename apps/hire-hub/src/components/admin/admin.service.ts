import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
	UpdateContentSettingsInput,
	ContentSettings,
	FeaturesSettingsInput,
	FeaturesSettings,
	EmailNotificationsSettingsInput,
	EmailNotificationsSettings,
	PaymentBillingSettingsInput,
	PaymentBillingSettings,
	PlatformSettingsInput,
	PlatformSettings,
	RateLimitsSettingsInput,
	RateLimitsSettings,
} from '../../libs/dto/admin';

/***
 * CRITICAL: ADMIN SERVICE
 ***/
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

	// ==================== FEATURES SETTINGS ====================

	async updateFeaturesSettings(input: FeaturesSettingsInput, adminId: string): Promise<FeaturesSettings> {
		const updates: Promise<any>[] = [];

		for (const [key, value] of Object.entries(input)) {
			if (value !== undefined) {
				updates.push(
					this.systemSettingModel.updateOne(
						{ key, category: 'feature_flags' },
						{ value, lastUpdatedBy: adminId, updatedAt: new Date() },
						{ upsert: true },
					),
				);
			}
		}

		await Promise.all(updates);
		return this.getFeaturesSettings();
	}

	async getFeaturesSettings(): Promise<FeaturesSettings> {
		const settings = await this.systemSettingModel.find({ category: 'feature_flags' }).lean().exec();

		const result: any = {
			bookmarksEnabled: true,
			notificationsEnabled: true,
			companyReviewsEnabled: true,
			advancedSearchEnabled: true,
			aiRecommendationsEnabled: false,
			chatEnabled: false,
		};

		settings.forEach((setting) => {
			if (setting.key in result) {
				result[setting.key] = setting.value;
			}
		});

		return result;
	}

	// ==================== NOTIFICATIONS SETTINGS ====================

	async updateNotificationsSettings(
		input: EmailNotificationsSettingsInput,
		adminId: string,
	): Promise<EmailNotificationsSettings> {
		const updates: Promise<any>[] = [];

		for (const [key, value] of Object.entries(input)) {
			if (value !== undefined) {
				updates.push(
					this.systemSettingModel.updateOne(
						{ key, category: 'notifications' },
						{ value, lastUpdatedBy: adminId, updatedAt: new Date() },
						{ upsert: true },
					),
				);
			}
		}

		await Promise.all(updates);
		return this.getNotificationsSettings();
	}

	async getNotificationsSettings(): Promise<EmailNotificationsSettings> {
		const settings = await this.systemSettingModel.find({ category: 'notifications' }).lean().exec();

		const result: any = {
			emailNotificationsEnabled: true,
			smsNotificationsEnabled: false,
			newJobAlertEnabled: true,
			applicationStatusEmailEnabled: true,
			weeklyDigestEnabled: true,
		};

		settings.forEach((setting) => {
			if (setting.key in result) {
				result[setting.key] = setting.value;
			}
		});

		return result;
	}

	// ==================== PAYMENT & BILLING SETTINGS ====================

	async updatePaymentBillingSettings(
		input: PaymentBillingSettingsInput,
		adminId: string,
	): Promise<PaymentBillingSettings> {
		const updates: Promise<any>[] = [];

		for (const [key, value] of Object.entries(input)) {
			if (value !== undefined) {
				updates.push(
					this.systemSettingModel.updateOne(
						{ key, category: 'payment' },
						{ value, lastUpdatedBy: adminId, updatedAt: new Date() },
						{ upsert: true },
					),
				);
			}
		}

		await Promise.all(updates);
		return this.getPaymentBillingSettings();
	}

	async getPaymentBillingSettings(): Promise<PaymentBillingSettings> {
		const settings = await this.systemSettingModel.find({ category: 'payment' }).lean().exec();

		const result: any = {
			autoBillingEnabled: false,
			billingCycleInDays: 30,
			sendBillingReminders: true,
			reminderFrequencyInDays: 7,
			stripeEnabled: false,
			freePlanJobPostLimit: 5,
			proPlanJobPostLimit: 50,
			enterprisePlanJobPostLimit: 999,
			subscriptionRequired: false,
		};

		settings.forEach((setting) => {
			if (setting.key in result) {
				result[setting.key] = setting.value;
			}
		});

		return result;
	}

	// ==================== PLATFORM SETTINGS ====================

	async updatePlatformSettings(input: PlatformSettingsInput, adminId: string): Promise<PlatformSettings> {
		const updates: Promise<any>[] = [];

		for (const [key, value] of Object.entries(input)) {
			if (value !== undefined) {
				updates.push(
					this.systemSettingModel.updateOne(
						{ key, category: 'platform' },
						{ value, lastUpdatedBy: adminId, updatedAt: new Date() },
						{ upsert: true },
					),
				);
			}
		}

		await Promise.all(updates);
		return this.getPlatformSettings();
	}

	async getPlatformSettings(): Promise<PlatformSettings> {
		const settings = await this.systemSettingModel.find({ category: 'platform' }).lean().exec();

		const result: any = {
			maintenanceMode: false,
			registrationEnabled: true,
			requireEmailVerification: true,
			allowedEmailDomains: [],
			allowGuestBrowsing: true,
			platformName: 'HireHub',
			platformUrl: 'https://hirehub.com',
			supportEmail: 'support@hirehub.com',
		};

		settings.forEach((setting) => {
			if (setting.key in result) {
				result[setting.key] = setting.value;
			}
		});

		return result;
	}

	// ==================== RATE LIMITS SETTINGS ====================

	async updateRateLimitsSettings(input: RateLimitsSettingsInput, adminId: string): Promise<RateLimitsSettings> {
		const updates: Promise<any>[] = [];

		for (const [key, value] of Object.entries(input)) {
			if (value !== undefined) {
				updates.push(
					this.systemSettingModel.updateOne(
						{ key, category: 'rate_limits' },
						{ value, lastUpdatedBy: adminId, updatedAt: new Date() },
						{ upsert: true },
					),
				);
			}
		}

		await Promise.all(updates);
		return this.getRateLimitsSettings();
	}

	async getRateLimitsSettings(): Promise<RateLimitsSettings> {
		const settings = await this.systemSettingModel.find({ category: 'rate_limits' }).lean().exec();

		const result: any = {
			maxApplicationsPerDay: 10,
			maxJobPostsPerMonth: 100,
			maxResumeUploads: 5,
			apiRateLimitPerMinute: 60,
			bulkOperationLimit: 1000,
		};

		settings.forEach((setting) => {
			if (setting.key in result) {
				result[setting.key] = setting.value;
			}
		});

		return result;
	}
}
