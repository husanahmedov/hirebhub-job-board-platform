import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
	RegisterUserInput,
	User,
	LoginUserInput,
	PublicUser,
	UpdateProfileInput,
	UpdateUserInput,
	ResendVerificationInput,
	VerifyEmailInput,
} from '../../libs/dto/user';
import { GetLeanResultType, Model, ObjectId, PipelineStage, LeanOptions } from 'mongoose';
import {
	UserCreationFailedException,
	UserAlreadyExistsException,
	DatabaseException,
	ErrorCode,
	UserNotFoundException,
	InvalidCredentialsException,
	UserStatus,
	UserDeactivatedException,
	UserSuspendedException,
	BadRequestException,
	ViewGroup,
	UserSettingsOutput,
	InternalServerException,
	FileUploadOutput,
	FileUploadInput,
} from '../../libs';
import { AuthService } from '../auth/auth.service';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { EmailService } from '../notification/email.service';
import { ViewService } from '../view/view.service';
import { StatsModifier } from '../../libs/interfaces/common';
import { SessionsService } from '../sessions/sessions.service';
import { SessionOutput } from '../../libs/dto/sessions/output';

@Injectable()
export class UserService {
	constructor(
		@InjectModel('User') private userModel: Model<User>,
		private readonly authService: AuthService,
		private readonly emailService: EmailService,
		private readonly viewService: ViewService,
		private readonly sessionService: SessionsService,
	) {}

	public async register(input: RegisterUserInput): Promise<User> {
		const normalizedEmail: string = input.email.toLowerCase().trim();
		const hashedPassword: string = await this.authService.hashPassword(input.passwordHash);

		try {
			const existingUser = await this.userModel.findOne({ email: normalizedEmail }).select('_id email').lean().exec();

			if (existingUser) {
				throw new UserAlreadyExistsException({
					email: normalizedEmail,
					existingUserId: existingUser._id,
				});
			}

			// Generate verification code
			const verificationCode = this.generateVerificationCode();
			const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

			// Build complete user data with all optional fields
			const userData = {
				email: normalizedEmail,
				passwordHash: hashedPassword,
				firstName: input.firstName,
				lastName: input.lastName,
				role: input.role,
				status: UserStatus.ACTIVE,
				emailVerified: false,
				verificationCode,
				verificationCodeExpires,
				profile: input.profile || undefined,
				qualifications: input.qualifications || undefined,
				settings: input.settings || {
					language: 'en',
					timezone: 'UTC',
					notifications: {
						email: true,
						push: false,
					},
				},
				hasCompleteRegistration: !!(
					input.profile?.skills?.length &&
					input.profile?.location &&
					(input.profile?.education?.length || input.profile?.experience?.length)
				),
			};

			const newUser = await this.userModel.create(userData);

			if (!newUser) {
				throw new UserCreationFailedException({
					originalError: 'User document was not created',
					input: { email: normalizedEmail },
				});
			}

			// Send verification email (non-blocking)
			try {
				await this.emailService.sendVerificationEmail(normalizedEmail, verificationCode, input.firstName);
			} catch (error) {
				console.error('Failed to send verification email:', error);
			}

			const userObject = newUser.toObject() as User;
			const accessToken: string = await this.authService.createToken(newUser);
			userObject.accessToken = accessToken;

			const refreshToken: string = await this.authService.createRefreshToken(newUser);
			const hashedRefreshToken: string = await this.authService.hashRefreshToken(refreshToken);

			await this.userModel.findByIdAndUpdate(newUser._id, { refreshToken: hashedRefreshToken });
			userObject.refreshToken = refreshToken;

			return userObject;
		} catch (error: any) {
			if (error instanceof UserAlreadyExistsException) {
				throw error;
			}

			if (error instanceof UserCreationFailedException) {
				throw error;
			}

			if (error.name === 'MongoServerError' && error.code === 11000) {
				const duplicateField: string = Object.keys(error.keyValue || {})[0] || 'email';
				const duplicateValue: string = error.keyValue?.[duplicateField] || 'unknown';
				throw new UserAlreadyExistsException({
					field: duplicateField,
					value: duplicateValue,
					message: `A user with this ${duplicateField} already exists`,
				});
			}

			// Handle Mongoose validation errors (invalid data types, formats, etc.)
			if (error.name === 'ValidationError') {
				const validationErrors = Object.keys(error.errors || {}).map((field) => ({
					field,
					message: error.errors[field]?.message || 'Validation failed',
					value: error.errors[field]?.value,
				}));

				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message: 'User data validation failed',
					validationErrors,
				});
			}

			throw new UserCreationFailedException({
				originalError: error.message || 'Unknown error during user creation',
				input: { email: normalizedEmail },
				errorName: error.name,
				errorStack: error.stack,
			});
		}
	}

	public async login(input: LoginUserInput, deviceInfo: any, ipAddress: string, location: any): Promise<User> {
		const normalizedEmail: string = input.email.toLowerCase().trim();

		try {
			const user = await this.userModel.findOne({ email: normalizedEmail }).select('+passwordHash').exec();

			if (!user) {
				throw new UserNotFoundException({
					message: `Authentication failed. Please check your credentials and try again.`,
					email: normalizedEmail,
				});
			}

			if (user.status === UserStatus.DEACTIVATED) {
				throw new UserDeactivatedException({
					email: normalizedEmail,
					userId: user._id,
					status: user.status,
					message: `Your account has been deactivated. Please contact support to reactivate.`,
				});
			}

			if (user.status === UserStatus.SUSPENDED) {
				throw new UserSuspendedException({
					email: normalizedEmail,
					userId: user._id,
					status: user.status,
					message: 'Your account has been suspended due to policy violations. Contact support for details.',
				});
			}

			if (!user.passwordHash) {
				throw new InvalidCredentialsException({
					message: 'Account authentication method not supported',
					input: { email: normalizedEmail },
				});
			}

			const isPasswordValid: boolean = await this.authService.comparePassword(
				input.passwordHash,
				user.passwordHash as string,
			);

			if (!isPasswordValid) {
				throw new InvalidCredentialsException({
					message: 'Invalid credentials. Please check your email and password.',
					input: { email: normalizedEmail },
					attemptedAt: new Date().toISOString(),
				});
			}

			const userObject = user.toObject() as User;
			const accessToken: string = await this.authService.createToken(user);
			userObject.accessToken = accessToken;

			const refreshToken: string = await this.authService.createRefreshToken(user);
			const hashedRefreshToken: string = await this.authService.hashRefreshToken(refreshToken);

			// STEP 9: Detect timezone based on user's location (where they're logging in from)
			// This ensures sessions reflect the user's current timezone, not a stored preference
			const userTimezone = this.detectTimezoneFromLocation(location);

			// STEP 10: Create new session record
			await this.sessionService.createSession(user._id, deviceInfo, refreshToken, ipAddress, location);

			// STEP 11: Store hashed refresh token in user document
			await this.userModel.findByIdAndUpdate(user._id, { refreshToken: hashedRefreshToken });

			// Attach refresh token to user object (will be sent to client)

			userObject.refreshToken = refreshToken;
			userObject.session = {
				deviceName: deviceInfo.deviceName,
				deviceType: deviceInfo.deviceType,
				browser: deviceInfo.browser,
				os: deviceInfo.os,
				ipAddress: ipAddress,
				location: location,
				// timezone: userTimezone,
				createdAt: new Date(),
				isActive: true,
			};

			// STEP 11: Return authenticated user object with tokens
			// Client can use these tokens for all subsequent authenticated requests
			return userObject;
		} catch (error: any) {
			// Error handling with specific exceptions for different authentication failures

			// Re-throw specific authentication exceptions (already properly formatted)
			if (error instanceof UserNotFoundException) {
				throw error;
			}

			if (error instanceof InvalidCredentialsException) {
				throw error;
			}

			if (error instanceof UserDeactivatedException) {
				throw error;
			}

			if (error instanceof UserSuspendedException) {
				throw error;
			}

			// Handle database connection errors
			if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
				throw new InternalServerErrorException('Unable to connect to authentication service. Please try again later.');
			}

			// Handle unexpected errors with logging context
			// Log error details for debugging but return generic message to client
			console.error('Unexpected error during login:', {
				error: error.message,
				errorName: error.name,
				email: normalizedEmail,
				timestamp: new Date().toISOString(),
				stack: error.stack,
			});

			throw new InternalServerErrorException('An unexpected error occurred during authentication. Please try again.');
		}
	}

	public async logout(userId: ObjectId, currentToken: string): Promise<void> {
		try {
			// TODO - check if user exists?
			// TODO - delete session associated with this refresh token
			const user = await this.userModel.findById(userId).exec();
			if (!user) {
				throw new UserNotFoundException(
					{
						message: 'User not found',
					},
					404,
				);
			}
			await this.sessionService.revokeSession(userId, currentToken);
		} catch (error) {
			if (error instanceof UserNotFoundException) {
				throw error;
			}
		}
	}

	public async updateUserByUser(userId: ObjectId, input: UpdateUserInput): Promise<UserSettingsOutput> {
		const normalizedEmail: string | undefined = input.account?.email
			? input.account.email.toLowerCase().trim()
			: undefined;
		const {
			firstName,
			lastName,
			contactEmail,
			professionalHeadline,
			publicProfileUrl,
			country,
			website,
			phoneNumber,
			recoveryEmail,
		} = input.account || {};

		try {
			// STEP 2: If email is being updated, check if it's already taken by another user
			// Prevents email conflicts while allowing user to keep their own email
			if (normalizedEmail) {
				input.account?.email ? (input.account.email = normalizedEmail) : null;

				// Query for existing user with this email (excluding current user)
				const existingUser = await this.userModel
					.findOne({
						email: normalizedEmail,
						_id: { $ne: userId }, // Exclude current user from check
					})
					.select('_id email')
					.lean()
					.exec();

				if (existingUser) {
					// Email is already taken by another user - throw specific exception
					throw new UserAlreadyExistsException({
						email: normalizedEmail,
						existingUserId: existingUser._id,
						message: 'This email address is already registered to another account',
					});
				}
				const currentUser = await this.userModel.findById(userId).exec();
				if (currentUser?.email !== normalizedEmail) {
					currentUser!.emailVerified = false;
					// Generate new verification code
					const verificationCode = this.generateVerificationCode();
					const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
					currentUser!.verificationCode = verificationCode;
					currentUser!.verificationCodeExpires = verificationCodeExpires;
					await currentUser!.save();
					// Send verification email (non-blocking)
					try {
						await this.emailService.sendVerificationEmail(
							normalizedEmail,
							verificationCode,
							firstName || currentUser!.firstName,
						);
					} catch (error) {
						console.error('Failed to send verification email:', error);
					}
				}
			}

			// STEP 3: Update the user document with new values
			// findByIdAndUpdate is atomic and returns the updated document
			// { new: true } ensures we get the updated document, not the old one
			// { runValidators: true } runs Mongoose schema validators on update
			const updatedUser = await this.userModel
				.findByIdAndUpdate(
					userId,
					{
						firstName: firstName,
						lastName: lastName,
						recoveryEmail: recoveryEmail,
						publicProfileUsername: publicProfileUrl,
						'profile.website': website,
						'profile.contactInfo.email': contactEmail,
						'profile.contactInfo.phone_number': phoneNumber,
						'profile.headline': professionalHeadline,
						'profile.location.country': country,
						email: normalizedEmail,
					},
					{
						new: true, // Return updated document
						runValidators: true, // Run schema validators
					},
				)
				.exec();

			// STEP 4: Verify the user was found and updated
			if (!updatedUser) {
				// User not found with this ID - throw specific exception
				throw new UserNotFoundException({
					message: 'User not found for update',
					userId,
				});
			}

			// STEP 5: Convert Mongoose document to plain object
			// This includes virtual fields (fullName, profileCompleteness, etc.)
			// and removes Mongoose-specific properties
			// Returns PublicUser (excludes sensitive fields like passwordHash)
			return {
				account: {
					email: updatedUser?.email || '',
					contactEmail: updatedUser?.profile?.contactInfo?.email || '',
					firstName: updatedUser.firstName || '',
					lastName: updatedUser.lastName || '',
					professionalHeadline: updatedUser?.profile?.headline || '',
					publicProfileUrl: updatedUser.publicProfileUsername || '',
					country: updatedUser?.profile?.location?.country || '',
					website: updatedUser?.profile?.website || '',
					phoneNumber: updatedUser?.profile?.contactInfo?.phone_number || '',
					recoveryEmail: updatedUser.recoveryEmail || '',
					emailVerified: updatedUser.emailVerified || false,
				},
			};
		} catch (error: any) {
			// Error handling with specific exceptions for different failure scenarios

			// Re-throw custom exceptions (already properly formatted)
			if (error instanceof UserNotFoundException) {
				throw error;
			}

			if (error instanceof UserAlreadyExistsException) {
				throw error;
			}

			// Handle MongoDB duplicate key error (E11000)
			// This can occur if email unique index is violated (race condition)
			if (error.name === 'MongoServerError' && error.code === 11000) {
				const duplicateField: string = Object.keys(error.keyValue || {})[0] || 'email';
				const duplicateValue: string = error.keyValue?.[duplicateField] || 'unknown';
				throw new UserAlreadyExistsException({
					field: duplicateField,
					value: duplicateValue,
					message: `A user with this ${duplicateField} already exists`,
				});
			}

			// Handle Mongoose validation errors (invalid data types, formats, etc.)
			if (error.name === 'ValidationError') {
				const validationErrors = Object.keys(error.errors || {}).map((field) => ({
					field,
					message: error.errors[field]?.message || 'Validation failed',
					value: error.errors[field]?.value,
				}));

				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message: 'User data validation failed during update',
					validationErrors,
				});
			}

			// Handle database connection errors
			if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
				throw new InternalServerErrorException('Unable to connect to database service. Please try again later.');
			}

			// Handle unexpected errors with detailed context for debugging
			// Log error details but return generic message to client
			console.error('Unexpected error during user update:', {
				error: error.message,
				errorName: error.name,
				userId: userId.toString(),
				timestamp: new Date().toISOString(),
				stack: error.stack,
			});

			throw new InternalServerErrorException('Failed to update user information. Please try again later.');
		}
	}

	/** Validate OAuth login (find existing user or create new one) */
	public async validateOAuthLogin(
		provider: string,
		providerId: string,
		profile: {
			email: string;
			firstName: string;
			lastName: string;
			avatarUrl?: string;
			profileUrl?: string;
		},
	): Promise<User> {
		const normalizedEmail = profile.email.toLowerCase().trim();

		try {
			let user = await this.userModel
				.findOne({
					'oauthProviders.provider': provider,
					'oauthProviders.providerId': providerId,
				})
				.exec();

			if (user) {
				// STEP 2: User found with OAuth credentials - return existing user
				return user.toObject() as User;
			}

			// STEP 3: Check if user exists with this email (but no OAuth yet)
			user = await this.userModel.findOne({ email: normalizedEmail }).exec();

			if (user) {
				// STEP 4: User exists with email - link OAuth provider to existing account
				// Check if this OAuth provider is already linked
				const hasProvider = user.oauthProviders?.some((oauth) => oauth.provider === provider);

				if (!hasProvider) {
					// Add OAuth provider to existing account
					const updatedUser = await this.userModel
						.findByIdAndUpdate(
							user._id,
							{
								$push: {
									oauthProviders: {
										provider,
										providerId,
										profileUrl: profile.profileUrl || '',
									},
								},
								$set: {
									emailVerified: true, // OAuth emails are pre-verified
									profile: {
										avatarUrl: profile.avatarUrl || (user.toObject() as any).profile.avatarUrl || '',
									},
								},
							},
							{ new: true },
						)
						.exec();

					if (!updatedUser) {
						throw new InternalServerErrorException('Failed to link OAuth provider to existing account');
					}

					return updatedUser.toObject() as User;
				}

				// OAuth provider already linked, return user
				return user.toObject() as User;
			}

			// STEP 5: User doesn't exist - create new OAuth-based account
			const newUserData = {
				email: normalizedEmail,
				emailVerified: true, // OAuth emails are pre-verified
				firstName: profile.firstName,
				lastName: profile.lastName,
				profile: {
					avatarUrl: profile.avatarUrl || '',
				},
				role: 'CANDIDATE', // Default role for OAuth users
				status: UserStatus.ACTIVE,
				oauthProviders: [
					{
						provider,
						providerId,
						profileUrl: profile.profileUrl || '',
					},
				],
				settings: {
					language: 'en',
					timezone: 'UTC',
					notifications: {
						email: true,
						push: false,
					},
				},
			};

			const newUser = await this.userModel.create(newUserData);
			console.log(newUser);

			if (!newUser) {
				throw new UserCreationFailedException({
					originalError: 'Failed to create OAuth user',
					input: { email: normalizedEmail, provider, providerId },
				});
			}

			return newUser.toObject() as User;
		} catch (error: any) {
			// Re-throw custom exceptions
			if (error instanceof UserCreationFailedException) {
				throw error;
			}

			// Handle MongoDB duplicate key error
			if (error.name === 'MongoServerError' && error.code === 11000) {
				// Race condition: user was created between our check and creation
				// Try to find and return the user
				const existingUser = await this.userModel.findOne({ email: normalizedEmail }).exec();
				if (existingUser) {
					return existingUser.toObject() as User;
				}
				throw new UserAlreadyExistsException({
					email: normalizedEmail,
					message: 'An account with this email already exists',
				});
			}

			// Handle Mongoose validation errors
			if (error.name === 'ValidationError') {
				const validationErrors = Object.keys(error.errors || {}).map((field) => ({
					field,
					message: error.errors[field]?.message || 'Validation failed',
					value: error.errors[field]?.value,
				}));

				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message: 'OAuth user data validation failed',
					validationErrors,
				});
			}

			// Handle database connection errors
			if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
				throw new InternalServerErrorException('Unable to connect to database service. Please try again later.');
			}

			// Handle unexpected errors
			console.error('Unexpected error during OAuth login:', {
				error: error.message,
				errorName: error.name,
				provider,
				providerId,
				email: normalizedEmail,
				timestamp: new Date().toISOString(),
				stack: error.stack,
			});

			throw new InternalServerErrorException('Failed to authenticate with OAuth provider. Please try again later.');
		}
	}

	/** Refresh access token using valid refresh token */
	public async refreshAccessToken(
		userId: ObjectId,
		refreshToken: string,
	): Promise<{ user: User; accessToken: string; newRefreshToken?: string }> {
		try {
			const user = await this.userModel.findById(userId).select('+refreshToken').exec();

			if (!user) {
				throw new UserNotFoundException({
					message: 'User not found',
					userId,
				});
			}

			// STEP 3: Check account status
			if (user.status === UserStatus.DEACTIVATED) {
				throw new UserDeactivatedException({
					email: user.email,
					userId: user._id,
					status: user.status,
					message: 'Your account has been deactivated',
				});
			}

			if (user.status === UserStatus.SUSPENDED) {
				throw new UserSuspendedException({
					email: user.email,
					userId: user._id,
					status: user.status,
					message: 'Your account has been suspended',
				});
			}

			// STEP 4: Verify refresh token matches stored hash
			if (!user.refreshToken) {
				throw new InvalidCredentialsException({
					message: 'No refresh token found for user',
					userId,
				});
			}

			const isRefreshTokenValid = await this.authService.compareRefreshToken(refreshToken, user.refreshToken);

			if (!isRefreshTokenValid) {
				throw new InvalidCredentialsException({
					message: 'Invalid refresh token',
					userId,
				});
			}

			// STEP 5: Generate new access token
			const accessToken = await this.authService.createToken(user);

			// TODO - STEP 6: Optionally rotate refresh token (for enhanced security)
			// TODO - For now, we'll keep the same refresh token
			// TODO - To enable rotation, uncomment the following:
			const newRefreshToken = await this.authService.createRefreshToken(user);
			const hashedNewRefreshToken = await this.authService.hashRefreshToken(newRefreshToken);
			await this.userModel.findByIdAndUpdate(userId, { refreshToken: hashedNewRefreshToken });
			// TODO - Updates sessions collection based on refresh token to mark session as active
			await this.sessionService.updateSessionActivity(refreshToken, newRefreshToken);

			return {
				user: user.toObject() as User,
				accessToken,
				newRefreshToken, // Uncomment if rotating refresh tokens
			};
		} catch (error: any) {
			// Re-throw custom exceptions
			if (
				error instanceof UserNotFoundException ||
				error instanceof InvalidCredentialsException ||
				error instanceof UserDeactivatedException ||
				error instanceof UserSuspendedException
			) {
				throw error;
			}

			// Handle database connection errors
			if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
				throw new InternalServerErrorException('Unable to connect to database service. Please try again later.');
			}

			// Handle unexpected errors
			console.error('Unexpected error during token refresh:', {
				error: error.message,
				errorName: error.name,
				userId: userId.toString(),
				timestamp: new Date().toISOString(),
				stack: error.stack,
			});

			throw new InternalServerErrorException('Failed to refresh access token. Please try again later.');
		}
	}

	/**
	 * * @param input - Email and verification code
	 * * @returns Updated user object
	 */
	public async verifyEmail(input: VerifyEmailInput): Promise<User> {
		const normalizedEmail = input.email.toLowerCase().trim();

		try {
			const user = await this.userModel
				.findOne({ email: normalizedEmail })
				.select('+verificationCode +verificationCodeExpires')
				.exec();

			if (!user) {
				throw new UserNotFoundException({
					email: normalizedEmail,
					message: 'User not found',
				});
			}

			if (user.emailVerified) {
				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message: 'Email is already verified',
				});
			}

			if (!user.verificationCode || !user.verificationCodeExpires) {
				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message: 'No verification code found. Please request a new code.',
				});
			}

			if (new Date() > user.verificationCodeExpires) {
				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message: 'Verification code has expired. Please request a new code.',
				});
			}

			if (user.verificationCode !== input.code) {
				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message: 'Invalid verification code',
				});
			}

			// Mark email as verified and clear verification fields
			user.emailVerified = true;
			user.verificationCode = undefined;
			user.verificationCodeExpires = undefined;
			await user.save();

			return user.toObject() as User;
		} catch (error: any) {
			if (error instanceof UserNotFoundException || error instanceof DatabaseException) {
				throw error;
			}

			throw new InternalServerErrorException({
				message: 'Failed to verify email',
				error: error.message,
			});
		}
	}

	/**
	 * Resend verification code
	 * @param input - User email
	 * @returns Success message
	 */
	public async resendVerificationCode(input: ResendVerificationInput): Promise<{ message: string }> {
		const normalizedEmail = input.email.toLowerCase().trim();

		try {
			const user = await this.userModel.findOne({ email: normalizedEmail }).exec();

			if (!user) {
				throw new UserNotFoundException({
					email: normalizedEmail,
					message: 'User not found',
				});
			}

			if (user.emailVerified) {
				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message: 'Email is already verified',
				});
			}

			// Generate new verification code
			const verificationCode = this.generateVerificationCode();
			const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

			user.verificationCode = verificationCode;
			user.verificationCodeExpires = verificationCodeExpires;
			await user.save();

			// Send verification email
			await this.emailService.sendVerificationEmail(normalizedEmail, verificationCode, user.firstName);

			return { message: 'Verification code sent successfully' };
		} catch (error: any) {
			if (error instanceof UserNotFoundException || error instanceof DatabaseException) {
				throw error;
			}

			throw new InternalServerErrorException({
				message: 'Failed to resend verification code',
				error: error.message,
			});
		}
	}

	/**
	 * * Generate a 6-digit verification code
	 * @param @returns 6-digit numeric string
	 */
	private generateVerificationCode(): string {
		return Math.floor(100000 + Math.random() * 900000).toString();
	}

	/**
	 * * @param userId - User ID
	 */
	async getMyCompanies(userId: string) {
		const objUserId = shapeIntoMongoObjectId(userId);

		const companies = await this.userModel
			.aggregate([
				{ $match: { _id: objUserId } },
				{
					$lookup: {
						from: 'companies',
						let: { userId: '$_id' },
						pipeline: [
							{
								$match: {
									$expr: {
										$or: [{ $eq: ['$ownerId', '$$userId'] }, { $in: ['$$userId', '$recruiterIds'] }],
									},
									deletedAt: null,
								},
							},
							{
								$addFields: {
									role: {
										$cond: [{ $eq: ['$ownerId', '$$userId'] }, 'owner', 'recruiter'],
									},
								},
							},
							{
								$project: {
									_id: 1,
									name: 1,
									logoUrl: 1,
									verified: 1,
									role: 1,
									industry: 1,
									size: 1,
								},
							},
						],
						as: 'companies',
					},
				},
				{ $unwind: '$companies' },
				{ $replaceRoot: { newRoot: '$companies' } },
			])
			.exec();

		return companies;
	}

	/**
	 * * @param userId - User ID
	 * * @param companyId - Company ID to switch to
	 */
	async switchActiveCompany(userId: string, companyId: string): Promise<PublicUser> {
		const objUserId = shapeIntoMongoObjectId(userId);
		const objCompanyId = shapeIntoMongoObjectId(companyId);

		// Verify user has access to this company
		const hasAccess = await this.userModel
			.aggregate([
				{ $match: { _id: objUserId } },
				{
					$lookup: {
						from: 'companies',
						let: { userId: '$_id', targetCompanyId: objCompanyId },
						pipeline: [
							{
								$match: {
									$expr: {
										$and: [
											{ $eq: ['$_id', '$$targetCompanyId'] },
											{
												$or: [{ $eq: ['$ownerId', '$$userId'] }, { $in: ['$$userId', '$recruiterIds'] }],
											},
										],
									},
									deletedAt: null,
								},
							},
						],
						as: 'company',
					},
				},
				{
					$project: {
						hasAccess: { $gt: [{ $size: '$company' }, 0] },
					},
				},
			])
			.exec();

		if (!hasAccess[0]?.hasAccess) {
			throw new UserNotFoundException({
				message: `You don't have access to company with ID "${companyId}"`,
			});
		}
		console.log(`-------- User has access to company with ID "${hasAccess[0]}" --------`);

		// Update active company
		const updatedUser = await this.userModel
			.findByIdAndUpdate(objUserId, { activeCompanyId: objCompanyId }, { new: true })
			.select('_id firstName lastName email role activeCompanyId')
			.lean()
			.exec();

		return updatedUser as PublicUser;
	}

	async getActiveCompany(userId: string) {
		const objUserId = shapeIntoMongoObjectId(userId);

		const result = await this.userModel
			.aggregate([
				{ $match: { _id: objUserId } },
				{
					$lookup: {
						from: 'companies',
						localField: 'activeCompanyId',
						foreignField: '_id',
						as: 'activeCompany',
						pipeline: [
							{
								$match: {
									deletedAt: null,
								},
							},
							{
								$project: {
									_id: 1,
									name: 1,
									logoUrl: 1,
									verified: 1,
									industry: 1,
									size: 1,
									location: 1,
								},
							},
						],
					},
				},
				{
					$project: {
						activeCompany: { $arrayElemAt: ['$activeCompany', 0] },
					},
				},
			])
			.exec();

		return result[0]?.activeCompany || null;
	}

	public async getCandidateProfile(targetUsername?: string, userId?: ObjectId): Promise<PublicUser | User> {
		console.log('----- Getting candidate profile -----');
		console.log('Target Username', targetUsername);
		console.log('User id ', userId);

		try {
			if (targetUsername && typeof targetUsername !== null) {
				return this.getUserProfile(targetUsername, userId);
			}

			const user = await this.userModel.findById(userId).exec();
			if (!user) {
				throw new UserNotFoundException({
					message: 'User not found',
					userId,
				});
			}

			return this.getOwnProfile(userId);
		} catch (error: any) {
			if (error instanceof UserNotFoundException) {
				throw error;
			}

			// Handle unexpected errors
			console.error('Unexpected error fetching candidate profile:', {
				error: error.message,
				errorName: error.name,
				userId: userId?.toString(),
				timestamp: new Date().toISOString(),
				stack: error.stack,
			});

			throw new InternalServerErrorException('Failed to fetch candidate profile. Please try again later.');
		}
	}

	private async getOwnProfile(userId?: ObjectId): Promise<User> {
		const pipeline: PipelineStage[] = [
			{ $match: { _id: userId } },
			{
				$project: {
					passwordHash: 0,
					refreshToken: 0,
					verificationCode: 0,
					verificationCodeExpires: 0,
					oauthProviders: 0,
				},
			},
		];

		const result = await this.userModel.aggregate(pipeline).exec();
		// result = result. convert to toObject()
		const docs = result.map((user) => new this.userModel(user));
		const withVirtuals = docs.map((doc) => doc.toObject({ virtuals: true }));
		if (result.length === 0) {
			throw new UserNotFoundException({
				message: 'User not found',
				userId,
			});
		}

		return withVirtuals[0] as User;
	}

	private async getUserProfile(targetUsername: string, userId?: ObjectId): Promise<PublicUser> {
		const pipeline: PipelineStage[] = [
			{ $match: { publicProfileUsername: targetUsername } },
			{
				$project: {
					passwordHash: 0,
					refreshToken: 0,
					verificationCode: 0,
					verificationCodeExpires: 0,
					oauthProviders: 0,
				},
			},
		];

		const result = await this.userModel.aggregate(pipeline).exec();
		// result = result. convert to toObject()
		const docs = result.map((user) => new this.userModel(user));
		const withVirtuals = docs.map((doc) => doc.toObject({ virtuals: true }));
		if (result.length === 0) {
			throw new UserNotFoundException({
				message: 'User not found',
				targetUsername,
			});
		}

		if (userId) {
			const $resultIncrement = await this.viewService.incremenetViewCount({
				userId: String(userId),
				viewRefId: String(withVirtuals[0]._id),
				viewGroup: ViewGroup.USER,
			});
			if ($resultIncrement) {
				await this.userStatsModifier({
					id: shapeIntoMongoObjectId(withVirtuals[0]._id),
					targetKey: 'viewsCount',
					modifier: 1,
				});
				withVirtuals[0].viewsCount = withVirtuals[0].viewsCount ? withVirtuals[0].viewsCount + 1 : 1;
			}
		}

		return withVirtuals[0] as PublicUser;
	}

	/********************************************************************************
	 * * USER STATS MODIFIER
	 * * @param input - StatsModifier object containing user ID, target key, and modifier value
	 *****************************************************************************************/
	public async userStatsModifier(input: StatsModifier): Promise<void> {
		try {
			await this.userModel.findByIdAndUpdate(input.id, {
				$inc: { [input.targetKey]: input.modifier },
			});
		} catch (error) {
			console.log(`---------Error: ${error} ---------`);
			throw new BadRequestException('Failed to modify job stats', {
				message: 'Failed to modify job stats',
				details: error.message,
			});
		}
	}

	public async getCandidateSettings(userId: ObjectId, currentToken?: string): Promise<UserSettingsOutput> {
		const sessions = await this.sessionService.getUserSessions(userId, currentToken);
		const pipeline: PipelineStage[] = [
			{ $match: { _id: userId } },
			{
				$addFields: {
					account: {
						professionalHeadline: '$profile.headline',
						avatarUrl: '$profile.avatarUrl',
						country: '$profile.location.country',
						website: '$profile.website',
						firstName: '$firstName',
						lastName: '$lastName',
						email: '$email',
						contactEmail: '$profile.contactInfo.email',
						recoveryEmail: '$recoveryEmail',
						emailVerified: '$emailVerified',
						publicProfileUrl: '$publicProfileUsername',
						phoneNumber: '$profile.contactInfo.phone_number',
						sessions: sessions,
					},
				},
			},
			{
				$project: {
					_id: 0,
					account: 1,
				},
			},
		];

		const userSettings = await this.userModel.aggregate(pipeline).exec();

		if (!userSettings || userSettings.length === 0) {
			throw new UserNotFoundException({
				message: 'User not found',
				userId,
			});
		}

		return userSettings[0];
	}

	/********************************************************************************
	 * * GET USER SESSIONS
	 * * Retrieves all active sessions for a user with isCurrent flag
	 * * @param userId - The ID of the user
	 * * @param currentToken - Optional JWT token to identify the current session
	 *****************************************************************************************/
	public async getUserSessions(userId: ObjectId, currentToken?: string): Promise<SessionOutput[]> {
		return await this.sessionService.getUserSessions(userId, currentToken);
	}

	/********************************************************************************
	 * * REVOKE SESSION
	 * * Revokes a specific session by ID
	 * * @param userId - The ID of the user
	 * * @param sessionId - The ID of the session to revoke
	 *****************************************************************************************/
	public async revokeSession(userId: ObjectId, sessionId: string): Promise<void> {
		return await this.sessionService.revokeSession(userId, sessionId);
	}

	/*****************************************************************************
	 * INFO TIMEZONE DETECTION FROM LOCATION
	 ****************************************************************************/
	/**
	 * Detect timezone based on user's current location (from IP geolocation)
	 * Maps country codes and coordinates to standard IANA timezone identifiers
	 * @param location - Location string or object from IP geolocation service
	 * @returns IANA timezone identifier (e.g., 'Asia/Seoul', 'America/New_York')
	 */
	private detectTimezoneFromLocation(location: any): string {
		// If location is already a timezone string, use it
		if (typeof location === 'string' && location.includes('/')) {
			return location;
		}

		// Common timezone mappings by country code
		const countryTimezoneMap: { [key: string]: string } = {
			KR: 'Asia/Seoul',
			US: 'America/Chicago',
			GB: 'Europe/London',
			DE: 'Europe/Berlin',
			FR: 'Europe/Paris',
			JP: 'Asia/Tokyo',
			CN: 'Asia/Shanghai',
			IN: 'Asia/Kolkata',
			BR: 'America/Sao_Paulo',
			AU: 'Australia/Sydney',
			CA: 'America/Toronto',
			MX: 'America/Mexico_City',
			RU: 'Europe/Moscow',
			SG: 'Asia/Singapore',
			TH: 'Asia/Bangkok',
			VN: 'Asia/Ho_Chi_Minh',
			PH: 'Asia/Manila',
			MY: 'Asia/Kuala_Lumpur',
			ID: 'Asia/Jakarta',
			NZ: 'Pacific/Auckland',
			ZA: 'Africa/Johannesburg',
		};

		// Try to extract country code from location
		let countryCode: string | null = null;

		if (typeof location === 'object' && location !== null) {
			// If location has country property
			if (location.country) {
				countryCode = location.country.toUpperCase();
			} else if (location.countryCode) {
				countryCode = location.countryCode.toUpperCase();
			}
		} else if (typeof location === 'string') {
			// Try to extract country code from string (e.g., "Seoul, KR")
			const matches = location.match(/,\s*([A-Z]{2})$/);
			if (matches && matches[1]) {
				countryCode = matches[1];
			}
		}

		// Return mapped timezone or default to UTC
		if (countryCode && countryTimezoneMap[countryCode]) {
			return countryTimezoneMap[countryCode];
		}

		// Default fallback
		return 'UTC';
	}

	/*****************************************************************************
	 * SECURITY SESSION & TOKEN MANAGEMENT
	 ****************************************************************************/
	public async revokeAllOtherSessions(userId: ObjectId, currentToken?: string): Promise<void> {
		if (!currentToken) {
			// If no current token, revoke all sessions
			return await this.sessionService.revokeAllSessions(userId.toString());
		}

		// Find the current session by token hash
		const currentSession = await this.sessionService.validateSession(currentToken);
		if (!currentSession) {
			// If current session not found, revoke all
			return await this.sessionService.revokeAllSessions(userId.toString());
		}

		// Revoke all sessions except the current one
		return await this.sessionService.revokeAllSessions(userId.toString(), currentSession.id);
	}

	/*****************************************************************************
	 * [SERVICE] USER AVATAR UPLOAD
	 * * Updates user's avatar URL in profile
	 * * @param userId - ID of the user
	 * * @param input - AvatarUploadInput containing the new avatar URL
	 * * @returns Updated PublicUser object
	 ****************************************************************************/

	public async uploadUserAvatar(userId: ObjectId, input: FileUploadInput): Promise<FileUploadOutput> {
		try {
			const user = await this.userModel
				.findByIdAndUpdate(
					userId,
					{
						'profile.avatarUrl': input.url,
					},
					{ new: true },
				)
				.exec();
			if (!user) {
				throw new UserNotFoundException({
					message: 'User not found',
					userId,
				});
			}
			return {
				url: user.profile?.avatarUrl || '',
				filename: input.filename,
			};
		} catch (error) {
			if (error instanceof UserNotFoundException) {
				throw error;
			}
			throw new InternalServerException(
				'Failed to upload user avatar. Please try again later.',
				{
					error: "Hey you've got an error in uploadUserAvatar method",
				},
				500,
			);
		}
	}

	/*****************************************************************************
	 * [SERVICE] USER BANNER UPLOAD
	 * * Updates user's banner URL in profile
	 * * @param userId - ID of the user
	 * * @param input - BannerUploadInput containing the new banner URL
	 * * @returns Updated PublicUser object
	 ****************************************************************************/
	public async uploadUserBanner(userId: ObjectId, input: FileUploadInput): Promise<FileUploadOutput> {
		try {
			const user = await this.userModel
				.findByIdAndUpdate(
					userId,
					{
						'profile.bannerUrl': input.url,
					},
					{ new: true },
				)
				.exec();
			if (!user) {
				throw new UserNotFoundException({
					message: 'User not found',
					userId,
				});
			}
			return {
				url: user.profile?.bannerUrl || '',
				filename: input.filename,
			};
		} catch (error) {
			if (error instanceof UserNotFoundException) {
				throw error;
			}
			throw new InternalServerException(
				'Failed to upload user banner. Please try again later.',
				{
					error: "Hey you've got an error in uploadUserBanner method",
				},
				500,
			);
		}
	}
}
