import { Args, Mutation, Resolver, Query, Context } from '@nestjs/graphql';
import { UserService } from './user.service';
import {
	RegisterUserInput,
	User,
	RefreshTokenInput,
	AuthResponse,
	LoginUserInput,
	PublicUser,
	ResendVerificationInput,
	UpdateProfileInput,
	UpdateUserSettingsInput,
	VerifyEmailInput,
	SwitchCompanyInput,
	CompanyListItem,
	ActiveCompanyOutput,
} from '../../libs/dto/user';
import { FileUploadInput, FileUploadOutput, UserRole, UserSettingsOutput } from '../../libs';
import { SessionOutput, MessageResponse } from '../../libs/dto/sessions/output';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthUser } from '../auth/decorators/authUser.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { AuthService } from '../auth/auth.service';
import type { ObjectId } from 'mongoose';
import { WithoutGuard } from '../auth/guards/without.guard';
import { DeviceParser } from '../../libs/utils/device.parser';
import { AuthToken } from '../auth/decorators/authToken.decorator';

@Resolver()
export class UserResolver {
	constructor(
		private readonly userService: UserService,
		private readonly authService: AuthService,
	) {}

	/*****************************************************************************
	 * SECURITY USER REGISTRATION & ACCOUNT CREATION
	 ****************************************************************************/
	@Mutation(() => User, {
		description: 'Register a new user with email, password, and optional profile details',
	})
	public async register(
		@Args('input', { type: () => RegisterUserInput, description: 'Registration form data' })
		input: RegisterUserInput,
	): Promise<User> {
		return await this.userService.register(input);
	}

	/*****************************************************************************
	 * SECURITY EMAIL VERIFICATION
	 ****************************************************************************/
	@Mutation(() => User, {
		description: 'Verify email address with verification code',
	})
	public async verifyEmail(
		@Args('input', { type: () => VerifyEmailInput, description: 'Email and verification code' })
		input: VerifyEmailInput,
	): Promise<User> {
		return await this.userService.verifyEmail(input);
	}

	/*****************************************************************************
	 * SECURITY VERIFICATION CODE RESEND
	 ****************************************************************************/
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

	/*****************************************************************************
	 * SECURITY USER LOGIN & AUTHENTICATION
	 ****************************************************************************/
	@Mutation(() => User, {
		description: 'Authenticate user with email and password, returns user with access token',
	})
	public async login(
		@Args('input', { type: () => LoginUserInput, description: 'User login credentials (email and password)' })
		input: LoginUserInput,
		@Context()
		context,
	): Promise<User> {
		console.log(`--- @mutation() Login is called with input: ${JSON.stringify(input)} ---`);
		// DEVICE - Parse device info from user-agent
		const userAgent = context.req.headers['user-agent'] || 'Unknown Device';
		const deviceInfo = DeviceParser.parseUserAgent(userAgent);

		// IP - Extract IP address (check for proxy headers)
		const ipAddress =
			context.req.headers['x-forwarded-for']?.split(',')[0] ||
			context.req.headers['x-real-ip'] ||
			context.req.ip ||
			context.req.connection?.remoteAddress ||
			'Unknown IP';
		const cleanIp = ipAddress.replace('::ffff:', '');

		// LOCATION - Use IP as location for now (localhost won't give geolocation)
		const location = cleanIp.includes('127.0.0.1') || cleanIp.includes('localhost') ? 'Local Development' : cleanIp;

		console.log(`--- Device Info: ${JSON.stringify(deviceInfo)}, IP Address: ${cleanIp}, Location: ${location} ---`);
		return await this.userService.login(input, deviceInfo, cleanIp, location);
	}

	/*****************************************************************************
	 * SECURITY USER LOGOUT & SESSION REVOCATION
	 ****************************************************************************/
	@UseGuards(AuthGuard)
	@Mutation(() => MessageResponse, {
		description: 'Logout user by revoking current session',
	})
	public async logout(@AuthUser('_id') userId: ObjectId, @AuthToken() currentToken: string): Promise<MessageResponse> {
		console.log(`--- @mutation() Logout is called for user: ${userId} ---`);
		await this.userService.logout(userId, currentToken);
		return {
			message: 'User logged out successfully',
			success: true,
		};
	}

	/*****************************************************************************
	 * FEATURE USER PROFILE SELF-UPDATE
	 ****************************************************************************/
	@Roles(UserRole.CANDIDATE)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Mutation(() => UserSettingsOutput, {
		description: "Update authenticated user's own profile data (name, email, profile)",
	})
	public async updateUserByUser(
		@Args('input', { type: () => UpdateUserSettingsInput, description: 'User update data with optional fields' })
		input: UpdateUserSettingsInput,
		@AuthUser('_id') userId: ObjectId,
	): Promise<UserSettingsOutput> {
		console.log(`--- @mutation() Update User by User is called: ${userId} ---`);
		return await this.userService.updateUserByUser(userId, input);
	}

	/*****************************************************************************
	 * SECURITY AUTHENTICATION STATUS CHECK
	 ****************************************************************************/
	@UseGuards(AuthGuard)
	@Query(() => PublicUser)
	public async checkAuthenticatedUser(@AuthUser() user: PublicUser): Promise<PublicUser> {
		console.info('--- @resolver() Authentication [checkAuthenticatedUser] ---');
		return {
			...user,
			message: 'User is authenticated',
		};
	}

	/*****************************************************************************
	 * SECURITY AUTHORIZATION ROLE VERIFICATION
	 ****************************************************************************/

	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Query(() => PublicUser)
	public async checkAuthRoles(@AuthUser() user: PublicUser): Promise<PublicUser> {
		console.log(`--- @query() Check auth Roles is queried: ${user} ---`);
		return {
			...user,
			message: 'User has proper roles to access this resource',
		};
	}

	/*****************************************************************************
	 * SECURITY TOKEN REFRESH & ROTATION
	 ****************************************************************************/
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
			refreshToken: result.newRefreshToken ? result.newRefreshToken : input.refreshToken, // Use new token if rotated
			accessTokenExpiresAt: this.authService.getAccessTokenExpiration(),
			refreshTokenExpiresAt: this.authService.getRefreshTokenExpiration(),
		};
	}

	/*****************************************************************************
	 * API RECRUITER COMPANY LIST
	 ****************************************************************************/
	@UseGuards(AuthGuard)
	@Query(() => [CompanyListItem], {
		description: 'Get all companies where user is owner or recruiter',
	})
	public async getMyCompanies(@AuthUser('_id') userId: ObjectId): Promise<CompanyListItem[]> {
		console.log('--- @query() Get My Companies is called ---');
		return await this.userService.getMyCompanies(userId.toString());
	}

	/*****************************************************************************
	 * FEATURE RECRUITER COMPANY SWITCHING
	 ****************************************************************************/
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

	/*****************************************************************************
	 * API RECRUITER ACTIVE COMPANY DETAILS
	 ****************************************************************************/
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

	/*****************************************************************************
	 * API CANDIDATE PRIVATE PROFILE QUERY
	 ****************************************************************************/

	@Roles(UserRole.CANDIDATE)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Query(() => User, { description: 'Fetch authenticated candidate profile with full details' })
	public async getCandidateProfile(@AuthUser('_id') userId: ObjectId): Promise<User | PublicUser> {
		console.log(`--- @query() Get Candidate Profile for user: ${userId} ---`);
		return await this.userService.getCandidateProfile('', userId);
	}

	/*****************************************************************************
	 * API CANDIDATE PUBLIC PROFILE QUERY
	 ****************************************************************************/

	@UseGuards(WithoutGuard)
	@Query(() => PublicUser, { description: 'Fetch public profile of any candidate by username (no auth required)' })
	public async getCandidatePublicProfile(
		@AuthUser('_id') userId: ObjectId,
		@Args('targetUsername', { nullable: true }) targetUsername?: string,
	): Promise<PublicUser> {
		console.log(`--- @query() Get Candidate Public Profile for: ${targetUsername || userId} ---`);
		return await this.userService.getCandidateProfile(targetUsername, userId);
	}

	/*****************************************************************************
	 * INFO CANDIDATE SETTINGS & PREFERENCES
	 ****************************************************************************/

	@Roles(UserRole.CANDIDATE, UserRole.RECRUITER)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Query(() => UserSettingsOutput, {
		description: "Get authenticated candidate user's settings data (aggregated custom settings)",
	})
	public async getCandidateSettings(
		@AuthUser('_id') userId: ObjectId,
		@AuthToken() currentToken: string,
		@Args('requestedField', {
			type: () => String,
			description: 'Specify which settings field to retrieve (e.g. "account", "privacy")',
		})
		requestedField: string,
	): Promise<UserSettingsOutput> {
		console.log(`--- @query() Get Candidate Settings is called ---`);
		return await this.userService.getCandidateSettings(userId, requestedField, currentToken);
	}

	@Roles(UserRole.CANDIDATE)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Mutation(() => FileUploadOutput, {
		description: "Upload or update user's avatar image and return the new avatar URL",
	})
	public async uploadUserAvatar(
		@AuthUser('_id') userId: ObjectId,
		@Args('input', { type: () => FileUploadInput }) input: FileUploadInput,
	): Promise<FileUploadOutput> {
		console.log(`--- @mutation() Upload User Avatar is called ---`);
		return await this.userService.uploadUserAvatar(shapeIntoMongoObjectId(userId), input);
	}

	@Roles(UserRole.CANDIDATE)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Mutation(() => FileUploadOutput, {
		description: "Upload or update user's banner image and return the new banner URL",
	})
	public async uploadUserBanner(
		@AuthUser('_id') userId: ObjectId,
		@Args('input', { type: () => FileUploadInput }) input: FileUploadInput,
	): Promise<FileUploadOutput> {
		console.log(`--- @mutation() Upload User Banner is called ---`);
		return await this.userService.uploadUserBanner(shapeIntoMongoObjectId(userId), input);
	}
}
