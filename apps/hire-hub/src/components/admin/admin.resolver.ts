import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
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
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/decorators/authUser.decorator';
import { UserRole } from '../../libs';

/***
 * CRITICAL: ADMIN OPERATIONS
 ***/
@Resolver()
export class AdminResolver {
	constructor(private readonly adminService: AdminService) {}

	/***
	 * CRITICAL: UPDATE CONTENT SETTINGS
	 ***/
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

	/***
	 * INFO: GET CONTENT SETTINGS
	 ***/
	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Query(() => ContentSettings, {
		description: 'Get content settings (Admin only)',
	})
	async getContentSettings(@AuthUser() user: any): Promise<ContentSettings> {
		return this.adminService.getContentSettings();
	}

	/***
	 * INFO: FEATURES SETTINGS
	 ***/
	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard, AuthGuard)
	@Mutation(() => FeaturesSettings)
	async updateFeaturesSettings(
		@Args('input') input: FeaturesSettingsInput,
		@AuthUser() user: any,
	): Promise<FeaturesSettings> {
		return this.adminService.updateFeaturesSettings(input, user._id);
	}

	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard, AuthGuard)
	@Query(() => FeaturesSettings)
	async getFeaturesSettings(): Promise<FeaturesSettings> {
		return this.adminService.getFeaturesSettings();
	}

	/***
	 * INFO: NOTIFICATIONS SETTINGS
	 ***/
	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard, AuthGuard)
	@Mutation(() => EmailNotificationsSettings)
	async updateNotificationsSettings(
		@Args('input') input: EmailNotificationsSettingsInput,
		@AuthUser() user: any,
	): Promise<EmailNotificationsSettings> {
		return this.adminService.updateNotificationsSettings(input, user._id);
	}

	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard, AuthGuard)
	@Query(() => EmailNotificationsSettings)
	async getNotificationsSettings(): Promise<EmailNotificationsSettings> {
		return this.adminService.getNotificationsSettings();
	}

	/***
	 * INFO: PAYMENT & BILLING SETTINGS
	 ***/
	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard, AuthGuard)
	@Mutation(() => PaymentBillingSettings)
	async updatePaymentBillingSettings(
		@Args('input') input: PaymentBillingSettingsInput,
		@AuthUser() user: any,
	): Promise<PaymentBillingSettings> {
		return this.adminService.updatePaymentBillingSettings(input, user._id);
	}

	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard, AuthGuard)
	@Query(() => PaymentBillingSettings)
	async getPaymentBillingSettings(): Promise<PaymentBillingSettings> {
		return this.adminService.getPaymentBillingSettings();
	}

	/***
	 * INFO: PLATFORM SETTINGS
	 ***/
	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard, AuthGuard)
	@Mutation(() => PlatformSettings)
	async updatePlatformSettings(
		@Args('input') input: PlatformSettingsInput,
		@AuthUser() user: any,
	): Promise<PlatformSettings> {
		return this.adminService.updatePlatformSettings(input, user._id);
	}

	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard, AuthGuard)
	@Query(() => PlatformSettings)
	async getPlatformSettings(): Promise<PlatformSettings> {
		return this.adminService.getPlatformSettings();
	}

	/***
	 * INFO: RATE LIMITS SETTINGS
	 ***/
	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard, AuthGuard)
	@Mutation(() => RateLimitsSettings)
	async updateRateLimitsSettings(
		@Args('input') input: RateLimitsSettingsInput,
		@AuthUser() user: any,
	): Promise<RateLimitsSettings> {
		return this.adminService.updateRateLimitsSettings(input, user._id);
	}

	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard, AuthGuard)
	@Query(() => RateLimitsSettings)
	async getRateLimitsSettings(): Promise<RateLimitsSettings> {
		return this.adminService.getRateLimitsSettings();
	}
}
