import { Field, ObjectType, ID, GraphQLISODateTime, Int } from '@nestjs/graphql';
import { UserStatus, UserRole, WhoCanSeeMyProfile, WhoCanSeeProfilePhoto, WhoCanSendMeMessages } from '../../enums';
import { IsOptional } from 'class-validator';
import { SessionOutput } from '../sessions/output';

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

	@Field(() => String, { nullable: true })
	website?: string;
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

/****************************
 * *USER SETTINGS OUTPUT
 **************************/
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

/*****************************************************************************
 * * COMPLETE USER OUTPUT (EXCLUDES SENSITIVE DATA LIKE PASSWORD)
 ****************************************************************************/

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

	@IsOptional()
	recoveryEmail?: string;

	@Field(() => String, { nullable: true })
	profileCompleteness?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	publicProfileUsername?: string;

	@IsOptional()
	@Field(() => SessionOutput, { nullable: true })
	session?: SessionOutput;
}

/**
 * * PUBLIC USER OUTPUT (FOR PUBLIC PROFILES)
 */
@ObjectType()
export class PublicUser {
	@Field(() => ID, { nullable: true })
	_id?: string;

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

	@Field(() => String, { nullable: true })
	role?: UserRole;

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

	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	emailVerified?: boolean;
}

/**
 * *USER AUTHENTICATION RESPONSE WITH TOKENS
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
 * *USER LIST RESPONSE WITH PAGINATION
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
 * *SUCCESS RESPONSE FOR OPERATIONS
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
 * *COMPANY LOCATION NESTED TYPE
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
 * *COMPANY LIST ITEM OUTPUT
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

/****************************
 * *USER SETTINGS OUTPUT
 **************************/
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

// ============================================
// *USER ACCOUNT SETTINGS OUTPUT
// ============================================
@ObjectType()
export class UserAccountSettingsOutput {
	@Field(() => String, { description: 'User First Name' })
	firstName: string;

	@Field(() => String, { description: 'User Last Name' })
	lastName: string;

	@Field(() => String, { description: 'User Last Name', nullable: true })
	professionalHeadline?: string;

	@Field(() => String, { description: 'User Avatar Url', nullable: true })
	avatarUrl?: string;

	@Field(() => String, { description: 'Public Profile Url', nullable: true })
	publicProfileUrl?: string;

	@Field(() => String, { description: 'User Country', nullable: true })
	country?: string;

	@Field(() => String, { description: 'User Website', nullable: true })
	website?: string;

	@Field(() => String, { description: 'User Email' })
	email: string;

	@Field(() => String, { description: 'User Contact Email', nullable: true })
	contactEmail?: string;

	@Field(() => String, { description: 'User Recovery Email', nullable: true })
	recoveryEmail?: string;

	@Field(() => Boolean, { description: 'Email Verified Status' })
	emailVerified: boolean;

	@Field(() => String, { description: 'User Phone Number', nullable: true })
	phoneNumber?: string;

	@Field(() => [SessionOutput], { description: 'List of active user sessions' })
	sessions?: SessionOutput[];
}

/**
 * [DTO] - USER PRIVACY SETTINGS OUTPUT
 * */

@ObjectType()
export class UserPrivacySettingsOutput {
	// PROFILE VISIBILITY SETTINGS
	@Field(() => WhoCanSeeMyProfile, { description: 'Who can see my profile settings' })
	whoCanSeeMyProfile: WhoCanSeeMyProfile;

	@Field(() => WhoCanSeeProfilePhoto, { description: 'Who can see my profile photo settings' })
	whoCanSeeProfilePhoto: WhoCanSeeProfilePhoto;

	@Field(() => WhoCanSendMeMessages, { description: 'Who can send me messages settings' })
	whoCanSendMeMessages: WhoCanSendMeMessages;

	// INFORMATION VISIBILITY SETTINGS
	@Field(() => Boolean, { description: 'Allow others to see your email on your profile' })
	showEmailAddress: boolean;

	@Field(() => Boolean, { description: 'Allow others to see your phone number on your profile' })
	showPhoneNumber: boolean;

	@Field(() => Boolean, { description: 'Allow others to see your location on your profile' })
	showLocation: boolean;

	// DISCOVERABILITY SETTINGS
	@Field(() => Boolean, { description: 'Allow others to discover you by your email' })
	discoverableByEmail: boolean;

	@Field(() => Boolean, { description: 'Allow others to discover you by your phone number' })
	discoverableByPhoneNumber: boolean;

	@Field(() => Boolean, { description: 'Show your activity status to others' })
	showActivityStatus: boolean;

	@Field(() => Boolean, { description: 'Show your last seen status to others' })
	showLastSeenStatus: boolean;
}

/***********************************************************
 * [DTO] - USER SETTINGS OUTPUT
 **********************************************************/
@ObjectType()
export class UserSettingsOutput {
	@Field(() => UserAccountSettingsOutput, { description: 'User account settings' })
	account?: UserAccountSettingsOutput;

	@Field(() => UserPrivacySettingsOutput, { description: 'User privacy settings' })
	privacy?: UserPrivacySettingsOutput;
}

/***********************************************************
 * [DTO] - FILE UPLOAD OUTPUT
 **********************************************************/
@ObjectType()
export class FileUploadOutput {
	@Field(() => String, { description: 'URL of the uploaded file' })
	url: string;

	@Field(() => String, { description: 'Filename of the uploaded file' })
	filename: string;

	@Field(() => Number, { description: 'Size of the uploaded file in bytes', nullable: true })
	size?: number;

	@Field(() => String, { description: 'MIME type of the uploaded file', nullable: true })
	mimeType?: string;
}
