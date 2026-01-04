import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateContentModerationInput, ContentModerationSettings } from '../../libs/dto/admin';
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
	 * Update content moderation settings
	 *
	 * Allows admins to configure how user-generated content is moderated,
	 * including auto-moderation rules, quotas, and expiration policies.
	 *
	 * @param input - Partial update for moderation settings
	 * @param user - Authenticated admin user (from AuthGuard)
	 * @returns Updated content moderation settings
	 *
	 * @example
	 * mutation {
	 *   updateContentModerationSettings(input: {
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
	@Mutation(() => ContentModerationSettings, {
		description: 'Update content moderation settings (Admin only)',
	})
	async updateContentModerationSettings(
		@Args('input') input: UpdateContentModerationInput,
		@AuthUser() user: any,
	): Promise<ContentModerationSettings> {
		return this.adminService.updateContentModeration(input, user._id);
	}

	/**
	 * Get current content moderation settings
	 *
	 * Retrieves all current moderation configuration including auto-moderation
	 * rules, content limits, and expiration policies.
	 *
	 * @param user - Authenticated admin user (from AuthGuard)
	 * @returns Current content moderation settings
	 *
	 * @example
	 * query {
	 *   getContentModerationSettings {
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
	@Query(() => ContentModerationSettings, {
		description: 'Get content moderation settings (Admin only)',
	})
	async getContentModerationSettings(@AuthUser() user: any): Promise<ContentModerationSettings> {
		return this.adminService.getContentModerationSettings();
	}
}
