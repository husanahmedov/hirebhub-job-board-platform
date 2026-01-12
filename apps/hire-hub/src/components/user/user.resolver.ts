import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { UserService } from './user.service';
import { RegisterUserInput, User, RefreshTokenInput, AuthResponse } from '../../libs/dto/user';
import { LoginUserInput, PublicUser, UpdateProfileInput, UpdateUserInput, UserRole } from '../../libs';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthUser } from '../auth/decorators/authUser.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { AuthService } from '../auth/auth.service';
import type { ObjectId } from 'mongoose';
import { Step3RegisterInput, Step4RegisterInput, Step5RegisterInput } from '../../libs/';

@Resolver()
export class UserResolver {
	constructor(
		private readonly userService: UserService,
		private readonly authService: AuthService,
	) {}

	/**
	 * Register a new user account
	 *
	 * This mutation creates a new user account in the system with the provided registration data.
	 * It validates all input fields, checks for existing users, hashes the password, and returns
	 * the newly created user with an access token for immediate authentication.
	 *
	 * @param input - The registration data including email, password, name, role, and profile
	 * @returns Promise<User> - The newly created user object with access token
	 *
	 * @throws {UserAlreadyExistsException} - If email is already registered
	 * @throws {DatabaseException} - If validation fails or database error occurs
	 * @throws {UserCreationFailedException} - If user creation fails for any other reason
	 *
	 * @example
	 * mutation {
	 *   register(input: {
	 *     email: "john@example.com"
	 *     passwordHash: "SecurePass123!"
	 *     firstName: "John"
	 *     lastName: "Doe"
	 *     role: JOB_SEEKER
	 *   }) {
	 *     _id
	 *     email
	 *     fullName
	 *     accessToken
	 *   }
	 * }
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
	 * Create user profile after registration
	 *
	 * This mutation allows a newly registered user to complete their profile by adding
	 * detailed information such as location, skills, bio, headline, and other profile data.
	 * This is typically called after initial registration to enhance the user's profile.
	 *
	 * @param input - Complete profile data including location, skills, bio, etc.
	 * @param userId - The authenticated user's ID (automatically extracted from JWT token)
	 * @returns Promise<PublicUser> - The user object with updated profile data
	 *
	 * @throws {UserNotFoundException} - If the authenticated user doesn't exist in the system
	 * @throws {InternalServerErrorException} - If profile creation fails for unexpected reasons
	 *
	 * @security
	 * - Requires authentication (AuthGuard)
	 * - Users can only create their own profile
	 * - Profile data is validated against DTO constraints
	 *
	 * @example
	 * mutation {
	 *   createProfileAfterRegistration(input: {
	 *     profile: {
	 *       headline: "Full Stack Developer"
	 *       bio: "Passionate about building scalable applications"
	 *       location: {
	 *         city: "San Francisco"
	 *         region: "CA"
	 *         country: USA
	 *       }
	 *       skills: ["JavaScript", "TypeScript", "React", "Node.js"]
	 *       avatarUrl: "https://example.com/avatar.jpg"
	 *     }
	 *   }) {
	 *     _id
	 *     email
	 *     fullName
	 *     profile {
	 *       headline
	 *       bio
	 *       location { city region country }
	 *       skills
	 *     }
	 *   }
	 * }
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
	 * Add or update education entries in user profile
	 *
	 * This mutation allows authenticated users to add new education entries to their profile.
	 * It supports both step 3 registration flow and standalone education management. The system
	 * automatically detects and prevents duplicate education entries by comparing school names.
	 *
	 * Duplicate Detection:
	 * - Compares new education entries with existing ones
	 * - Checks for similar school names (case-insensitive, normalized)
	 * - Only adds education entries that don't already exist
	 * - Allows multiple entries from different schools
	 *
	 * @param input - Education data containing array of education entries
	 * @param userId - The authenticated user's ID (automatically extracted from JWT token)
	 * @returns Promise<PublicUser> - The user object with updated education entries
	 *
	 * @throws {UserNotFoundException} - If the authenticated user doesn't exist in the system
	 * @throws {InternalServerErrorException} - If education update fails for unexpected reasons
	 *
	 * @security
	 * - Requires authentication (AuthGuard)
	 * - Users can only update their own education
	 * - Education data is validated against DTO constraints
	 *
	 * @features
	 * - Adds new education entries without removing existing ones
	 * - Prevents duplicate schools from being added
	 * - Validates all education fields (school, degree, years, etc.)
	 * - Supports multiple education entries in a single request
	 *
	 * @example
	 * mutation {
	 *   step3RegistrationProcess(input: {
	 *     education: [
	 *       {
	 *         school: "Stanford University"
	 *         degree: "Master of Science"
	 *         fieldOfStudy: "Computer Science"
	 *         startYear: 2020
	 *         endYear: 2022
	 *       },
	 *       {
	 *         school: "MIT"
	 *         degree: "Bachelor of Science"
	 *         fieldOfStudy: "Software Engineering"
	 *         startYear: 2016
	 *         endYear: 2020
	 *       }
	 *     ]
	 *   }) {
	 *     _id
	 *     email
	 *     fullName
	 *     profile {
	 *       education {
	 *         school
	 *         degree
	 *         fieldOfStudy
	 *         startYear
	 *         endYear
	 *       }
	 *     }
	 *   }
	 * }
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
	 * Add or update experience entries in user profile
	 *
	 * This mutation allows authenticated users to add new work experience entries to their profile.
	 * It supports both step 4 registration flow and standalone experience management. The system
	 * automatically detects and prevents duplicate experience entries by comparing company names.
	 *
	 * Duplicate Detection:
	 * - Compares new experience entries with existing ones
	 * - Checks for similar company names (case-insensitive, normalized)
	 * - Only adds experience entries that don't already exist
	 * - Allows multiple entries from different companies
	 *
	 * @param input - Experience data containing array of work experience entries
	 * @param userId - The authenticated user's ID (automatically extracted from JWT token)
	 * @returns Promise<PublicUser> - The user object with updated experience entries
	 *
	 * @throws {UserNotFoundException} - If the authenticated user doesn't exist in the system
	 * @throws {InternalServerErrorException} - If experience update fails for unexpected reasons
	 *
	 * @security
	 * - Requires authentication (AuthGuard)
	 * - Users can only update their own experience
	 * - Experience data is validated against DTO constraints
	 *
	 * @features
	 * - Adds new experience entries without removing existing ones
	 * - Prevents duplicate companies from being added
	 * - Validates all experience fields (company, title, dates, etc.)
	 * - Supports multiple experience entries in a single request
	 *
	 * @example
	 * mutation {
	 *   step4RegistrationProcess(input: {
	 *     experience: [
	 *       {
	 *         company: "Google"
	 *         title: "Senior Software Engineer"
	 *         location: "Mountain View, CA"
	 *         startDate: 2020
	 *         endDate: 2023
	 *         description: "Led development of core infrastructure..."
	 *       },
	 *       {
	 *         company: "Facebook"
	 *         title: "Software Engineer"
	 *         location: "Menlo Park, CA"
	 *         startDate: 2018
	 *         endDate: 2020
	 *         description: "Built scalable backend services..."
	 *       }
	 *     ]
	 *   }) {
	 *     _id
	 *     email
	 *     fullName
	 *     profile {
	 *       experience {
	 *         company
	 *         title
	 *         location
	 *         startDate
	 *         endDate
	 *         description
	 *       }
	 *     }
	 *   }
	 * }
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
	 * Add or update qualification entries in user profile
	 *
	 * This mutation allows authenticated users to add new professional certifications, awards,
	 * and qualifications to their profile. It supports both step 5 registration flow and standalone
	 * qualification management. The system automatically detects and prevents duplicate qualification
	 * entries by comparing profcertorawards names.
	 *
	 * Duplicate Detection:
	 * - Compares new qualification entries with existing ones
	 * - Checks for similar profcertorawards names (case-insensitive, normalized)
	 * - Only adds qualification entries that don't already exist
	 * - Prevents the same certification from being added multiple times
	 *
	 * @param input - Qualifications data containing array of professional certifications and awards
	 * @param userId - The authenticated user's ID (automatically extracted from JWT token)
	 * @returns Promise<PublicUser> - The user object with updated qualifications entries
	 *
	 * @throws {UserNotFoundException} - If the authenticated user doesn't exist in the system
	 * @throws {InternalServerErrorException} - If qualifications update fails for unexpected reasons
	 *
	 * @security
	 * - Requires authentication (AuthGuard)
	 * - Restricted to CANDIDATE role only
	 * - Users can only update their own qualifications
	 * - Qualification data is validated against DTO constraints
	 *
	 * @features
	 * - Adds new qualification entries without removing existing ones
	 * - Prevents duplicate profcertorawards from being added
	 * - Validates all qualification fields (name, organization, summary, year)
	 * - Supports multiple qualification entries in a single request
	 * - Year validation ensures realistic date ranges (1900 - current year + 1)
	 *
	 * @example
	 * mutation {
	 *   step5RegistrationProcess(input: {
	 *     qualifications: [
	 *       {
	 *         profcertorawards: "AWS Certified Solutions Architect"
	 *         conferOrganization: "Amazon Web Services"
	 *         summary: "Professional level certification for AWS cloud architecture"
	 *         year: 2023
	 *       },
	 *       {
	 *         profcertorawards: "Google Cloud Professional Developer"
	 *         conferOrganization: "Google Cloud"
	 *         summary: "Advanced certification for GCP development"
	 *         year: 2024
	 *       }
	 *     ]
	 *   }) {
	 *     _id
	 *     email
	 *     fullName
	 *     qualifications {
	 *       profcertorawards
	 *       conferOrganization
	 *       summary
	 *       year
	 *     }
	 *   }
	 * }
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

	/**
	 * Authenticate and login an existing user
	 *
	 * This mutation authenticates a user with their email and password credentials.
	 * It validates the credentials, checks account status, and returns the user
	 * object with a fresh access token for authenticated API requests.
	 *
	 * @param input - Login credentials containing email and password
	 * @returns Promise<User> - The authenticated user object with access token
	 *
	 * @throws {UserNotFoundException} - If no user exists with the provided email
	 * @throws {InvalidCredentialsException} - If password doesn't match
	 * @throws {UserDeactivatedException} - If user account has been deactivated
	 * @throws {UserSuspendedException} - If user account has been suspended
	 * @throws {InternalServerErrorException} - If login fails for unexpected reasons
	 *
	 * @example
	 * mutation {
	 *   login(input: {
	 *     email: "john@example.com"
	 *     passwordHash: "SecurePass123!"
	 *   }) {
	 *     _id
	 *     email
	 *     fullName
	 *     role
	 *     status
	 *     accessToken
	 *     createdAt
	 *   }
	 * }
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
	 *
	 * This mutation allows a logged-in user to update their own profile information.
	 * Users can modify their basic details like name, email, and profile data, but cannot
	 * change privileged fields such as role or account status (admin-only operations).
	 *
	 * @param input - The update data with optional fields to modify
	 * @param userId - The authenticated user's ID (automatically extracted from JWT token)
	 * @returns Promise<PublicUser> - The updated user object without sensitive data
	 *
	 * @throws {UserNotFoundException} - If the authenticated user doesn't exist
	 * @throws {UserAlreadyExistsException} - If the new email is already taken
	 * @throws {DatabaseException} - If validation fails or database error occurs
	 * @throws {InternalServerErrorException} - If update fails for unexpected reasons
	 *
	 * @security
	 * - Requires authentication (AuthGuard)
	 * - Requires CANDIDATE role (RolesGuard)
	 * - Users can only update their own profile
	 * - Cannot modify role, status, or other privileged fields
	 *
	 * @example
	 * mutation {
	 *   updateUserByUser(input: {
	 *     firstName: "Jane"
	 *     lastName: "Smith"
	 *     email: "jane.smith@example.com"
	 *     profile: {
	 *       location: { city: "San Francisco", region: "CA", country: USA }
	 *     }
	 *   }) {
	 *     _id
	 *     email
	 *     fullName
	 *     status
	 *     profile {
	 *       location {
	 *         city
	 *         region
	 *         country
	 *       }
	 *     }
	 *     updatedAt
	 *   }
	 * }
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
	 * Update any user's profile data by admin (privileged operation)
	 *
	 * This mutation allows an administrator to update any user's profile information,
	 * including privileged fields like account status and role. This is useful for
	 * account management, moderation, and administrative tasks.
	 *
	 * @param targetUserId - The ID of the user to update
	 * @param input - The update data with optional fields to modify
	 * @returns Promise<PublicUser> - The updated user object without sensitive data
	 *
	 * @throws {UserNotFoundException} - If the target user doesn't exist
	 * @throws {UserAlreadyExistsException} - If the new email is already taken
	 * @throws {DatabaseException} - If validation fails or database error occurs
	 * @throws {InternalServerErrorException} - If update fails for unexpected reasons
	 *
	 * @security
	 * - Requires authentication (AuthGuard)
	 * - Requires ADMIN role (RolesGuard)
	 * - Admin can update any user including privileged fields
	 * - Cannot modify password (requires separate endpoint)
	 *
	 * @example
	 * mutation {
	 *   updateUserByAdmin(
	 *     targetUserId: "507f1f77bcf86cd799439011"
	 *     input: {
	 *       status: SUSPENDED
	 *       email: "updated@example.com"
	 *     }
	 *   ) {
	 *     _id
	 *     email
	 *     fullName
	 *     status
	 *     role
	 *     updatedAt
	 *   }
	 * }
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
	 * Refresh access token using refresh token
	 *
	 * This mutation allows clients to obtain a new access token without re-authenticating.
	 * It validates the refresh token and generates a new access token if valid.
	 *
	 * @param input - Contains the refresh token
	 * @returns Promise<AuthResponse> - New access token with expiration times
	 *
	 * @throws {InvalidCredentialsException} - If refresh token is invalid or expired
	 * @throws {UserNotFoundException} - If user no longer exists
	 * @throws {UserDeactivatedException} - If user account is deactivated
	 * @throws {UserSuspendedException} - If user account is suspended
	 *
	 * @example
	 * mutation {
	 *   refreshToken(input: { refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }) {
	 *     user {
	 *       _id
	 *       email
	 *       fullName
	 *     }
	 *     accessToken
	 *     refreshToken
	 *     accessTokenExpiresAt
	 *     refreshTokenExpiresAt
	 *   }
	 * }
	 */
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
}
