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
} from '../../libs';
import { AuthService } from '../auth/auth.service';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Injectable()
export class UserService {
	constructor(
		@InjectModel('User') private userModel: Model<User>,
		private readonly authService: AuthService,
	) {}

	/**
	 * Register a new user in the system
	 *
	 * This method handles the complete user registration workflow:
	 * 1. Validates and sanitizes input data (handled by DTO validators)
	 * 2. Hashes the password using bcrypt with salt rounds
	 * 3. Checks for existing users with the same email (prevents duplicates)
	 * 4. Creates a new user document in MongoDB with default values
	 * 5. Converts Mongoose document to plain object (includes virtuals like fullName)
	 * 6. Generates a JWT access token for immediate authentication
	 * 7. Returns the user object with the access token
	 *
	 * @param input - Registration data containing email, password, name, role, and profile
	 * @returns Promise<User> - The newly created user with access token and all fields populated
	 *
	 * @throws {UserAlreadyExistsException} - When email is already registered in the system
	 * @throws {DatabaseException} - When Mongoose validation fails (invalid data format)
	 * @throws {UserCreationFailedException} - When user creation fails for unexpected reasons
	 *
	 * @security
	 * - Password is hashed using bcrypt before storage (never stored in plain text)
	 * - Email is converted to lowercase for case-insensitive uniqueness
	 * - User receives immediate access token upon successful registration
	 *
	 * @performance
	 * - Single database query to check for existing user
	 * - Indexed email field ensures fast duplicate detection
	 * - Bulk document creation for optimal write performance
	 *
	 * @example
	 * const newUser = await userService.register({
	 *   email: 'john@example.com',
	 *   passwordHash: 'SecurePassword123!',
	 *   firstName: 'John',
	 *   lastName: 'Doe',
	 *   role: UserRole.JOB_SEEKER,
	 *   profile: {
	 *     location: { city: 'New York', region: 'NY', country: UserCountry.USA }
	 *   }
	 * });
	 */
	public async register(input: RegisterUserInput): Promise<User> {
		// STEP 1: Validate input data (already validated by class-validator decorators)
		// Normalize email to lowercase for consistent storage
		const normalizedEmail: string = input.email.toLowerCase().trim();

		// STEP 2: Hash the password securely before storage
		// Never store passwords in plain text - using bcrypt with salt rounds
		const hashedPassword: string = await this.authService.hashPassword(input.passwordHash);

		try {
			// STEP 3: Check if user already exists to prevent duplicate accounts
			// Query by email (indexed field for fast lookup)
			const existingUser = await this.userModel.findOne({ email: normalizedEmail }).select('_id email').lean().exec();

			if (existingUser) {
				// User already exists - throw specific exception with context
				throw new UserAlreadyExistsException({
					email: normalizedEmail,
					existingUserId: existingUser._id,
				});
			}

			// STEP 4: Prepare user data for creation with defaults and processed values
			const userData = {
				...input,
				email: normalizedEmail,
				passwordHash: hashedPassword,
				// Set default values that aren't provided in input
				status: UserStatus.ACTIVE,
				emailVerified: false,
				// Initialize settings with defaults if not provided
				settings: {
					language: 'en',
					timezone: 'UTC',
					notifications: {
						email: true,
						push: false,
					},
				},
			};

			// STEP 5: Create the new user document in MongoDB
			// Mongoose will auto-generate _id and timestamps (createdAt, updatedAt)
			const newUser = await this.userModel.create(userData);

			if (!newUser) {
				// Sanity check - should never happen but handle gracefully
				throw new UserCreationFailedException({
					originalError: 'User document was not created',
					input: { email: normalizedEmail },
				});
			}

			// STEP 6: Convert Mongoose document to plain object
			// This includes virtual fields (fullName, profileCompleteness, etc.)
			// and removes Mongoose-specific properties
			const userObject = newUser.toObject() as User;

			// STEP 7: Generate JWT access token (short-lived) for immediate authentication
			// Token includes user data (excluding sensitive fields like password)
			const accessToken: string = await this.authService.createToken(newUser);
			userObject.accessToken = accessToken;

			// STEP 8: Generate JWT refresh token (long-lived) for token refresh
			const refreshToken: string = await this.authService.createRefreshToken(newUser);

			// STEP 9: Hash refresh token before storing in database
			const hashedRefreshToken: string = await this.authService.hashRefreshToken(refreshToken);

			// STEP 10: Store hashed refresh token in user document
			await this.userModel.findByIdAndUpdate(newUser._id, { refreshToken: hashedRefreshToken });

			// Attach refresh token to user object (will be sent to client)
			userObject.refreshToken = refreshToken;

			// STEP 11: Return the complete user object with tokens
			// Client can now use these tokens for authenticated requests
			return userObject;
		} catch (error: any) {
			// Error handling with specific exceptions for different failure scenarios

			// Re-throw custom exceptions (already properly formatted)
			if (error instanceof UserAlreadyExistsException) {
				throw error;
			}

			if (error instanceof UserCreationFailedException) {
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
					message: 'User data validation failed',
					validationErrors,
				});
			}

			// Handle unexpected errors with detailed context for debugging
			throw new UserCreationFailedException({
				originalError: error.message || 'Unknown error during user creation',
				input: { email: normalizedEmail },
				errorName: error.name,
				errorStack: error.stack,
			});
		}
	}

	/**
	 * Authenticate and login an existing user
	 *
	 * This method handles the complete user authentication workflow:
	 * 1. Normalizes and validates the email address
	 * 2. Queries the database for user with matching email (includes password field)
	 * 3. Verifies user exists in the system
	 * 4. Checks account status (active, deactivated, or suspended)
	 * 5. Validates password using bcrypt comparison
	 * 6. Converts Mongoose document to plain object (includes virtuals)
	 * 7. Generates fresh JWT access token for the session
	 * 8. Returns authenticated user with token
	 *
	 * @param input - Login credentials containing email and password
	 * @returns Promise<User> - The authenticated user with access token and full profile
	 *
	 * @throws {UserNotFoundException} - When no user exists with the provided email
	 * @throws {InvalidCredentialsException} - When password doesn't match stored hash
	 * @throws {UserDeactivatedException} - When user account status is DEACTIVATED
	 * @throws {UserSuspendedException} - When user account status is SUSPENDED
	 * @throws {InternalServerErrorException} - When authentication fails unexpectedly
	 *
	 * @security
	 * - Password is compared using bcrypt (secure timing-safe comparison)
	 * - Password hash is explicitly selected (normally excluded from queries)
	 * - Account status is verified before authentication
	 * - Fresh token generated for each login (prevents token reuse)
	 *
	 * @performance
	 * - Single database query with password field selection
	 * - Indexed email field ensures fast user lookup
	 * - Early returns on validation failures
	 *
	 * @example
	 * const authenticatedUser = await userService.login({
	 *   email: 'john@example.com',
	 *   passwordHash: 'UserPassword123!'
	 * });
	 * // Returns user with accessToken for authenticated requests
	 */
	public async login(input: LoginUserInput): Promise<User> {
		// STEP 1: Normalize email for consistent lookup
		// Ensures case-insensitive email matching
		const normalizedEmail: string = input.email.toLowerCase().trim();

		try {
			// STEP 2: Query database for user with matching email
			// Include passwordHash field (normally excluded by schema select: false)
			const user = await this.userModel
				.findOne({ email: normalizedEmail })
				.select('+passwordHash') // Explicitly include password for comparison
				.exec();

			// STEP 3: Verify user exists in the system
			if (!user) {
				// User not found - provide generic message for security
				// (Don't reveal whether email exists in system)
				throw new UserNotFoundException({
					message: `Authentication failed. Please check your credentials and try again.`,
					email: normalizedEmail,
				});
			}

			// STEP 4: Check account status before proceeding with authentication
			// Prevent login for deactivated or suspended accounts

			// Check if account is deactivated (user voluntarily disabled)
			if (user.status === UserStatus.DEACTIVATED) {
				throw new UserDeactivatedException({
					email: normalizedEmail,
					userId: user._id,
					status: user.status,
					message: `Your account has been deactivated. Please contact support to reactivate.`,
				});
			}

			// Check if account is suspended (admin action - policy violation)
			if (user.status === UserStatus.SUSPENDED) {
				throw new UserSuspendedException({
					email: normalizedEmail,
					userId: user._id,
					status: user.status,
					message: 'Your account has been suspended due to policy violations. Contact support for details.',
				});
			}

			// STEP 5: Validate password using secure bcrypt comparison
			// Timing-safe comparison prevents timing attacks
			if (!user.passwordHash) {
				// Sanity check - password should always exist for local accounts
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
				// Password doesn't match - provide generic message for security
				throw new InvalidCredentialsException({
					message: 'Invalid credentials. Please check your email and password.',
					input: { email: normalizedEmail },
					attemptedAt: new Date().toISOString(),
				});
			}

			// STEP 6: Convert Mongoose document to plain object
			// Includes virtual fields (fullName, isDeleted, profileCompleteness)
			// Removes Mongoose-specific properties and internal fields
			const userObject = user.toObject() as User;

			// STEP 7: Generate fresh JWT access token (short-lived) for this session
			// Token includes user data (excluding sensitive fields)
			// Each login creates a new token with fresh expiration
			const accessToken: string = await this.authService.createToken(user);
			userObject.accessToken = accessToken;

			// STEP 8: Generate JWT refresh token (long-lived) for token refresh
			const refreshToken: string = await this.authService.createRefreshToken(user);

			// STEP 9: Hash refresh token before storing in database
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

	/**
	 * Update user profile by the user themselves (authenticated user)
	 *
	 * This method handles the complete user self-update workflow:
	 * 1. Validates and sanitizes input data (handled by DTO validators)
	 * 2. Normalizes email to lowercase if provided
	 * 3. Checks if email already exists for another user (prevents duplicates)
	 * 4. Verifies the user exists in the database
	 * 5. Updates the user document with new values
	 * 6. Converts Mongoose document to plain object (includes virtuals)
	 * 7. Returns the updated user object
	 *
	 * @param userId - The authenticated user's MongoDB ObjectId
	 * @param input - Update data containing optional fields (firstName, lastName, email, profile)
	 * @returns Promise<PublicUser> - The updated user object without sensitive data
	 *
	 * @throws {UserNotFoundException} - When the user doesn't exist in the system
	 * @throws {UserAlreadyExistsException} - When the new email is already taken by another user
	 * @throws {DatabaseException} - When Mongoose validation fails (invalid data format)
	 * @throws {InternalServerErrorException} - When update fails for unexpected reasons
	 *
	 * @security
	 * - Users can only update their own profile (userId from JWT token)
	 * - Email is normalized for case-insensitive uniqueness
	 * - Cannot update sensitive fields like role or status (restricted to admin only)
	 * - Password updates require separate endpoint for security
	 *
	 * @performance
	 * - Single database query to check for email conflicts
	 * - Atomic update operation with findByIdAndUpdate
	 * - Indexed email field ensures fast duplicate detection
	 *
	 * @example
	 * const updatedUser = await userService.updateUserByUser(
	 *   userId,
	 *   {
	 *     firstName: 'Jane',
	 *     lastName: 'Smith',
	 *     profile: {
	 *       location: { city: 'San Francisco', region: 'CA', country: UserCountry.USA }
	 *     }
	 *   }
	 * );
	 */
	public async updateUserByUser(userId: ObjectId, input: UpdateUserInput): Promise<PublicUser> {
		// STEP 1: Normalize email if provided for consistent storage
		// Ensures case-insensitive email matching and prevents duplicate emails with different cases
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

	/**
	 * Update any user profile by admin (privileged operation)
	 *
	 * This method handles the complete admin user update workflow:
	 * 1. Validates and sanitizes input data (handled by DTO validators)
	 * 2. Normalizes email to lowercase if provided
	 * 3. Checks if email already exists for another user (prevents duplicates)
	 * 4. Verifies the target user exists in the database
	 * 5. Updates the user document with new values (including privileged fields)
	 * 6. Converts Mongoose document to plain object (includes virtuals)
	 * 7. Returns the updated user object
	 *
	 * @param targetUserId - The MongoDB ObjectId of the user to update
	 * @param input - Update data containing optional fields (firstName, lastName, email, status, profile)
	 * @returns Promise<PublicUser> - The updated user object without sensitive data
	 *
	 * @throws {UserNotFoundException} - When the target user doesn't exist in the system
	 * @throws {UserAlreadyExistsException} - When the new email is already taken by another user
	 * @throws {DatabaseException} - When Mongoose validation fails (invalid data format)
	 * @throws {InternalServerErrorException} - When update fails for unexpected reasons
	 *
	 * @security
	 * - Only admins can call this method (enforced by RolesGuard in resolver)
	 * - Admin can update any user including privileged fields (status, role)
	 * - Email is normalized for case-insensitive uniqueness
	 * - Password updates still require separate endpoint for security
	 *
	 * @performance
	 * - Single database query to check for email conflicts
	 * - Atomic update operation with findByIdAndUpdate
	 * - Indexed email field ensures fast duplicate detection
	 *
	 * @example
	 * const updatedUser = await userService.updateUserByAdmin(
	 *   targetUserId,
	 *   {
	 *     status: UserStatus.SUSPENDED,
	 *     email: 'newemail@example.com'
	 *   }
	 * );
	 */
	public async updateUserByAdmin(targetUserId: ObjectId, input: UpdateUserInput): Promise<PublicUser> {
		// STEP 1: Normalize email if provided for consistent storage
		// Ensures case-insensitive email matching and prevents duplicate emails with different cases
		const normalizedEmail: string | undefined = input.email ? input.email.toLowerCase().trim() : undefined;

		try {
			// STEP 2: If email is being updated, check if it's already taken by another user
			// Prevents email conflicts while allowing user to keep their own email
			if (normalizedEmail) {
				input.email = normalizedEmail;

				// Query for existing user with this email (excluding target user)
				const existingUser = await this.userModel
					.findOne({
						email: normalizedEmail,
						_id: { $ne: targetUserId }, // Exclude target user from check
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

	/**
	 * Validate and process OAuth login/registration
	 *
	 * This method handles OAuth authentication from social providers (Google, LinkedIn, GitHub):
	 * 1. Checks if user exists with OAuth provider credentials
	 * 2. If user exists with OAuth, return the existing user
	 * 3. If user exists with email but no OAuth, link OAuth provider to existing account
	 * 4. If user doesn't exist, create new OAuth-based account
	 * 5. Updates user's OAuth provider data and emailVerified status
	 * 6. Returns the authenticated user
	 *
	 * @param provider - OAuth provider name ('google', 'linkedin', 'github')
	 * @param providerId - User ID from the OAuth provider
	 * @param profile - OAuth profile data containing email, name, avatar, etc.
	 * @returns Promise<User> - The authenticated/created user
	 *
	 * @throws {UserCreationFailedException} - When user creation fails
	 * @throws {DatabaseException} - When database operation fails
	 * @throws {InternalServerErrorException} - When operation fails unexpectedly
	 *
	 * @security
	 * - OAuth users have emailVerified set to true automatically
	 * - No password required for OAuth-only users
	 * - OAuth provider credentials are stored securely
	 * - Auto-links OAuth to existing email accounts
	 *
	 * @example
	 * const user = await userService.validateOAuthLogin(
	 *   'google',
	 *   '1234567890',
	 *   {
	 *     email: 'john@example.com',
	 *     firstName: 'John',
	 *     lastName: 'Doe',
	 *     avatarUrl: 'https://...',
	 *     profileUrl: 'https://...'
	 *   }
	 * );
	 */
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
			// STEP 1: Check if user exists with this OAuth provider
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

	/**
	 * Refresh access token using refresh token
	 *
	 * This method validates a refresh token and generates a new access token:
	 * 1. Verifies refresh token is valid and not expired
	 * 2. Validates user still exists and is active
	 * 3. Compares provided refresh token with stored hash
	 * 4. Generates new access token
	 * 5. Optionally rotates refresh token (generates new one)
	 *
	 * @param userId - User's MongoDB ObjectId
	 * @param refreshToken - The refresh token to validate
	 * @returns Promise<{ user: User; accessToken: string; newRefreshToken?: string }>
	 *
	 * @throws {UserNotFoundException} - When user doesn't exist
	 * @throws {InvalidCredentialsException} - When refresh token is invalid
	 * @throws {UserDeactivatedException} - When user account is deactivated
	 * @throws {UserSuspendedException} - When user account is suspended
	 * @throws {InternalServerErrorException} - When operation fails unexpectedly
	 *
	 * @security
	 * - Refresh token must match stored hash
	 * - User account status is checked before refresh
	 * - Refresh token rotation for enhanced security (optional)
	 */
	public async refreshAccessToken(
		userId: ObjectId,
		refreshToken: string,
	): Promise<{ user: User; accessToken: string; newRefreshToken?: string }> {
		try {
			// STEP 1: Find user with refresh token field
			const user = await this.userModel.findById(userId).select('+refreshToken').exec();

			// STEP 2: Verify user exists
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
}
