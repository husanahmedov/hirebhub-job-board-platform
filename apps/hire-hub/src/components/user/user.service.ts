import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RegisterUserInput, User } from '../../libs/dto/user';
import { Model, ObjectId } from 'mongoose';
import {
	UserCreationFailedException,
	UserAlreadyExistsException,
	DatabaseException,
	ErrorCode,
	LoginUserInput,
	UserNotFoundException,
	InvalidCredentialsException,
	UserStatus,
	UserDeactivatedException,
	UserSuspendedException,
	UpdateUserInput,
	PublicUser,
	UpdateProfileInput,
	Step5RegisterInput,
	ResendVerificationInput,
	VerifyEmailInput,
} from '../../libs';
import { AuthService } from '../auth/auth.service';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Step3RegisterInput, Step4RegisterInput } from '../../libs';
import { EmailService } from '../notification/email.service';

@Injectable()
export class UserService {
	constructor(
		@InjectModel('User') private userModel: Model<User>,
		private readonly authService: AuthService,
		private readonly emailService: EmailService,
	) {}

	/** Register a new user and generate auth tokens */
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

			const userData = {
				...input,
				email: normalizedEmail,
				passwordHash: hashedPassword,
				status: UserStatus.ACTIVE,
				emailVerified: false,
				verificationCode,
				verificationCodeExpires,
				settings: {
					language: 'en',
					timezone: 'UTC',
					notifications: {
						email: true,
						push: false,
					},
				},
			};

			const newUser = await this.userModel.create(userData);

			if (!newUser) {
				throw new UserCreationFailedException({
					originalError: 'User document was not created',
					input: { email: normalizedEmail },
				});
			}

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

	/** Authenticate user and generate auth tokens */
	public async login(input: LoginUserInput): Promise<User> {
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

			// STEP 10: Store hashed refresh token in user document
			await this.userModel.findByIdAndUpdate(user._id, { refreshToken: hashedRefreshToken });

			// Attach refresh token to user object (will be sent to client)
			userObject.refreshToken = refreshToken;

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

	/** Update user profile (self-update) */
	public async updateUserByUser(userId: ObjectId, input: UpdateUserInput): Promise<PublicUser> {
		const normalizedEmail: string | undefined = input.email ? input.email.toLowerCase().trim() : undefined;

		try {
			// STEP 2: If email is being updated, check if it's already taken by another user
			// Prevents email conflicts while allowing user to keep their own email
			if (normalizedEmail) {
				input.email = normalizedEmail;

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
			}

			// STEP 3: Update the user document with new values
			// findByIdAndUpdate is atomic and returns the updated document
			// { new: true } ensures we get the updated document, not the old one
			// { runValidators: true } runs Mongoose schema validators on update
			const updatedUser = await this.userModel
				.findByIdAndUpdate(userId, input, {
					new: true, // Return updated document
					runValidators: true, // Run schema validators
				})
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
			return updatedUser.toObject() as PublicUser;
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

	/** Update user profile by admin (can modify privileged fields) */
	public async updateUserByAdmin(targetUserId: ObjectId, input: UpdateUserInput): Promise<PublicUser> {
		const normalizedEmail: string | undefined = input.email ? input.email.toLowerCase().trim() : undefined;

		try {
			if (normalizedEmail) {
				input.email = normalizedEmail;

				const existingUser = await this.userModel
					.findOne({
						email: normalizedEmail,
						_id: { $ne: targetUserId },
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
			}

			// STEP 3: Update the user document with new values
			// Admin can update all fields including status and role (if provided in input)
			// findByIdAndUpdate is atomic and returns the updated document
			// { new: true } ensures we get the updated document, not the old one
			// { runValidators: true } runs Mongoose schema validators on update
			const updatedUser = await this.userModel
				.findByIdAndUpdate(targetUserId, input, {
					new: true, // Return updated document
					runValidators: true, // Run schema validators
				})
				.exec();

			// STEP 4: Verify the user was found and updated
			if (!updatedUser) {
				// User not found with this ID - throw specific exception
				throw new UserNotFoundException({
					message: 'Target user not found for admin update',
					userId: targetUserId,
				});
			}

			// STEP 5: Convert Mongoose document to plain object
			// This includes virtual fields (fullName, profileCompleteness, etc.)
			// and removes Mongoose-specific properties
			// Returns PublicUser (excludes sensitive fields like passwordHash)
			return updatedUser.toObject() as PublicUser;
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
					message: 'User data validation failed during admin update',
					validationErrors,
				});
			}

			// Handle database connection errors
			if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
				throw new InternalServerErrorException('Unable to connect to database service. Please try again later.');
			}

			// Handle unexpected errors with detailed context for debugging
			// Log error details but return generic message to client
			console.error('Unexpected error during admin user update:', {
				error: error.message,
				errorName: error.name,
				targetUserId: targetUserId.toString(),
				timestamp: new Date().toISOString(),
				stack: error.stack,
			});

			throw new InternalServerErrorException('Failed to update user information. Please try again later.');
		}
	}

	/** Create user profile after registration */
	public async createProfileAfterRegistration(userId: ObjectId, profileData: UpdateProfileInput): Promise<PublicUser> {
		try {
			const updatedUser = await this.userModel
				.findByIdAndUpdate(userId, { profile: profileData.profile }, { new: true })
				.exec();

			if (!updatedUser) {
				throw new UserNotFoundException({
					message: 'User not found for profile creation',
					userId,
				});
			}

			return updatedUser.toObject() as PublicUser;
		} catch (error: any) {
			if (error instanceof UserNotFoundException) {
				throw error;
			}

			throw new InternalServerErrorException('Failed to create user profile. Please try again later.');
		}
	}

	/** Step 3: Add education entries (with duplicate detection) */
	public async step3RegistrationProcess(userId: ObjectId, inputData: Step3RegisterInput): Promise<PublicUser> {
		try {
			const currentUser = await this.userModel.findById(userId).exec();

			if (!currentUser) {
				throw new UserNotFoundException({
					message: 'User not found for step 3 registration process',
					userId,
				});
			}

			// STEP 2: Get existing education entries (or empty array if none)
			const existingEducation = currentUser.profile?.education || [];

			// STEP 3: Normalize existing school names for comparison
			const existingSchoolNames = existingEducation.map((edu: any) => edu.school.toLowerCase().trim());

			// STEP 4: Check for duplicates in new education entries
			const duplicateSchools: string[] = [];
			(inputData.education || []).forEach((newEdu) => {
				const normalizedNewSchool = newEdu.school.toLowerCase().trim();
				if (existingSchoolNames.includes(normalizedNewSchool)) {
					duplicateSchools.push(newEdu.school);
				}
			});

			// Throw error if duplicates found
			if (duplicateSchools.length > 0) {
				throw new DatabaseException(ErrorCode.DUPLICATE_KEY_ERROR, {
					message: `Education entries already exist for: ${duplicateSchools.join(', ')}`,
					duplicateSchools,
				});
			}

			// STEP 5: Merge existing and new education entries
			const mergedEducation = [...existingEducation, ...(inputData.education || [])];

			// STEP 6: Update user with merged education array
			const updatedUser = await this.userModel
				.findByIdAndUpdate(userId, { 'profile.education': mergedEducation }, { new: true })
				.exec();

			if (!updatedUser) {
				throw new UserNotFoundException({
					message: 'User not found after education update',
					userId,
				});
			}

			return updatedUser.toObject() as PublicUser;
		} catch (error: any) {
			if (error instanceof UserNotFoundException || error instanceof DatabaseException) {
				throw error;
			}

			throw new InternalServerErrorException(
				'Failed to update user information during step 3 registration process. Please try again later.',
			);
		}
	}

	/** Step 4: Add work experience entries (with duplicate detection) */
	public async step4RegistrationProcess(userId: ObjectId, inputData: Step4RegisterInput): Promise<PublicUser> {
		try {
			const currentUser = await this.userModel.findById(userId).exec();

			if (!currentUser) {
				throw new UserNotFoundException({
					message: 'User not found for step 4 registration process',
					userId,
				});
			}

			// STEP 2: Get existing experience entries (or empty array if none)
			const existingExperience = currentUser.profile?.experience || [];

			// STEP 3: Normalize existing company names for comparison
			const existingCompanyNames = existingExperience.map((exp: any) => exp.company.toLowerCase().trim());

			// STEP 4: Check for duplicates in new experience entries
			const duplicateCompanies: string[] = [];
			(inputData.experience || []).forEach((newExp) => {
				const normalizedNewCompany = newExp.company.toLowerCase().trim();
				if (existingCompanyNames.includes(normalizedNewCompany)) {
					duplicateCompanies.push(newExp.company);
				}
			});

			// Throw error if duplicates found
			if (duplicateCompanies.length > 0) {
				throw new DatabaseException(ErrorCode.DUPLICATE_KEY_ERROR, {
					message: `Experience entries already exist for: ${duplicateCompanies.join(', ')}`,
					duplicateCompanies,
				});
			}

			// STEP 5: Merge existing and new experience entries
			const mergedExperience = [...existingExperience, ...(inputData.experience || [])];

			// STEP 6: Update user with merged experience array
			const updatedUser = await this.userModel
				.findByIdAndUpdate(userId, { 'profile.experience': mergedExperience }, { new: true })
				.exec();

			if (!updatedUser) {
				throw new UserNotFoundException({
					message: 'User not found after experience update',
					userId,
				});
			}

			return updatedUser.toObject() as PublicUser;
		} catch (error: any) {
			if (error instanceof UserNotFoundException || error instanceof DatabaseException) {
				throw error;
			}

			throw new InternalServerErrorException(
				'Failed to update user information during step 4 registration process. Please try again later.',
			);
		}
	}

	/** Step 5: Add certifications/qualifications (with duplicate detection) */
	public async step5RegistrationProcess(userId: ObjectId, inputData: Step5RegisterInput): Promise<PublicUser> {
		try {
			const currentUser = await this.userModel.findById(userId).exec();

			if (!currentUser) {
				throw new UserNotFoundException({
					message: 'User not found for step 5 registration process',
					userId,
				});
			}

			// STEP 2: Get existing qualifications entries (or empty array if none)
			const existingQualifications = currentUser.qualifications || [];

			// STEP 3: Normalize existing profcertorawards names for comparison
			const existingQualificationNames = existingQualifications.map((qual: any) =>
				qual.profcertorawards.toLowerCase().trim(),
			);

			// STEP 4: Check for duplicates in new qualification entries
			const duplicateQualifications: string[] = [];
			(inputData.qualifications || []).forEach((newQual) => {
				const normalizedNewQualification = newQual.profcertorawards.toLowerCase().trim();
				if (existingQualificationNames.includes(normalizedNewQualification)) {
					duplicateQualifications.push(newQual.profcertorawards);
				}
			});

			// Throw error if duplicates found
			if (duplicateQualifications.length > 0) {
				throw new DatabaseException(ErrorCode.DUPLICATE_KEY_ERROR, {
					message: `Qualification entries already exist for: ${duplicateQualifications.join(', ')}`,
					duplicateQualifications,
				});
			}

			// STEP 5: Merge existing and new qualification entries
			const mergedQualifications = [...existingQualifications, ...(inputData.qualifications || [])];

			// STEP 6: Update user with merged qualifications array
			const updatedUser = await this.userModel
				.findByIdAndUpdate(userId, { qualifications: mergedQualifications }, { new: true })
				.exec();

			if (!updatedUser) {
				throw new UserNotFoundException({
					message: 'User not found after qualifications update',
					userId,
				});
			}

			return updatedUser.toObject() as PublicUser;
		} catch (error: any) {
			if (error instanceof UserNotFoundException || error instanceof DatabaseException) {
				throw error;
			}

			throw new InternalServerErrorException(
				'Failed to update user information during step 5 registration process. Please try again later.',
			);
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

			// STEP 6: Optionally rotate refresh token (for enhanced security)
			// For now, we'll keep the same refresh token
			// To enable rotation, uncomment the following:
			// const newRefreshToken = await this.authService.createRefreshToken(user);
			// const hashedNewRefreshToken = await this.authService.hashRefreshToken(newRefreshToken);
			// await this.userModel.findByIdAndUpdate(userId, { refreshToken: hashedNewRefreshToken });

			return {
				user: user.toObject() as User,
				accessToken,
				// newRefreshToken, // Uncomment if rotating refresh tokens
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
	 * Verify user's email with verification code
	 * @param input - Email and verification code
	 * @returns Updated user object
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
	 * Generate a 6-digit verification code
	 * @returns 6-digit numeric string
	 */
	private generateVerificationCode(): string {
		return Math.floor(100000 + Math.random() * 900000).toString();
	}
}
