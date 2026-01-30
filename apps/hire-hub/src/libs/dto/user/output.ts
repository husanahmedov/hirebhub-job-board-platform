import { Field, ObjectType, ID, GraphQLISODateTime, Int } from '@nestjs/graphql';
import { UserStatus, UserRole } from '../../enums';
import { IsOptional } from 'class-validator';

// ============================================================
// Nested Output Types (Building Blocks)
// ============================================================

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
 * Contact info output
 */
@ObjectType()
export class ContactInfo {
	@Field(() => String, { nullable: true })
	phone_number?: string;

	@Field(() => String, { nullable: true })
	email?: string;
}

/**
 * Open to opportunities output
 */
@ObjectType()
export class OpenTo {
	@Field(() => Boolean, { nullable: true })
	work?: boolean;

	@Field(() => Boolean, { nullable: true })
	hiring?: boolean;

	@Field(() => Boolean, { nullable: true })
	freelance?: boolean;

	@Field(() => Boolean, { nullable: true })
	mentorship?: boolean;
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
	employmentType?: string;

	@Field(() => Boolean, { nullable: true })
	currentlyWorkingHere?: boolean;

	@Field(() => String, { nullable: true })
	location?: string;

	@Field(() => String, { nullable: true })
	locationType?: string;

	@Field(() => [String], { nullable: true })
	skills?: string[];

	@Field(() => [String], { nullable: true })
	media?: string[];

	@Field(() => Number)
	startDate: number;

	@Field(() => Number, { nullable: true })
	endDate?: number;

	@Field(() => String, { nullable: true })
	description?: string;
}

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
 * User profile output
 */
@ObjectType()
export class Profile {
	@Field(() => String, { nullable: true })
	headline?: string;

	@Field(() => String, { nullable: true })
	bio?: string;

	@Field(() => ContactInfo, { nullable: true })
	contactInfo?: ContactInfo;

	@Field(() => OpenTo, { nullable: true })
	openTo?: OpenTo;

	@Field(() => Location, { nullable: true })
	location?: Location;

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

// ============================================================
// Main Output Types
// ============================================================

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
	@Field(() => String, { nullable: true })
	accessToken?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	refreshToken?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	fullName?: string;

	@Field(() => Int, { nullable: true })
	viewsCount?: number;

	@IsOptional()
	@Field(() => String, { nullable: true })
	passwordHash?: string;

	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	hasCompleteRegistration?: boolean;

	@IsOptional()
	@Field(() => [QualificationsOutput], { nullable: true })
	qualifications?: QualificationsOutput[];

	@IsOptional()
	@Field(() => String, { nullable: true })
	verificationCode?: string;

	@IsOptional()
	@Field(() => GraphQLISODateTime, { nullable: true })
	verificationCodeExpires?: Date;

	@IsOptional()
	@Field(() => String, { nullable: true })
	activeCompanyId?: string;

	@Field(() => String, { nullable: true })
	profileCompleteness?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	publicProfileUsername?: string;
}

/**
 * Public user output (for public profiles, limited data)
 */
@ObjectType()
export class PublicUser {
	@Field(() => ID)
	_id: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	firstName?: string;

	@Field(() => String)
	lastName: string;

	@Field(() => String, { nullable: true })
	fullName?: string;

	@Field(() => String, { nullable: true })
	profileCompleteness?: string;

	@Field(() => String, { nullable: true })
	email?: string;

	@Field(() => String)
	role: UserRole;

	@IsOptional()
	@Field(() => [QualificationsOutput], { nullable: true })
	qualifications?: QualificationsOutput[];

	@Field(() => Profile, { nullable: true })
	profile?: Profile;

	@Field(() => Int, { nullable: true })
	viewsCount?: number;

	@IsOptional()
	@Field(() => String, { nullable: true })
	activeCompanyId?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	publicProfileUsername?: string;

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

/**
 * Company location nested type
 */
@ObjectType()
export class CompanyLocation {
	@Field(() => String, { nullable: true })
	city?: string;

	@Field(() => String, { nullable: true })
	region?: string;

	@Field(() => String, { nullable: true })
	country?: string;
}

/**
 * Company list item output
 */
@ObjectType()
export class CompanyListItem {
	@Field(() => String)
	_id: string;

	@Field(() => String)
	name: string;

	@Field(() => String, { nullable: true })
	logoUrl?: string;

	@Field(() => Boolean)
	verified: boolean;

	@Field(() => String, { description: 'User role in this company: owner or recruiter' })
	role: 'owner' | 'recruiter';

	@Field(() => String, { nullable: true })
	industry?: string;

	@Field(() => String, { nullable: true })
	size?: string;
}

/**
 * Active company output
 */
@ObjectType()
export class ActiveCompanyOutput {
	@Field(() => String)
	_id: string;

	@Field(() => String)
	name: string;

	@Field(() => String, { nullable: true })
	logoUrl?: string;

	@Field(() => Boolean)
	verified: boolean;

	@Field(() => String, { nullable: true })
	industry?: string;

	@Field(() => String, { nullable: true })
	size?: string;

	@Field(() => CompanyLocation, { nullable: true })
	location?: CompanyLocation;
}
