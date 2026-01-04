import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateContentSettingsInput, ContentSettings } from '../../libs/dto/admin';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/decorators/authUser.decorator';
import { UserRole } from '../../libs';

/**
 * AdminResolver - GraphQL resolver for admin operations
 *
 * This resolver handles all admin-specific GraphQL queries and mutations,
 * including system settings management, user moderation, and analytics.
 *
 * All endpoints require ADMIN role authentication.
 */
@Resolver()
export class AdminResolver {
	constructor(private readonly adminService: AdminService) {}

	/**
	 * Update content settings
	 *
	 * Allows admins to configure content-related settings,
	 * including auto-moderation rules, quotas, and expiration policies.
	 *
	 * @param input - Partial update for content settings
	 * @param user - Authenticated admin user (from AuthGuard)
	 * @returns Updated content settings
	 *
	 * @example
	 * mutation {
	 *   updateContentSettings(input: {
	 *     autoModerateJobPosts: true
	 *     maxJobPostsPerCompany: 100
	 *   }) {
	 *     autoModerateJobPosts
	 *     maxJobPostsPerCompany
	 *   }
	 * }
	 */
	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Mutation(() => ContentSettings, {
		description: 'Update content settings (Admin only)',
	})
	async updateContentSettings(
		@Args('input') input: UpdateContentSettingsInput,
		@AuthUser() user: any,
	): Promise<ContentSettings> {
		return this.adminService.updateContentSettings(input, user._id);
	}

	/**
	 * Get current content settings
	 *
	 * Retrieves all current content configuration including auto-moderation
	 * rules, content limits, and expiration policies.
	 *
	 * @param user - Authenticated admin user (from AuthGuard)
	 * @returns Current content settings
	 *
	 * @example
	 * query {
	 *   getContentSettings {
	 *     autoModerateJobPosts
	 *     autoModerateCompanyReviews
	 *     profanityFilterEnabled
	 *     maxJobPostsPerCompany
	 *     jobPostExpirationDays
	 *     reviewModerationRequired
	 *   }
	 * }
	 */
	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Query(() => ContentSettings, {
		description: 'Get content settings (Admin only)',
	})
	async getContentSettings(@AuthUser() user: any): Promise<ContentSettings> {
		return this.adminService.getContentSettings();
	}
}
