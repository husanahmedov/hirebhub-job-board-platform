import { Field, ObjectType, ID, GraphQLISODateTime, Int } from '@nestjs/graphql';
import { UserStatus, UserRole } from '../../enums';
import { IsOptional } from 'class-validator';

/**
 * Qualifications output
 */
@ObjectType()
export class QualificationsOutput {
	@Field(() => String, { description: 'List of user qualifications' })
	profcertorawards: string;

	@Field(() => String, { description: 'Organization that conferred the qualification' })
	conferOrganization: string;

	@Field(() => String, { description: 'Summary of the qualification' })
	summary: string;

	@Field(() => Int, { description: 'Year the qualification was awarded' })
	year: number;
}

/**
 * Geographic coordinates output
 */
@ObjectType()
export class GeoCoordinates {
	@Field(() => String, { nullable: true })
	type?: string;

	@Field(() => [Number], { nullable: true, description: '[longitude, latitude]' })
	coordinates?: number[];
}

/**
 * Location output
 */
@ObjectType()
export class Location {
	@Field(() => String, { nullable: true })
	city?: string;

	@Field(() => String, { nullable: true })
	region?: string;

	@Field(() => String, { nullable: true })
	country?: string;

	@Field(() => GeoCoordinates, { nullable: true })
	geo?: GeoCoordinates;
}

/**
 * Education entry output
 */
@ObjectType()
export class Education {
	@Field(() => String)
	school: string;

	@Field(() => String)
	degree: string;

	@Field(() => String, { nullable: true })
	fieldOfStudy?: string;

	@Field(() => Number)
	startYear: number;

	@Field(() => Number, { nullable: true })
	endYear?: number;
}

/**
 * Work experience entry output
 */
@ObjectType()
export class Experience {
	@Field(() => String)
	company: string;

	@Field(() => String)
	title: string;

	@Field(() => String, { nullable: true })
	location?: string;

	@Field(() => Number)
	startDate: number;

	@Field(() => Number, { nullable: true })
	endDate?: number;

	@Field(() => String, { nullable: true })
	description?: string;
}

/**
 * User profile output
 */
@ObjectType()
export class Profile {
	@Field(() => String, { nullable: true })
	headline?: string;

	@Field(() => String, { nullable: true })
	bio?: string;

	@Field(() => Location, { nullable: false })
	location: Location;

	@Field(() => [String], { nullable: true })
	skills?: string[];

	@Field(() => [Education], { nullable: true })
	education?: Education[];

	@Field(() => [Experience], { nullable: true })
	experience?: Experience[];

	@Field(() => [String], { nullable: true })
	socialLinks?: string[];

	@Field(() => String, { nullable: true })
	resumeId?: string;

	@Field(() => String, { nullable: true })
	avatarUrl?: string;

	@Field(() => String, { nullable: true })
	bannerUrl?: string;
}

/**
 * OAuth provider output
 */
@ObjectType()
export class OAuthProvider {
	@Field(() => String)
	provider: string;

	@Field(() => String)
	providerId: string;

	@Field(() => String, { nullable: true })
	profileUrl?: string;
}

/**
 * Notification settings output
 */
@ObjectType()
export class NotificationSettings {
	@Field(() => Boolean, { defaultValue: true })
	email: boolean;

	@Field(() => Boolean, { defaultValue: false })
	push: boolean;
}

/**
 * User settings output
 */
@ObjectType()
export class UserSettings {
	@Field(() => String, { defaultValue: 'en' })
	language: string;

	@Field(() => String, { defaultValue: 'UTC' })
	timezone: string;

	@Field(() => NotificationSettings)
	notifications: NotificationSettings;
}

/**
 * Complete user output (excludes sensitive data like password)
 */
@ObjectType()
export class User {
	@Field(() => ID)
	_id: string;

	@Field(() => String)
	email: string;

	@Field(() => Boolean)
	emailVerified: boolean;

	@Field(() => String)
	firstName: string;

	@Field(() => String)
	lastName: string;

	@Field(() => String)
	role: UserRole;

	@Field(() => String)
	status: UserStatus;

	@Field(() => Profile, { nullable: true })
	profile?: Profile;

	@Field(() => [OAuthProvider], { nullable: true })
	oauthProviders?: OAuthProvider[];

	@Field(() => UserSettings)
	settings: UserSettings;

	@Field(() => GraphQLISODateTime)
	createdAt: Date;

	@Field(() => GraphQLISODateTime)
	updatedAt: Date;

	@Field(() => GraphQLISODateTime, { nullable: true })
	deletedAt?: Date;

	@IsOptional()
	@Field(() => String)
	accessToken?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	refreshToken?: string;

	// Virtual methods
	@IsOptional()
	@Field(() => String)
	fullName?: string;

	@IsOptional()
	@Field(() => String)
	passwordHash?: string;

	@IsOptional()
	@Field(() => Boolean)
	hasCompleteRegistration?: boolean;

	@IsOptional()
	@Field(() => [QualificationsOutput], { nullable: true })
	qualifications?: QualificationsOutput[];
}

/**
 * Public user output (for public profiles, limited data)
 */
@ObjectType()
export class PublicUser {
	@Field(() => ID)
	_id: string;

	@Field(() => String)
	firstName: string;

	@Field(() => String)
	lastName: string;

	@Field(() => String)
	fullName: string;

	@Field(() => String)
	email?: string;

	@Field(() => String)
	role: UserRole;

	@IsOptional()
	@Field(() => [QualificationsOutput], { nullable: true })
	qualifications?: QualificationsOutput[];

	@Field(() => Profile, { nullable: true })
	profile?: Profile;

	@IsOptional()
	@Field(() => String, { nullable: true })
	message?: string;

	@IsOptional()
	@Field(() => GraphQLISODateTime, { nullable: true })
	createdAt?: Date;
}

/**
 * User authentication response with tokens
 */
@ObjectType()
export class AuthResponse {
	@Field(() => User, { description: 'Authenticated user object with full profile data' })
	user: User;

	@Field(() => String, { description: 'JWT access token for authenticated API requests (short-lived)' })
	accessToken: string;

	@Field(() => String, { description: 'JWT refresh token for obtaining new access tokens (long-lived)' })
	refreshToken: string;

	@Field(() => GraphQLISODateTime, { nullable: true, description: 'Timestamp when the access token expires' })
	accessTokenExpiresAt?: Date;

	@Field(() => GraphQLISODateTime, { nullable: true, description: 'Timestamp when the refresh token expires' })
	refreshTokenExpiresAt?: Date;
}

/**
 * User list response with pagination
 */
@ObjectType()
export class UserListResponse {
	@Field(() => [User])
	users: User[];

	@Field(() => Number)
	total: number;

	@Field(() => Number)
	page: number;

	@Field(() => Number)
	limit: number;

	@Field(() => Number)
	totalPages: number;
}

/**
 * Success response for operations
 */
@ObjectType()
export class UserOperationResponse {
	@Field(() => Boolean)
	success: boolean;

	@Field(() => String)
	message: string;

	@Field(() => User, { nullable: true })
	user?: User;
}
