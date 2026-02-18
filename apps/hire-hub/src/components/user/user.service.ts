import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as speakeasy from 'speakeasy';
import * as Qrcode from 'qrcode';

import {
	RegisterUserInput,
	User,
	LoginUserInput,
	PublicUser,
	UpdateUserSettingsInput,
	ResendVerificationInput,
	VerifyEmailInput,
} from '../../libs/dto/user';
import { Model, ObjectId, PipelineStage } from 'mongoose';
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
	WhoCanSendMeMessages,
	WhoCanSeeProfilePhoto,
	WhoCanSeeMyProfile,
	TwoFactorAuthSecretOutput,
	TwoFactorAuthMethod,
	LoginResponse,
} from '../../libs';
import { AuthService } from '../auth/auth.service';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { EmailService } from '../notification/email.service';
import { ViewService } from '../view/view.service';
import { StatsModifier } from '../../libs/interfaces/common';
import { SessionsService } from '../sessions/sessions.service';
import { MessageResponse, SessionOutput } from '../../libs/dto/sessions/output';

@Injectable()
export class UserService {
	constructor(
		@InjectModel('User') private userModel: Model<User>,
		private readonly authService: AuthService,
		private readonly emailService: EmailService,
		private readonly viewService: ViewService,
		private readonly sessionService: SessionsService,
	) {}

	// =============================================================================================
	// --------------------------------- // [USER] // ----------------------------------------------
	// =============================================================================================

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

			return this.stripToEssentialFields(userObject) as User;
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

	/*****************************************************************************
	 * [SERVICE] USER LOGIN
	 * * This method handles user authentication by verifying credentials, checking account status,
	 * * and generating access and refresh tokens. It includes comprehensive error handling for various failure scenarios:
	 * @params input - The login credentials (email and password)
	 * @params deviceInfo - Information about the device used for login (for session tracking)
	 * @params ipAddress - The IP address of the user logging in (for security monitoring)
	 * @params location - The geographical location of the user logging in (for security monitoring)
	 * @return The authenticated user object with access and refresh tokens
	 *
	 * TODO - we should consider implementing account lockout after a certain number of failed login attempts to prevent brute force attacks. This would involve tracking failed login attempts and locking the account for a period of time after reaching the threshold. We could also implement exponential backoff for failed login attempts to further deter brute force attacks. Additionally, we should ensure that error messages do not reveal whether it was the email or password that was incorrect to prevent user enumeration attacks. Instead, we can use a generic message like "Invalid credentials" for all authentication failures. Finally, we should log all authentication attempts with relevant details (timestamp, IP address, user agent) for monitoring and potential investigation of suspicious activity.
	 **********************************************************************************/
	public async login(
		input: LoginUserInput,
		deviceInfo: any,
		ipAddress: string,
		location: any,
	): Promise<typeof LoginResponse> {
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

			console.log(`User ${normalizedEmail} has 2FA enabled. Initiating 2FA process...`);
			if (user.settings?.security?.twoFactorAuthEnabled) {
				if (user.settings.security.twoFactorAuthMethod === TwoFactorAuthMethod.EMAIL && user.emailVerified) {
					try {
						await this.sendEmailTwoFactorAuthCode(user.id);
					} catch (error) {
						console.error('Failed to send 2FA code via email:', error);
						throw new InternalServerException('Failed to send 2FA code. Please try again later.', 500);
					}
					// Generate 2FA code and send via email (non-blocking)
				}
				return {
					success: true,
					message: '2FA required',
				};
			}

			// * REST of the logics is only executed if credentials are valid and 2FA is not enabled

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

			// Return only essential fields to reduce payload size
			// Large objects like settings, qualifications, full profile are excluded
			// Client can fetch these separately when needed
			return this.stripToEssentialFields(userObject) as User;
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

	/*****************************************************************************
	 * [SERVICE] USER LOGIN WITH 2FA
	 * * This method handles user authentication for accounts with Two-Factor Authentication
	 * * (2FA) enabled. It verifies credentials, checks account status, validates the 2FA code,
	 * * and generates access and refresh tokens upon successful authentication. Comprehensive
	 * * error handling is included for various failure scenarios:
	 *
	 *******************************************************************************/
	public async loginWithTwoFactorAuth(
		input: LoginUserInput,
		deviceInfo: any,
		ipAddress: string,
		location: any,
		code: string,
	): Promise<User> {
		const normalizedEmail: string = input.email.toLowerCase().trim();

		try {
			const user = await this.userModel
				.findOne({ email: normalizedEmail })
				.select(
					'+passwordHash +twoFactorAuthSecret +twoFactorBackupCodes +twoFactorVerificationCode +twoFactorVerificationCodeExpires',
				)
				.exec();

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

			// check if code only contains letters and if yes, it is backup
			const isBackupCode = /^[a-zA-Z]+$/.test(code);
			if (isBackupCode) {
				// check if backup code is valid
				const backupCodeIndex = user.twoFactorBackupCodes?.findIndex((backupCode) => backupCode === code);
				if (backupCodeIndex === -1 || backupCodeIndex === undefined) {
					throw new InvalidCredentialsException({
						message: 'Invalid two-factor authentication backup code.',
					});
				}
				// remove used backup code from the list
				user.twoFactorBackupCodes?.splice(backupCodeIndex, 1);
				await user.save();
			} else {
				// Verify Code if not a backup code
				const verified = speakeasy.totp.verify({
					secret: user.twoFactorAuthSecret as string,
					encoding: 'base32',
					token: code,
				});

				if (!verified) {
					// dont hurry to throw an error
					// check if code is email verification code (in case user is trying to login before verifying email)
					console.log(user.twoFactorVerificationCode, code, user.twoFactorVerificationCodeExpires, new Date());

					if (
						user.twoFactorVerificationCode === code &&
						user.twoFactorVerificationCodeExpires &&
						user.twoFactorVerificationCodeExpires > new Date()
					) {
						// if code is valid, mark email as verified and allow login without 2FA
						user.emailVerified = true;
						user.twoFactorVerificationCode = '';
						user.twoFactorVerificationCodeExpires = new Date(0); // set to past date to invalidate
						await user.save();
					} else {
						throw new InvalidCredentialsException({
							message: 'Invalid two-factor authentication code.',
						});
					}
				}
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

			// Return only essential fields to reduce payload size
			// Large objects like settings, qualifications, full profile are excluded
			// Client can fetch these separately when needed
			return this.stripToEssentialFields(userObject) as User;
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

	/******************************************************************************
	 * [SERVICE] USER LOGOUT
	 * * This method handles user logout by revoking the current session associated with the provided refresh token.
	 * * It includes error handling for scenarios such as user not found and issues with session revocation.
	 * @param userId - The ID of the user logging out
	 * @param currentToken - The refresh token associated with the session to revoke
	 *******************************************************************************/
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

	public async updateUserByUser(userId: ObjectId, input: UpdateUserSettingsInput): Promise<UserSettingsOutput> {
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

		const {
			discoverableByEmail,
			showActivityStatus,
			showLastSeenStatus,
			whoCanSendMeMessages,
			whoCanSeeProfilePhoto,
			whoCanSeeMyProfile,
			discoverableByPhoneNumber,
			showLocation,
			showEmailAddress,
			showPhoneNumber,
		} = input.privacy || {};

		const { twoFactorAuthEnabled, oldPassword, newPassword } = input.security || {};

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
				} else {
					console.log('No existing user found with this email, safe to update:', normalizedEmail);
				}

				const currentUser = await this.userModel.findById(userId).exec();

				if (currentUser) {
					if (currentUser?.email !== normalizedEmail) {
						currentUser.emailVerified = false;
						// Generate new verification code
						const verificationCode = this.generateVerificationCode();
						const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
						currentUser.verificationCode = verificationCode;
						currentUser.verificationCodeExpires = verificationCodeExpires;
						currentUser.twoFactorAuthSecret = undefined; // Invalidate existing 2FA secret since email is changing
						await currentUser.save();
						// Send verification email (non-blocking)
						try {
							await this.emailService.sendVerificationEmail(
								normalizedEmail,
								verificationCode,
								firstName || currentUser.firstName,
							);
						} catch (error) {
							console.error('Failed to send verification email:', error);
						}
						try {
							// generate secret for 2FA
							await this.generateTwoFactorAuthSecret(userId);
						} catch (error) {
							console.error('Failed to generate 2FA secret:', error);
							throw new InternalServerException(
								'Failed to update email and 2FA settings. Please try again later.',
								500,
							);
						}
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

						// privacy settings
						'settings.privacy.whoCanSendMeMessages': whoCanSendMeMessages,
						'settings.privacy.whoCanSeeProfilePhoto': whoCanSeeProfilePhoto,
						'settings.privacy.whoCanSeeMyProfile': whoCanSeeMyProfile,
						'settings.privacy.discoverableByEmail': discoverableByEmail,
						'settings.privacy.discoverableByPhoneNumber': discoverableByPhoneNumber,
						'settings.privacy.showActivityStatus': showActivityStatus,
						'settings.privacy.showLastSeenStatus': showLastSeenStatus,
						'settings.privacy.showLocation': showLocation,
						'settings.privacy.showEmailAddress': showEmailAddress,
						'settings.privacy.showPhoneNumber': showPhoneNumber,

						// security settings
						'settings.security.twoFactorAuthEnabled': twoFactorAuthEnabled,
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
				privacy: {
					discoverableByEmail: updatedUser?.settings?.privacy?.discoverableByEmail || false,
					showActivityStatus: updatedUser?.settings?.privacy?.showActivityStatus || false,
					showLastSeenStatus: updatedUser?.settings?.privacy?.showLastSeenStatus || false,
					whoCanSendMeMessages: updatedUser?.settings?.privacy?.whoCanSendMeMessages || WhoCanSendMeMessages.ANYONE,
					whoCanSeeProfilePhoto: updatedUser?.settings?.privacy?.whoCanSeeProfilePhoto || WhoCanSeeProfilePhoto.PUBLIC,
					whoCanSeeMyProfile: updatedUser?.settings?.privacy?.whoCanSeeMyProfile || WhoCanSeeMyProfile.PUBLIC,
					discoverableByPhoneNumber: updatedUser?.settings?.privacy?.discoverableByPhoneNumber || false,
					showLocation: updatedUser?.settings?.privacy?.showLocation || false,
					showEmailAddress: updatedUser?.settings?.privacy?.showEmailAddress || false,
					showPhoneNumber: updatedUser?.settings?.privacy?.showPhoneNumber || false,
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

	/*****************************************************************************
	 * [SERVICE] UPDATE USER ACCOUNT SETTINGS
	 * * This method allows users to update their account information such as email,
	 * * name, contact info, and profile details. It includes comprehensive error handling for various scenarios:
	 * @param userId - The ID of the user to update
	 * @param input - The account settings to update
	 ****************************************************************************/
	public async updateUserAccountSettings(
		userId: ObjectId,
		input: UpdateUserSettingsInput,
	): Promise<UserSettingsOutput> {
		const {
			contactEmail,
			country,
			email,
			firstName,
			lastName,
			phoneNumber,
			professionalHeadline,
			publicProfileUrl,
			recoveryEmail,
			website,
		} = input.account || {};

		// TODO if user is updating email and not verifiying after sending a code, their 2FA status could be compromised. We should consider disabling 2FA until they verify the new email, or at least warn them that changing email without verification will disable 2FA until they verify the new email. This is because 2FA codes are typically sent to the registered email, so if they change it without verifying, they could lose access to their account if they rely on email for 2FA. We want to prevent users from accidentally locking themselves out by changing their email without verifying it. so we should either disable 2FA until they verify the new email, or show a warning message that changing email without verification will disable 2FA until they verify the new email. This way users are aware of the consequences and can take appropriate action to secure their account. We could also consider allowing users to choose a different 2FA method (like an authenticator app) that isn't tied to their email, so they have more flexibility when updating their email address. Overall we want to ensure users don't accidentally lock themselves out while still allowing them to update their email if needed, but with clear communication about the impact on their account security. What we can do now is to add a warning message in the response if they change their email without verifying it, so they are aware that their 2FA will be disabled until they verify the new email. We can also include information about how to verify their new email and re-enable 2FA after verification. This way we provide clear guidance to users on how to maintain their account security while allowing them to update their email address. We can implement this by checking if the email is being updated and if it's different from the current email, then include a warning message in the response indicating that 2FA will be disabled until they verify the new email. We can also provide instructions on how to verify their new email and re-enable 2FA after verification. This way we ensure users are informed about the consequences of changing their email without verification and can take appropriate action to secure their account.

		const updatedFields: any = {};

		if (email) {
			input.account?.email ? (input.account.email = email.toLowerCase().trim()) : null;
		}
		const normalizedEmail: string | undefined = input.account?.email
			? input.account.email.toLowerCase().trim()
			: undefined;

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

		if (currentUser) {
			if (currentUser?.email !== normalizedEmail) {
				currentUser.emailVerified = false;
				// Generate new verification code
				const verificationCode = this.generateVerificationCode();
				const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
				currentUser.verificationCode = verificationCode;
				currentUser.verificationCodeExpires = verificationCodeExpires;
				currentUser.twoFactorAuthSecret = ''; // Invalidate existing 2FA secret since email is changing
				await currentUser.save();
				// Send verification email (non-blocking)
				try {
					await this.emailService.sendVerificationEmail(
						normalizedEmail || currentUser.email,
						verificationCode,
						firstName || currentUser.firstName,
					);
				} catch (error) {
					console.error('Failed to send verification email:', error);
				}
			}
		}

		this.addFieldIfPresent(updatedFields, 'profile.contactInfo.email', contactEmail, (v) => v.toLowerCase());
		this.addFieldIfPresent(updatedFields, 'profile.location.country', country);
		this.addFieldIfPresent(updatedFields, 'email', email, (v) => v.toLowerCase());
		this.addFieldIfPresent(updatedFields, 'firstName', firstName);
		this.addFieldIfPresent(updatedFields, 'lastName', lastName);
		this.addFieldIfPresent(updatedFields, 'profile.contactInfo.phone_number', phoneNumber);
		this.addFieldIfPresent(updatedFields, 'profile.headline', professionalHeadline);
		this.addFieldIfPresent(updatedFields, 'publicProfileUsername', publicProfileUrl);
		this.addFieldIfPresent(updatedFields, 'recoveryEmail', recoveryEmail);
		this.addFieldIfPresent(updatedFields, 'profile.website', website);

		const updatedUser = await this.userModel
			.findOneAndUpdate(
				{
					_id: userId,
				},
				{
					$set: updatedFields,
				},
				{
					new: true,
					runValidators: true,
				},
			)
			.exec();
		return {
			account: {
				email: updatedUser?.email || '',
				contactEmail: updatedUser?.profile?.contactInfo?.email || '',
				firstName: updatedUser?.firstName || '',
				lastName: updatedUser?.lastName || '',
				professionalHeadline: updatedUser?.profile?.headline || '',
				publicProfileUrl: updatedUser?.publicProfileUsername || '',
				country: updatedUser?.profile?.location?.country || '',
				website: updatedUser?.profile?.website || '',
				phoneNumber: updatedUser?.profile?.contactInfo?.phone_number || '',
				recoveryEmail: updatedUser?.recoveryEmail || '',
				emailVerified: updatedUser?.emailVerified || false,
			},
		};
	}
	/*****************************************************************************
	 * [SERVICE] UPDATE USER PRIVACY SETTINGS
	 * * This method allows users to update their privacy settings such as who can see their profile,
	 * * activity status, and contact information. It includes comprehensive error handling for various scenarios:
	 * @param userId - The ID of the user to update
	 * @param input - The privacy settings to update
	 ****************************************************************************/
	public async updateUserPrivacySettings(
		userId: ObjectId,
		input: UpdateUserSettingsInput,
	): Promise<UserSettingsOutput> {
		const {
			discoverableByEmail,
			showActivityStatus,
			showLastSeenStatus,
			whoCanSendMeMessages,
			whoCanSeeProfilePhoto,
			whoCanSeeMyProfile,
			discoverableByPhoneNumber,
			showLocation,
			showEmailAddress,
			showPhoneNumber,
		} = input.privacy || {};

		const updatedFields: any = {};

		this.addFieldIfPresent(updatedFields, 'settings.privacy.discoverableByEmail', discoverableByEmail);
		this.addFieldIfPresent(updatedFields, 'settings.privacy.showActivityStatus', showActivityStatus);
		this.addFieldIfPresent(updatedFields, 'settings.privacy.showLastSeenStatus', showLastSeenStatus);
		this.addFieldIfPresent(updatedFields, 'settings.privacy.whoCanSendMeMessages', whoCanSendMeMessages);
		this.addFieldIfPresent(updatedFields, 'settings.privacy.whoCanSeeProfilePhoto', whoCanSeeProfilePhoto);
		this.addFieldIfPresent(updatedFields, 'settings.privacy.whoCanSeeMyProfile', whoCanSeeMyProfile);
		this.addFieldIfPresent(updatedFields, 'settings.privacy.discoverableByPhoneNumber', discoverableByPhoneNumber);
		this.addFieldIfPresent(updatedFields, 'settings.privacy.showLocation', showLocation);
		this.addFieldIfPresent(updatedFields, 'settings.privacy.showEmailAddress', showEmailAddress);
		this.addFieldIfPresent(updatedFields, 'settings.privacy.showPhoneNumber', showPhoneNumber);

		console.log('Privacy update fields:', updatedFields);

		const updatedUser = await this.userModel
			.findOneAndUpdate(
				{
					_id: userId,
				},
				{
					$set: updatedFields,
				},
				{
					new: true,
					runValidators: true,
				},
			)
			.exec();

		if (!updatedUser) {
			throw new UserNotFoundException({
				message: 'User not found for update',
				userId,
			});
		}

		return {
			privacy: {
				discoverableByEmail: updatedUser?.settings?.privacy?.discoverableByEmail || false,
				showActivityStatus: updatedUser?.settings?.privacy?.showActivityStatus || false,
				showLastSeenStatus: updatedUser?.settings?.privacy?.showLastSeenStatus || false,
				whoCanSendMeMessages: updatedUser?.settings?.privacy?.whoCanSendMeMessages || WhoCanSendMeMessages.ANYONE,
				whoCanSeeProfilePhoto: updatedUser?.settings?.privacy?.whoCanSeeProfilePhoto || WhoCanSeeProfilePhoto.PUBLIC,
				whoCanSeeMyProfile: updatedUser?.settings?.privacy?.whoCanSeeMyProfile || WhoCanSeeMyProfile.PUBLIC,
				discoverableByPhoneNumber: updatedUser?.settings?.privacy?.discoverableByPhoneNumber || false,
				showLocation: updatedUser?.settings?.privacy?.showLocation || false,
				showEmailAddress: updatedUser?.settings?.privacy?.showEmailAddress || false,
				showPhoneNumber: updatedUser?.settings?.privacy?.showPhoneNumber || false,
			},
		};
	}

	/*****************************************************************************
	 * [SERVICE] UPDATE USER SECURITY SETTINGS
	 * * This method allows users to update their security settings such as enabling/disabling 2FA and changing their password.
	 * * It includes comprehensive error handling for various scenarios:
	 * * - Validates old password before allowing password change
	 * * - Disallows password change for OAuth users without a password and prompts them to set a password first
	 * * - Updates 2FA settings and handles edge cases related to email changes affecting 2FA
	 * * - Provides detailed error responses for validation failures and unexpected errors
	 * @param userId - The ID of the user to update
	 * @param input - The security settings to update
	 ****************************************************************************/
	public async updateUserSecuritySettings(
		userId: ObjectId,
		input: UpdateUserSettingsInput,
	): Promise<UserSettingsOutput> {
		const { twoFactorAuthEnabled, oldPassword, newPassword, loginAlertsEnabled, rememberedDevicesEnabled } =
			input.security || {};

		try {
			// If password change is requested, validate old password first
			if (newPassword) {
				const user = await this.userModel.findById(userId).select('+passwordHash').exec();

				if (!user) {
					throw new UserNotFoundException({
						message: 'User not found',
						userId,
					});
				}

				// If user is an OAuth user (no password), disallow password change and prompt to set password first
				if (!user.passwordHash) {
					// allow setting password for oauth user if they don't have one yet
					if (user.oauthProviders) {
						if (user.oauthProviders.length > 0) {
							const hasPassword = await this.authService.hashPassword(newPassword);
							await this.userModel
								.findByIdAndUpdate(userId, { passwordHash: hasPassword, lastChangedPasswordAt: new Date() })
								.exec();
							return {
								security: {
									twoFactorAuthEnabled: user?.settings?.security?.twoFactorAuthEnabled || false,
									lastChangedPasswordAt: new Date(),
									isOauthUser: true,
								},
							};
						}
					}
				}

				const isOldPasswordValid = await this.authService.comparePassword(
					oldPassword ? oldPassword : '',
					user.passwordHash as string,
				);

				if (!isOldPasswordValid) {
					throw new InvalidCredentialsException({
						message: 'Old password is incorrect',
					});
				}

				// Hash and update password
				const hashedPassword = await this.authService.hashPassword(newPassword);
				await this.userModel
					.findByIdAndUpdate(userId, { passwordHash: hashedPassword, lastChangedPasswordAt: new Date() })
					.exec();
			}

			// Update security settings (if provided)
			const updatedFields: any = {};

			// FIX: Use 'settings.security.*' not 'profile.security.*'
			this.addFieldIfPresent(updatedFields, 'settings.security.twoFactorAuthEnabled', twoFactorAuthEnabled);
			this.addFieldIfPresent(updatedFields, 'settings.security.loginAlertsEnabled', loginAlertsEnabled);
			this.addFieldIfPresent(updatedFields, 'settings.security.rememberedDevicesEnabled', rememberedDevicesEnabled);

			let updatedUser;
			if (Object.keys(updatedFields).length > 0) {
				updatedUser = await this.userModel
					.findOneAndUpdate({ _id: userId }, { $set: updatedFields }, { new: true, runValidators: true })
					.exec();
			} else {
				updatedUser = await this.userModel.findById(userId).exec();
			}

			if (!updatedUser) {
				throw new UserNotFoundException({
					message: 'User not found for update',
					userId,
				});
			}

			return {
				security: {
					twoFactorAuthEnabled: updatedUser?.settings?.security?.twoFactorAuthEnabled || false,
					loginAlertsEnabled: updatedUser?.settings?.security?.loginAlertsEnabled || false,
					rememberedDevicesEnabled: updatedUser?.settings?.security?.rememberedDevicesEnabled || false,
					lastChangedPasswordAt: updatedUser?.lastChangedPasswordAt || null,
				},
			};
		} catch (error: any) {
			// Re-throw custom exceptions
			if (error instanceof UserNotFoundException || error instanceof InvalidCredentialsException) {
				throw error;
			}

			// Handle validation errors
			if (error.name === 'ValidationError') {
				const validationErrors = Object.keys(error.errors || {}).map((field) => ({
					field,
					message: error.errors[field]?.message || 'Validation failed',
					value: error.errors[field]?.value,
				}));

				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message: 'Security settings validation failed',
					validationErrors,
				});
			}

			// Handle unexpected errors
			console.error('Unexpected error during security settings update:', {
				error: error.message,
				errorName: error.name,
				userId: userId.toString(),
				timestamp: new Date().toISOString(),
				stack: error.stack,
			});

			throw new InternalServerErrorException('Failed to update security settings. Please try again later.');
		}
	}

	/*****************************************************************************
	 * [SERVICE] UPDATE USER NOTIFICATIONS SETTINGS
	 * * This method allows users to update their notification preferences such as email,
	 * * push, and SMS notifications for various events.
	 * * It includes comprehensive error handling for various scenarios:
	 * @param userId - The ID of the user to update
	 * @param input - The notification settings to update
	 ****************************************************************************/
	public async updateUserNotificationsSettings(
		userId: ObjectId,
		input: UpdateUserSettingsInput,
	): Promise<UserSettingsOutput> {
		const {
			email,
			push,
			sms,
			jobAlerts,
			applicationUpdates,
			recommendations,
			messages,
			connectionRequests,
			profileViews,
			mentions,
			weeklyDigest,
			marketingEmails,
			paymentNotifications,
			milestoneNotifications,
			contractUpdates,
			proposalUpdates,
			reviewsAndRatings,
			collaborationInvites,
		} = input.notifications || {};

		const updatedFields: any = {};

		this.addFieldIfPresent(updatedFields, 'settings.notifications.email', email);
		this.addFieldIfPresent(updatedFields, 'settings.notifications.push', push);
		this.addFieldIfPresent(updatedFields, 'settings.notifications.sms', sms);
		this.addFieldIfPresent(updatedFields, 'settings.notifications.jobAlerts', jobAlerts);
		this.addFieldIfPresent(updatedFields, 'settings.notifications.applicationUpdates', applicationUpdates);
		this.addFieldIfPresent(updatedFields, 'settings.notifications.recommendations', recommendations);
		this.addFieldIfPresent(updatedFields, 'settings.notifications.messages', messages);
		this.addFieldIfPresent(updatedFields, 'settings.notifications.connectionRequests', connectionRequests);
		this.addFieldIfPresent(updatedFields, 'settings.notifications.profileViews', profileViews);
		this.addFieldIfPresent(updatedFields, 'settings.notifications.mentions', mentions);
		this.addFieldIfPresent(updatedFields, 'settings.notifications.weeklyDigest', weeklyDigest);
		this.addFieldIfPresent(updatedFields, 'settings.notifications.marketingEmails', marketingEmails);
		this.addFieldIfPresent(updatedFields, 'settings.notifications.paymentNotifications', paymentNotifications);
		this.addFieldIfPresent(updatedFields, 'settings.notifications.milestoneNotifications', milestoneNotifications);
		this.addFieldIfPresent(updatedFields, 'settings.notifications.contractUpdates', contractUpdates);
		this.addFieldIfPresent(updatedFields, 'settings.notifications.proposalUpdates', proposalUpdates);
		this.addFieldIfPresent(updatedFields, 'settings.notifications.reviewsAndRatings', reviewsAndRatings);
		this.addFieldIfPresent(updatedFields, 'settings.notifications.collaborationInvites', collaborationInvites);
		let updatedUser;
		if (Object.keys(updatedFields).length > 0) {
			updatedUser = await this.userModel
				.findOneAndUpdate({ _id: userId }, { $set: updatedFields }, { new: true, runValidators: true })
				.exec();
		} else {
			updatedUser = await this.userModel.findById(userId).exec();
		}

		if (!updatedUser) {
			throw new UserNotFoundException({
				message: 'User not found for update',
				userId,
			});
		}
		
		return {
			notifications: {
				email: updatedUser?.settings?.notifications?.email || false,
				push: updatedUser?.settings?.notifications?.push || false,
				sms: updatedUser?.settings?.notifications?.sms || false,
				jobAlerts: updatedUser?.settings?.notifications?.jobAlerts || false,
				applicationUpdates: updatedUser?.settings?.notifications?.applicationUpdates || false,
				recommendations: updatedUser?.settings?.notifications?.recommendations || false,
				messages: updatedUser?.settings?.notifications?.messages || false,
				connectionRequests: updatedUser?.settings?.notifications?.connectionRequests || false,
				profileViews: updatedUser?.settings?.notifications?.profileViews || false,
				mentions: updatedUser?.settings?.notifications?.mentions || false,
				weeklyDigest: updatedUser?.settings?.notifications?.weeklyDigest || false,
				marketingEmails: updatedUser?.settings?.notifications?.marketingEmails || false,
				paymentNotifications: updatedUser?.settings?.notifications?.paymentNotifications || false,
				milestoneNotifications: updatedUser?.settings?.notifications?.milestoneNotifications || false,
				contractUpdates: updatedUser?.settings?.notifications?.contractUpdates || false,
				proposalUpdates: updatedUser?.settings?.notifications?.proposalUpdates || false,
				reviewsAndRatings: updatedUser?.settings?.notifications?.reviewsAndRatings || false,
				collaborationInvites: updatedUser?.settings?.notifications?.collaborationInvites || false,
			},
		};
	}

	/*****************************************************************************
	 * [SERVICE] VALIDATE OAUTH LOGIN
	 * * This method handles the OAuth login flow, including:
	 * * - Checking if a user exists with the given OAuth provider and provider ID
	 * * - If found, generating access and refresh tokens for the user
	 * * - If not found, checking if a user exists with the same email (but no OAuth linked)
	 * * - If email match found, linking the OAuth provider to the existing account and generating tokens
	 * * - If no user found at all, creating a new user account based on the OAuth profile and generating tokens
	 * * The method includes comprehensive error handling for various scenarios such as database errors and user creation failures.
	 * @param provider - The OAuth provider (e.g., 'google', 'facebook')
	 * @param providerId - The unique ID from the OAuth provider for this user
	 * @param profile - The user's profile information from the OAuth provider
	 * @returns The authenticated user with access and refresh tokens
	 ****************************************************************************/
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
				// STEP 2: User found with OAuth credentials - generate tokens and return
				const userObject = user.toObject() as User;
				const accessToken = await this.authService.createToken(user);
				const refreshToken = await this.authService.createRefreshToken(user);
				const hashedRefreshToken = await this.authService.hashRefreshToken(refreshToken);

				// Update refresh token in database
				await this.userModel.findByIdAndUpdate(user._id, { refreshToken: hashedRefreshToken });

				userObject.accessToken = accessToken;
				userObject.refreshToken = refreshToken;
				return this.stripToEssentialFields(userObject) as User;
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
									'profile.avatarUrl': profile.avatarUrl || user.profile?.avatarUrl || '',
								},
							},
							{ new: true },
						)
						.exec();

					if (!updatedUser) {
						throw new InternalServerErrorException('Failed to link OAuth provider to existing account');
					}

					// Generate tokens for linked account
					const userObject = updatedUser.toObject() as User;
					const accessToken = await this.authService.createToken(updatedUser);
					const refreshToken = await this.authService.createRefreshToken(updatedUser);
					const hashedRefreshToken = await this.authService.hashRefreshToken(refreshToken);

					// Update refresh token in database
					await this.userModel.findByIdAndUpdate(updatedUser._id, { refreshToken: hashedRefreshToken });

					userObject.accessToken = accessToken;
					userObject.refreshToken = refreshToken;
					return this.stripToEssentialFields(userObject) as User;
				}

				// OAuth provider already linked - generate tokens and return
				const userObject = user.toObject() as User;
				const accessToken = await this.authService.createToken(user);
				const refreshToken = await this.authService.createRefreshToken(user);
				const hashedRefreshToken = await this.authService.hashRefreshToken(refreshToken);

				// Update refresh token in database
				await this.userModel.findByIdAndUpdate(user._id, { refreshToken: hashedRefreshToken });

				userObject.accessToken = accessToken;
				userObject.refreshToken = refreshToken;
				return this.stripToEssentialFields(userObject) as User;
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

			// Generate tokens for new OAuth user
			const userObject = newUser.toObject() as User;
			const accessToken = await this.authService.createToken(newUser);
			const refreshToken = await this.authService.createRefreshToken(newUser);
			const hashedRefreshToken = await this.authService.hashRefreshToken(refreshToken);

			// Update refresh token in database
			await this.userModel.findByIdAndUpdate(newUser._id, { refreshToken: hashedRefreshToken });

			userObject.accessToken = accessToken;
			userObject.refreshToken = refreshToken;
			return this.stripToEssentialFields(userObject) as User;
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

	/*****************************************************************************
	 * [SERVICE] REFRESH ACCESS TOKEN
	 * * This method handles the refresh token flow, including:
	 * * - Validating the provided refresh token against the stored hash
	 * * - Checking the user's account status (active, deactivated, suspended)
	 * * - Generating a new access token if valid
	 * * - Optionally rotating the refresh token for enhanced security
	 * * The method includes comprehensive error handling for various scenarios such as invalid tokens, user not found, and database errors.
	 * @param userId - The ID of the user requesting a new access token
	 * @param refreshToken - The refresh token provided by the client
	 * @returns The authenticated user with a new access token and optionally a new refresh token
	 ****************************************************************************/
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

	/*****************************************************************************
	 * [SERVICE] VERIFY EMAIL
	 * * This method handles the email verification process, including:
	 * * - Validating the provided verification code against the stored code and expiration
	 * * - Marking the email as verified if successful
	 * * - Handling edge cases such as expired codes, invalid codes, and already verified emails
	 * * The method includes comprehensive error handling for various scenarios such as user not found, validation errors, and unexpected errors.
	 * @param input - The email verification input containing the email and verification code
	 * @returns The updated user object with emailVerified set to true if successful
	 ****************************************************************************/
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

	/*****************************************************************************
	 * [SERVICE] RESEND VERIFICATION CODE
	 * * This method handles resending the email verification code, including:
	 * * - Validating the user's email and checking if they exist
	 * * - Checking if the email is already verified and preventing resending if so
	 * * - Generating a new verification code and expiration time
	 * * - Sending the verification email with the new code
	 * * The method includes comprehensive error handling for various scenarios such as user not found, already verified emails, and unexpected errors.
	 * @param input - The resend verification input containing the email
	 * @returns A success message if the verification code was sent successfully
	 ****************************************************************************/
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

	/*****************************************************************************
	 * [SERVICE] GET MY COMPANIES
	 * * This method retrieves the list of companies that the user is associated with, either as an owner or a recruiter. It includes:
	 * * - Aggregating company data based on the user's ID
	 * * - Determining the user's role (owner or recruiter) for each company
	 * * - Handling edge cases such as no associated companies and database errors
	 * @param userId - The ID of the user whose companies are being retrieved
	 * @returns A list of companies with the user's role in each
	 ****************************************************************************/
	public async getMyCompanies(userId: string) {
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

	/*****************************************************************************
	 * [SERVICE] SWITCH ACTIVE COMPANY
	 * * This method allows a user to switch their active company context, which may affect the data they see and the actions they can perform. It includes:
	 * * - Validating that the user has access to the specified company (either as an owner or recruiter)
	 * * - Updating the user's activeCompanyId field in the database
	 * * - Returning the updated user profile with the new active company context
	 * * The method includes comprehensive error handling for scenarios such as unauthorized access, user not found, and database errors.
	 * @param userId - The ID of the user switching their active company
	 * @param companyId - The ID of the company to switch to
	 * @returns The updated user profile with the new active company context
	 ****************************************************************************/
	public async switchActiveCompany(userId: string, companyId: string): Promise<PublicUser> {
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

	/*****************************************************************************
	 * [SERVICE] GET ACTIVE COMPANY
	 * * This method retrieves the currently active company context for a user, which may affect
	 * * the data they see and the actions they  can perform. It includes:
	 * * - Aggregating company data based on the user's activeCompanyId
	 * * - Handling edge cases such as no active company set, user not found, and database errors
	 * @param userId - The ID of the user whose active company is being retrieved
	 * @returns The active company context for the user, or null if no active company is set
	 ****************************************************************************/
	public async getActiveCompany(userId: string) {
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

	/*****************************************************************************
	 * [SERVICE] GET CANDIDATE PROFILE
	 * * This method retrieves the profile information for a candidate. It includes:
	 * * - Fetching the user's profile based on the provided username or user ID
	 * * - Handling edge cases such as user not found, unauthorized access, and database errors
	 * @param targetUsername - The username of the candidate whose profile is being retrieved (optional)
	 * @param userId - The ID of the user making the request (optional, used for access control)
	 * @returns The candidate's profile information, or an error if not found or unauthorized
	 ****************************************************************************/
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

	/*****************************************************************************
	 * [SERVICE] USER STATS MODIFIER
	 * * This method modifies user statistics based on the provided input. It includes:
	 * * - Validating the input data for correctness
	 * * - Updating the specified statistic in the database using an atomic increment operation
	 * * - Handling edge cases such as user not found and database errors
	 * @param input - The input containing the user ID, target statistic key, and modifier value
	 ****************************************************************************/
	private async userStatsModifier(input: StatsModifier): Promise<void> {
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

	/*****************************************************************************
	 * [SERVICE] GET CANDIDATE SETTINGS
	 * * This method retrieves the settings for a candidate, including account, privacy, and security settings. It includes:
	 * * - Fetching the user's settings based on the requested field (account, privacy, or security)
	 * * - Aggregating session information for security settings
	 * * - Handling edge cases such as user not found and database errors
	 * @param userId - The ID of the user whose settings are being retrieved
	 * @param requestedField - The specific settings field being requested (account, privacy, or security)
	 * @param currentToken - Optional JWT token to identify the current session (used for session management in security settings)
	 * @returns The requested settings for the candidate, or an error if not found
	 ****************************************************************************/
	public async getCandidateSettings(
		userId: ObjectId,
		requestedField: string,
		currentToken?: string,
	): Promise<UserSettingsOutput> {
		const sessions = await this.sessionService.getUserSessions(userId, currentToken);
		const addFieldStage: any = {};
		if (requestedField === 'account') {
			addFieldStage.account = {
				professionalHeadline: {
					$ifNull: ['$profile.headline', ''],
				},
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
			};
		}
		if (requestedField === 'privacy') {
			addFieldStage.privacy = {
				whoCanSeeMyProfile: {
					$ifNull: ['$settings.privacy.whoCanSeeMyProfile', 'PUBLIC'],
				},
				whoCanSeeProfilePhoto: {
					$ifNull: ['$settings.privacy.whoCanSeeProfilePhoto', 'PUBLIC'],
				},
				whoCanSendMeMessages: {
					$ifNull: ['$settings.privacy.whoCanSendMeMessages', 'ANYONE'],
				},
				showEmailAddress: {
					$ifNull: ['$settings.privacy.showEmailAddress', false],
				},
				showPhoneNumber: {
					$ifNull: ['$settings.privacy.showPhoneNumber', false],
				},
				showLocation: {
					$ifNull: ['$settings.privacy.showLocation', false],
				},
				discoverableByEmail: {
					$ifNull: ['$settings.privacy.discoverableByEmail', false],
				},
				discoverableByPhoneNumber: {
					$ifNull: ['$settings.privacy.discoverableByPhoneNumber', false],
				},
				showActivityStatus: {
					$ifNull: ['$settings.privacy.showActivityStatus', false],
				},
				showLastSeenStatus: {
					$ifNull: ['$settings.privacy.showLastSeenStatus', false],
				},
			};
		}
		if (requestedField === 'security') {
			addFieldStage.security = {
				twoFactorAuthEnabled: {
					$ifNull: ['$settings.security.twoFactorAuthEnabled', false],
				},
				lastChangedPasswordAt: {
					$ifNull: ['$lastChangedPasswordAt', null],
				},
				isOauthUser: {
					$cond: {
						if: { $gt: [{ $size: '$oauthProviders' }, 0] },
						then: true,
						else: false,
					},
				},
				twoFactorAuthMethod: {
					$ifNull: ['$settings.security.twoFactorAuthMethod', 'NONE'],
				},
				backupCodesGenerated: {
					$ifNull: ['$settings.security.backupCodesGenerated', false],
				},
				backupCodesGeneratedAt: {
					$ifNull: ['$settings.security.backupCodesGeneratedAt', null],
				},
				twoFactorAuthEnabledAt: {
					$ifNull: ['$settings.security.twoFactorAuthEnabledAt', null],
				},
				loginAlertsEnabled: {
					$ifNull: ['$settings.security.loginAlertsEnabled', false],
				},
				rememberedDevicesEnabled: {
					$ifNull: ['$settings.security.rememberedDevicesEnabled', false],
				},
				sessions: sessions,
			};
		}
		if (requestedField === 'notifications') {
			addFieldStage.notifications = {
				email: {
					$ifNull: ['$settings.notifications.email', true],
				},
				push: {
					$ifNull: ['$settings.notifications.push', false],
				},
				jobAlerts: {
					$ifNull: ['$settings.notifications.jobAlerts', false],
				},
				applicationUpdates: {
					$ifNull: ['$settings.notifications.applicationUpdates', false],
				},
				messages: {
					$ifNull: ['$settings.notifications.messages', false],
				},
				mentions: {
					$ifNull: ['$settings.notifications.mentions', false],
				},
				recommendations: {
					$ifNull: ['$settings.notifications.recommendations', false],
				},
				connectionRequests: {
					$ifNull: ['$settings.notifications.connectionRequests', false],
				},
				profileViews: {
					$ifNull: ['$settings.notifications.profileViews', false],
				},
				weeklyDigest: {
					$ifNull: ['$settings.notifications.weeklyDigest', false],
				},
				marketingEmails: {
					$ifNull: ['$settings.notifications.marketingEmails', false],
				},
				paymentNotifications: {
					$ifNull: ['$settings.notifications.paymentNotifications', false],
				},
				milestoneNotifications: {
					$ifNull: ['$settings.notifications.milestoneNotifications', false],
				},
				contractUpdates: {
					$ifNull: ['$settings.notifications.contractUpdates', false],
				},
				proposalUpdates: {
					$ifNull: ['$settings.notifications.proposalUpdates', false],
				},
				reviewsAndRatings: {
					$ifNull: ['$settings.notifications.reviewsAndRatings', false],
				},
				collaborationInvites: {
					$ifNull: ['$settings.notifications.collaborationInvites', false],
				},
			};
		}
		const pipeline: PipelineStage[] = [
			{ $match: { _id: userId } },
			{ $addFields: addFieldStage },
			{
				$project: {
					_id: 0,
					[requestedField]: 1,
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
	 * [SERVICE] USER SESSIONS
	 * * Retrieves all active sessions for a user with isCurrent flag
	 * * @param userId - The ID of the user
	 * * @param currentToken - Optional JWT token to identify the current session
	 **********************************************************************************/
	public async getUserSessions(userId: ObjectId, currentToken?: string): Promise<SessionOutput[]> {
		return await this.sessionService.getUserSessions(userId, currentToken);
	}

	/********************************************************************************
	 * [SERVICE] REVOKE SESSION
	 * * Revokes a specific session by ID
	 * * @param userId - The ID of the user
	 * * @param sessionId - The ID of the session to revoke
	 *********************************************************************************/
	public async revokeSession(userId: ObjectId, sessionId: string): Promise<MessageResponse> {
		try {
			const session = await this.sessionService.getSessionById(sessionId);
			if (!session || session.userId.toString() !== userId.toString()) {
				throw new UserNotFoundException({
					message: 'Session not found for this user',
					userId,
					sessionId,
				});
			}
			console.log(`-------- Revoking session with ID "${sessionId}" for user "${userId}" --------`);
			return await this.sessionService.revokeSession(userId, sessionId);
		} catch (error) {
			if (error instanceof UserNotFoundException) {
				throw error;
			}
			throw new InternalServerException(
				'Failed to revoke session. Please try again later.',
				{
					error: "Hey you've got an error in revokeSession method",
				},
				500,
			);
		}
	}

	/********************************************************************************
	 * [SERVICE] REVOKE ALL SESSIONS EXCEPT CURRENT
	 * * Revokes all sessions for a user except the current session
	 * * @param userId - The ID of the user
	 * * @param sessionId - The ID of the current session to exclude from revocation
	 *********************************************************************************/
	public async revokeAllSessionsExceptCurrent(userId: ObjectId, sessionId: string): Promise<MessageResponse> {
		try {
			return await this.sessionService.revokeAllSessions(userId, sessionId);
		} catch (error) {
			if (error instanceof UserNotFoundException) {
				throw error;
			}
			if (error instanceof NotFoundException) {
				throw new NotFoundException('No active sessions found to revoke.');
			}
			throw new InternalServerException(
				'Failed to revoke session. Please try again later.',
				{
					error: "Hey you've got an error in revokeAllSessionsExceptCurrent method",
				},
				500,
			);
		}
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

	/****************************************************************************
	 *  [SERVICE] GENERATE 2FA SECRET
	 *  Generates a new 2FA secret for the user
	 *  @param userId - ID of the user
	 ****************************************************************************/
	public async generateTwoFactorAuthSecret(userId: ObjectId): Promise<TwoFactorAuthSecretOutput> {
		try {
			const currentUser = await this.userModel.findById(userId, { twoFactorAuthSecret: 1, email: 1 }).exec();
			if (!currentUser) {
				throw new UserNotFoundException({
					message: 'User not found',
					userId,
				});
			}
			if (currentUser.settings.security?.twoFactorAuthEnabled) {
				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message: '2FA is already enabled. To generate a new secret, please disable 2FA first.',
				});
			}

			if (currentUser.twoFactorAuthSecret && currentUser.twoFactorAuthSecret.length > 0) {
				// If secret already exists (e.g., from a previous setup attempt), return it instead of generating a new one
				console.log('This is working now');
				const qrCodeUrl = await Qrcode.toDataURL(
					speakeasy.otpauthURL({
						secret: currentUser.twoFactorAuthSecret,
						label: `HireHub (${currentUser.email})`,
						issuer: 'HireHub',
					}),
				);
				return {
					secret: currentUser.twoFactorAuthSecret,
					qrCodeUrl,
				};
			}
			console.log('OR This is working now');

			// generate secret for validation
			const secret = speakeasy.generateSecret({
				name: `HireHub (${currentUser.email})`,
				issuer: 'HireHub',
			});

			// Generate QR code data URL for the authenticator app
			const qrCodeUrl = await Qrcode.toDataURL(secret?.otpauth_url || '');

			const existingUserWithSameSecret = await this.userModel.findOne({ twoFactorAuthSecret: secret.base32 }).exec();
			if (existingUserWithSameSecret) {
				// regenerate
				return this.generateTwoFactorAuthSecret(userId);
			}
			const updatedUser = await this.userModel
				.findByIdAndUpdate(
					userId,
					{ twoFactorAuthSecret: secret.base32 },
					{ new: true, select: { twoFactorAuthSecret: 1 } },
				)
				.exec();

			return {
				secret: updatedUser?.twoFactorAuthSecret || '',
				qrCodeUrl,
			};
		} catch (error) {
			if (error instanceof UserNotFoundException) {
				throw error;
			}
			throw new InternalServerException(
				'Failed to generate 2FA secret. Please try again later.',
				{
					error: "Hey you've got an error in generateTwoFactorAuthSecret method",
				},
				500,
			);
		}
	}

	/****************************************************************************
	 *  [SERVICE] FETCH 2FA SECRET
	 *  * Fetches the existing 2FA secret for the user, if it exists, along with the QR code URL for the authenticator app
	 *  @param userId - ID of the user
	 ****************************************************************************/
	public async fetchTwoFactorAuthSecret(userId: ObjectId): Promise<TwoFactorAuthSecretOutput> {
		try {
			const user = await this.userModel.findById(userId, { twoFactorAuthSecret: 1 }).exec();
			if (!user) {
				throw new UserNotFoundException({
					message: 'User not found',
					userId,
				});
			}
			const qrCodeUrl = user.twoFactorAuthSecret
				? await Qrcode.toDataURL(
						speakeasy.otpauthURL({
							secret: user.twoFactorAuthSecret,
							label: `HireHub (${user.email})`,
							issuer: 'HireHub',
						}),
					)
				: null;
			return {
				secret: user.twoFactorAuthSecret || '',
				qrCodeUrl: qrCodeUrl || '',
			};
		} catch (error) {
			if (error instanceof UserNotFoundException) {
				throw error;
			}
			throw new InternalServerException(
				'Failed to fetch 2FA secret. Please try again later.',
				{
					error: "Hey you've got an error in fetchTwoFactorAuthSecret method",
				},
				500,
			);
		}
	}

	/*****************************************************************************
	 *  [SERVICE] ENABLE 2FA
	 *  Enables 2FA for the user after verifying the provided secret
	 *  @param userId - ID of the user
	 *  @param code - The 6-digit code from the authenticator app
	 ****************************************************************************/
	public async enableTwoFactorAuth(userId: ObjectId, code: string): Promise<MessageResponse> {
		try {
			const user = await this.userModel
				.findById(userId, {
					twoFactorAuthSecret: 1,
					'settings.security.twoFactorAuthEnabled': 1,
				})
				.exec();

			if (!user) {
				throw new UserNotFoundException({
					message: 'User not found',
					userId,
				});
			}

			if (!user.twoFactorAuthSecret) {
				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message: '2FA secret not found. Please generate a secret first.',
				});
			}

			// Verify Code
			const verified = speakeasy.totp.verify({
				secret: user.twoFactorAuthSecret,
				encoding: 'base32',
				token: code,
			});

			if (!verified) {
				return {
					success: false,
					message: 'Invalid 2FA code. Please try again.',
				};
			}

			if (!user.settings.security) {
				user.settings.security = { twoFactorAuthEnabled: false };
			}
			user.settings.security.twoFactorAuthEnabled = true;
			user.settings.security.twoFactorAuthMethod = TwoFactorAuthMethod.APP;
			user.settings.security.twoFactorAuthEnabledAt = new Date();
			await user.save();

			return {
				success: verified,
				message: 'Two-factor authentication enabled successfully',
			};
		} catch (error) {
			if (error instanceof UserNotFoundException || error instanceof DatabaseException) {
				throw error;
			}
			throw new InternalServerException(
				'Failed to enable 2FA. Please try again later.',
				{
					error: "Hey you've got an error in enableTwoFactorAuth method",
					details: error.message,
				},
				500,
			);
		}
	}

	/****************************************************************************
	 *  [SERVICE] SEND 2FA CODE TO EMAIL
	 *  Generates a 2FA code, saves it to the user's profile, and sends it to their email
	 *  @param userId - ID of the user
	 ****************************************************************************/
	public async sendEmailTwoFactorAuthCode(userId: ObjectId): Promise<MessageResponse> {
		try {
			const user = await this.userModel
				.findById(userId, {
					email: 1,
					twoFactorVerificationCode: 1,
					twoFactorVerificationCodeExpires: 1,
					settings: 1,
					twoFactorAuthSecret: 1,
				})
				.exec();

			if (!user) {
				throw new UserNotFoundException({
					message: 'User not found',
					userId,
				});
			}

			if (!user.email) {
				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message: 'Email not found. Please set an email first.',
				});
			}

			const verificationCode = this.generateVerificationCode();
			const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

			user.twoFactorVerificationCode = verificationCode;
			user.twoFactorVerificationCodeExpires = verificationCodeExpires;
			await user.save();

			// Send 2FA code to email
			await this.emailService.sendTwoFactorAuthCodeEmail(user.email, verificationCode);

			return {
				success: true,
				message: 'A verification code has been sent to your email.',
			};
		} catch (error) {
			if (error instanceof UserNotFoundException || error instanceof DatabaseException) {
				throw error;
			}
			throw new InternalServerException(
				'Failed to send 2FA code to email. Please try again later.',
				{
					error: "Hey you've got an error in sendEmailTwoFactorAuthCode method",
					details: error.message,
				},
				500,
			);
		}
	}

	/****************************************************************************
	 *  [SERVICE] ENABLE EMAIL-BASED 2FA
	 *  Enables email-based 2FA after verifying the code sent to the user's email
	 *  @param userId - ID of the user
	 *  @param code - The 6-digit code sent to the user's email
	 ****************************************************************************/
	public async enableEmailTwoFactorAuth(userId: ObjectId, code: string): Promise<MessageResponse> {
		try {
			const user = await this.userModel
				.findById(userId, {
					email: 1,
					settings: 1,
					twoFactorVerificationCode: 1,
					twoFactorVerificationCodeExpires: 1,
				})
				.exec();

			if (!user) {
				throw new UserNotFoundException({
					message: 'User not found',
					userId,
				});
			}

			if (!user.email) {
				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message: 'Email not found. Please set an email first.',
				});
			}

			if (!user.settings.security) {
				user.settings.security = { twoFactorAuthEnabled: false };
			}
			if (user.settings.security.twoFactorAuthEnabled) {
				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message: '2FA is already enabled. Please disable 2FA first to enable email-based 2FA.',
				});
			}
			if (user.settings.security.twoFactorAuthMethod === TwoFactorAuthMethod.APP) {
				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message:
						'Authenticator app-based 2FA is already enabled. To enable email-based 2FA, please disable the authenticator app 2FA first.',
				});
			}
			if (!user.twoFactorVerificationCode || !user.twoFactorVerificationCodeExpires) {
				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message: 'No verification code found. Please request a new code and verify it to enable email-based 2FA.',
				});
			}
			if (new Date() > user.twoFactorVerificationCodeExpires) {
				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message: 'Verification code has expired. Please request a new code and verify it to enable email-based 2FA.',
				});
			}

			// Verify Code
			if (user.twoFactorVerificationCode !== code) {
				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message: 'Invalid verification code. Please try again.',
				});
			}

			user.settings.security.twoFactorAuthEnabled = true;
			user.settings.security.twoFactorAuthMethod = TwoFactorAuthMethod.EMAIL;
			user.settings.security.twoFactorAuthEnabledAt = new Date();
			user.twoFactorVerificationCode = '';
			await user.save();

			return {
				success: true,
				message: 'Email-based two-factor authentication enabled successfully.',
			};
		} catch (error) {
			if (error instanceof UserNotFoundException || error instanceof DatabaseException) {
				throw error;
			}
			throw new InternalServerException(
				'Failed to enable email-based 2FA. Please try again later.',
				{
					error: "Hey you've got an error in enableEmailTwoFactorAuth method",
					details: error.message,
				},
				500,
			);
		}
	}

	/****************************************************************************
	 *  [SERVICE] GENERATE BACKUP CODES
	 *  Generates backup codes for 2FA and saves them to the user's profile
	 *  @param userId - ID of the user
	 ****************************************************************************/
	public async generateTwoFactorAuthBackupCodes(userId: ObjectId): Promise<string[]> {
		try {
			const user = await this.userModel
				.findById(userId, {
					settings: 1,
					twoFactorAuthSecret: 1,
					email: 1,
					twoFactorBackupCodes: 1,
				})
				.exec();

			if (!user) {
				throw new UserNotFoundException({
					message: 'User not found',
					userId,
				});
			}

			if (!user.settings.security?.twoFactorAuthEnabled) {
				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message: '2FA is not enabled. Please enable 2FA first to generate backup codes.',
				});
			}

			if (user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0) {
				throw new DatabaseException(ErrorCode.VALIDATION_ERROR, {
					message:
						'Backup codes have already been generated. For security reasons, you can only generate backup codes once. Please use the existing backup codes or disable and re-enable 2FA to generate new codes.',
				});
			}

			// Generate 10 backup codes
			const backupCodes: string[] = [];
			for (let i = 0; i < 6; i++) {
				const code = await this.generateRandomString(7);
				backupCodes.push(code);
			}

			user.twoFactorBackupCodes = backupCodes;
			user.settings.security.backupCodesGenerated = true;
			user.settings.security.backupCodesGeneratedAt = new Date();
			await user.save();

			// Optionally, you can send the backup codes to the user's email or return them in the response
			// For security reasons, it's generally better to show them only once and encourage the user to save them securely

			return backupCodes;
		} catch (error) {
			if (error instanceof UserNotFoundException || error instanceof DatabaseException) {
				throw error;
			}
			throw new InternalServerException(
				'Failed to generate 2FA backup codes. Please try again later.',
				{
					error: "Hey you've got an error in generateTwoFactorAuthBackupCodes method",
					details: error.message,
				},
				500,
			);
		}
	}

	/****************************************************************************
	 *  [SERVICE] DISABLE 2FA
	 *  * Disables 2FA for the user and clears related settings and secrets
	 *  @param userId - ID of the user
	 ****************************************************************************/
	public async disableTwoFactorAuth(userId: ObjectId, code: string): Promise<MessageResponse> {
		try {
			const user = await this.userModel
				.findById(userId, {
					settings: 1,
					twoFactorAuthSecret: 1,
					twoFactorVerificationCode: 1,
					twoFactorVerificationCodeExpires: 1,
					email: 1,
					twoFactorBackupCodes: 1,
				})
				.exec();

			if (!user) {
				throw new UserNotFoundException({
					message: 'User not found',
					userId,
				});
			}

			if (!user.settings.security?.twoFactorAuthEnabled) {
				return {
					success: true,
					message: '2FA is already disabled.',
				};
			}

			if (user.settings.security.twoFactorAuthMethod === TwoFactorAuthMethod.APP) {
				if (!user.twoFactorAuthSecret || user.twoFactorAuthSecret.length === 0) {
					return {
						success: false,
						message: '2FA secret not found. Cannot verify code to disable 2FA.',
					};
				}
				// Verify Code for authenticator app-based 2FA
				const verified = speakeasy.totp.verify({
					secret: user.twoFactorAuthSecret,
					encoding: 'base32',
					token: code,
				});
				if (!verified) {
					return {
						success: false,
						message: 'Invalid 2FA code. Please try again.',
					};
				}
			} else if (user.settings.security.twoFactorAuthMethod === TwoFactorAuthMethod.EMAIL) {
				// Verify Code for email-based 2FA
				if (user.twoFactorVerificationCode !== code || new Date() > user.twoFactorVerificationCodeExpires!) {
					return {
						success: false,
						message: 'Invalid or expired verification code. Please try again.',
					};
				}
			} else {
				return {
					success: false,
					message: 'Invalid 2FA method. Cannot disable 2FA.',
				};
			}

			await this.userModel
				.findByIdAndUpdate(userId, {
					$set: {
						'settings.security.twoFactorAuthEnabled': false,
						'settings.security.twoFactorAuthMethod': TwoFactorAuthMethod.NONE,
						'settings.security.backupCodesGenerated': false,
						twoFactorAuthSecret: '',
						twoFactorBackupCodes: [],
						twoFactorVerificationCode: '',
						twoFactorVerificationCodeExpires: null,
					},
					$unset: {
						'settings.security.twoFactorAuthEnabledAt': '',
						'settings.security.backupCodesGeneratedAt': '',
					},
				})
				.exec();

			return {
				success: true,
				message: 'Two-factor authentication disabled successfully.',
			};
		} catch (error) {
			if (error instanceof UserNotFoundException) {
				throw error;
			}
			throw new InternalServerException(
				'Failed to disable 2FA. Please try again later.',
				{
					error: "Hey you've got an error in disableTwoFactorAuth method",
					details: error.message,
				},
				500,
			);
		}
	}

	// =============================================================================================
	// --------------------------------- // [ADMIN] // ---------------------------------------------
	// =============================================================================================

	// =============================================================================================
	// --------------------------------- // [RECRUITERS] // ----------------------------------------
	// =============================================================================================

	// =============================================================================================
	// --------------------------------- // [PRIVATE(HELPERS)] // ----------------------------------
	// =============================================================================================

	/*****************************************************************************
	 *  [SERVICE] GENERATE RANDOM STRING
	 *  Generates a random string of specified length
	 *  @param length - Length of the random string
	 ****************************************************************************/

	private async generateRandomString(length: number): Promise<string> {
		var result = '';
		var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		var charactersLength = characters.length;
		for (var i = 0; i < length; i++) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return result;
	}

	/*****************************************************************************
	 *  [SERVICE] HELPER FUNCTION. -ADD FIELD TO UPDATE OBJECTS ONLY IF IT HAS VALUE
	 * *  Prevents overwriting existing data with undefined/null/empty values during updates
	 * @param updateObj - The object being used for updates (e.g., in findByIdAndUpdate)
	 * @param key - The key to add to the update object
	 * @param value - The value to add if it's valid
	 * @param transform - Optional function to transform the value before adding (e.g., trimming strings)
	 ****************************************************************************/
	private addFieldIfPresent(updateObj: any, key: string, value: any, trannsform?: (val: any) => any): void {
		if (value !== undefined && value !== null) {
			if (typeof value === 'string') {
				const trimmed = value.trim();
				if (trimmed !== '') {
					updateObj[key] = trannsform ? trannsform(trimmed) : trimmed;
				}
			} else {
				updateObj[key] = trannsform ? trannsform(value) : value;
			}
		}
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

	/**
	 * * Generate a 6-digit verification code
	 * @param @returns 6-digit numeric string
	 */
	private generateVerificationCode(): string {
		return Math.floor(100000 + Math.random() * 900000).toString();
	}

	/*****************************************************************************
	 * [HELPER]: STRIP USER OBJECT TO ESSENTIAL FIELDS ONLY
	 * Reduces payload size by removing large nested objects (settings, profile, qualifications)
	 * Client only needs basic user info and tokens - other data can be fetched when needed
	 *****************************************************************************/
	private stripToEssentialFields(userObject: User): Partial<User> {
		return {
			_id: userObject._id,
			email: userObject.email,
			firstName: userObject.firstName,
			lastName: userObject.lastName,
			role: userObject.role,
			activeCompanyId: userObject.activeCompanyId,
			emailVerified: userObject.emailVerified,
			status: userObject.status,
			accessToken: userObject.accessToken,
			refreshToken: userObject.refreshToken,
			// Include minimal profile info
			profile: {
				avatarUrl: userObject.profile?.avatarUrl || '',
			},
			createdAt: userObject.createdAt,
			updatedAt: userObject.updatedAt,
		};
	}
}
