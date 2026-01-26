import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { UserService } from './user.service';
import { RegisterUserInput, User, RefreshTokenInput, AuthResponse } from '../../libs/dto/user';
import {
	LoginUserInput,
	PublicUser,
	ResendVerificationInput,
	UpdateProfileInput,
	UpdateUserInput,
	UserRole,
	VerifyEmailInput,
	SwitchCompanyInput,
	CompanyListItem,
	ActiveCompanyOutput,
} from '../../libs';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthUser } from '../auth/decorators/authUser.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { AuthService } from '../auth/auth.service';
import type { ObjectId } from 'mongoose';
import { Step3RegisterInput, Step4RegisterInput, Step5RegisterInput } from '../../libs/';
import { WithoutGuard } from '../auth/guards/without.guard';

@Resolver()
export class UserResolver {
	constructor(
		private readonly userService: UserService,
		private readonly authService: AuthService,
	) {}

	/**
	 * Register a new user account with email, password, and profile information
	 */
	@Mutation(() => User, {
		description: 'Register a new user account with email, password, and profile information',
	})
	public async register(
		@Args('input', { type: () => RegisterUserInput, description: 'User registration data' })
		input: RegisterUserInput,
	): Promise<User> {
		return await this.userService.register(input);
	}

	/**
	 * Create or complete user profile after registration
	 */
	@Roles(UserRole.CANDIDATE)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Mutation(() => PublicUser, {
		description: "Create user profile after registration (completes user's profile data)",
	})
	public async createProfileAfterRegistration(
		@Args('input', { type: () => UpdateProfileInput, description: "User's profile data to create" })
		input: UpdateProfileInput,
		@AuthUser('_id') userId: ObjectId,
	): Promise<PublicUser> {
		console.log(`--- @mutation() Create Profile After Registration is called: ${userId} ---`);
		return await this.userService.createProfileAfterRegistration(userId, input);
	}

	/**
	 * Add education entries to user profile with automatic duplicate detection
	 */
	@Roles(UserRole.CANDIDATE)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Mutation(() => PublicUser, {
		description: 'Add education entries to user profile with automatic duplicate detection',
	})
	public async step3RegistrationProcess(
		@Args('input', { type: () => Step3RegisterInput, description: "Education data to add to user's profile" })
		input: Step3RegisterInput,
		@AuthUser('_id') userId: ObjectId,
	): Promise<PublicUser> {
		console.log(`--- @mutation() Step 3 Registration Process is called: ${userId} ---`);
		return await this.userService.step3RegistrationProcess(userId, input);
	}

	/**
	 * Add work experience entries to user profile with automatic duplicate detection
	 */
	@Roles(UserRole.CANDIDATE)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Mutation(() => PublicUser, {
		description: 'Add work experience entries to user profile with automatic duplicate detection',
	})
	public async step4RegistrationProcess(
		@Args('input', { type: () => Step4RegisterInput, description: "Experience data to add to user's profile" })
		input: Step4RegisterInput,
		@AuthUser('_id') userId: ObjectId,
	): Promise<PublicUser> {
		console.log(`--- @mutation() Step 4 Registration Process is called: ${userId} ---`);
		return await this.userService.step4RegistrationProcess(userId, input);
	}

	/**
	 * Add qualifications/certifications to user profile with automatic duplicate detection
	 */
	@Roles(UserRole.CANDIDATE)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Mutation(() => PublicUser, {
		description: 'Add qualifications to user profile with automatic duplicate detection',
	})
	public async step5RegistrationProcess(
		@Args('input', { type: () => Step5RegisterInput, description: "Qualifications data to add to user's profile" })
		input: Step5RegisterInput,
		@AuthUser('_id') userId: ObjectId,
	): Promise<PublicUser> {
		console.log(`--- @mutation() Step 5 Registration Process is called: ${userId}  ---`);
		return await this.userService.step5RegistrationProcess(userId, input);
	}

	// Add these mutations to the resolver class
	/**
	 * Verify user's email with verification code
	 */
	@Mutation(() => User, {
		description: 'Verify email address with verification code',
	})
	public async verifyEmail(
		@Args('input', { type: () => VerifyEmailInput, description: 'Email and verification code' })
		input: VerifyEmailInput,
	): Promise<User> {
		return await this.userService.verifyEmail(input);
	}

	/**
	 * Resend verification code to user's email
	 */
	@Mutation(() => String, {
		description: 'Resend verification code to email',
	})
	public async resendVerificationCode(
		@Args('input', { type: () => ResendVerificationInput, description: 'User email' })
		input: ResendVerificationInput,
	): Promise<string> {
		const result = await this.userService.resendVerificationCode(input);
		return result.message;
	}

	/**
	 * Authenticate user with email and password
	 */
	@Mutation(() => User, {
		description: 'Authenticate user with email and password, returns user with access token',
	})
	public async login(
		@Args('input', { type: () => LoginUserInput, description: 'User login credentials (email and password)' })
		input: LoginUserInput,
	): Promise<User> {
		return await this.userService.login(input);
	}

	/**
	 * Update authenticated user's own profile data
	 */
	@Roles(UserRole.CANDIDATE)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Mutation(() => PublicUser, {
		description: "Update authenticated user's own profile data (name, email, profile)",
	})
	public async updateUserByUser(
		@Args('input', { type: () => UpdateUserInput, description: 'User update data with optional fields' })
		input: UpdateUserInput,
		@AuthUser('_id') userId: ObjectId,
	): Promise<PublicUser> {
		console.log(`--- @mutation() Update User by User is called: ${userId} ---`);
		return await this.userService.updateUserByUser(userId, input);
	}

	/**
	 * Admin: Update any user's profile including privileged fields (status, role)
	 */
	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Mutation(() => PublicUser, {
		description: "Admin update any user's profile data including privileged fields (status, role)",
	})
	public async updateUserByAdmin(
		@Args('targetUserId', { type: () => String, description: 'The ID of the user to update' })
		targetUserId: string,
		@Args('input', { type: () => UpdateUserInput, description: 'User update data with optional fields' })
		input: UpdateUserInput,
	): Promise<PublicUser> {
		console.log(`--- @mutation() Update User by Admin is called for user: ${targetUserId} ---`);
		const objectId = shapeIntoMongoObjectId(targetUserId);
		return await this.userService.updateUserByAdmin(objectId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => PublicUser)
	public async checkAuthenticatedUser(@AuthUser() user: PublicUser): Promise<PublicUser> {
		console.info('--- @resolver() Authentication [checkAuthenticatedUser] ---');
		return {
			...user,
			message: 'User is authenticated',
		};
	}

	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Query(() => PublicUser)
	public async checkAuthRoles(@AuthUser() user: PublicUser): Promise<PublicUser> {
		console.log('--- @query() Check auth Roles is queried: ${user} ---');
		return {
			...user,
			message: 'User has proper roles to access this resource',
		};
	}

	/**
	 * Refresh access token using a valid refresh token
	 */
	@UseGuards(WithoutGuard)
	@Mutation(() => AuthResponse, {
		description: 'Refresh access token using a valid refresh token',
	})
	public async refreshToken(
		@Args('input', { type: () => RefreshTokenInput, description: 'Refresh token input' })
		input: RefreshTokenInput,
	): Promise<AuthResponse> {
		console.log('--- @mutation() Refresh Token is called ---');

		// Verify refresh token and extract user ID
		const payload = await this.authService.verifyRefreshToken(input.refreshToken);

		// Use UserService to validate and refresh
		const result = await this.userService.refreshAccessToken(payload._id, input.refreshToken);

		// Return AuthResponse with tokens and expiration times
		return {
			user: result.user,
			accessToken: result.accessToken,
			refreshToken: result.newRefreshToken || input.refreshToken, // Use new token if rotated
			accessTokenExpiresAt: this.authService.getAccessTokenExpiration(),
			refreshTokenExpiresAt: this.authService.getRefreshTokenExpiration(),
		};
	}

	/**
	 * Get all companies where the authenticated user is owner or recruiter
	 */
	@UseGuards(AuthGuard)
	@Query(() => [CompanyListItem], {
		description: 'Get all companies where user is owner or recruiter',
	})
	public async getMyCompanies(@AuthUser('_id') userId: ObjectId): Promise<CompanyListItem[]> {
		console.log('--- @query() Get My Companies is called ---');
		return await this.userService.getMyCompanies(userId.toString());
	}

	/**
	 * Switch active company for recruiter operations
	 */
	@Roles(UserRole.RECRUITER)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Mutation(() => PublicUser, {
		description: 'Switch active company for recruiter operations',
	})
	public async switchActiveCompany(
		@Args('input', { type: () => SwitchCompanyInput, description: 'Company ID to switch to' })
		input: SwitchCompanyInput,
		@AuthUser('_id') userId: ObjectId,
	): Promise<PublicUser> {
		console.log('--- @mutation() Switch Active Company is called ---');
		const result = await this.userService.switchActiveCompany(userId.toString(), input.companyId);
		return {
			...result,
			activeCompanyId: result?.activeCompanyId?.toString(),
			firstName: result.firstName ? result.firstName : 'no firstName',
			lastName: result.lastName ? result.lastName : 'no lastName',
			_id: result._id ? result._id : 'no _id',
			email: result.email ? result.email : 'no email',
			role: result.role ? result.role : UserRole.RECRUITER,
			message: 'Active company switched successfully',
		};
	}

	/**
	 * Get current active company details
	 */
	@Roles(UserRole.RECRUITER)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Query(() => ActiveCompanyOutput, {
		nullable: true,
		description: 'Get current active company details',
	})
	public async getActiveCompany(@AuthUser('_id') userId: ObjectId): Promise<ActiveCompanyOutput | null> {
		console.log('--- @query() Get Active Company is called ---');
		return await this.userService.getActiveCompany(userId.toString());
	}

	@Roles(UserRole.CANDIDATE)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Query(() => PublicUser, {
		description: "Get authenticated candidate user's profile",
	})
	public async getCandidateProfile(
		@AuthUser('_id') userId: ObjectId,
		@Args('targetUserId', { nullable: true }) targetUserId?: string,
	): Promise<PublicUser> {
		console.log(`--- @query() Get Candidate Profile is called: ${userId} ---`);
		return await this.userService.getCandidateProfile(userId, targetUserId);
	}
}
