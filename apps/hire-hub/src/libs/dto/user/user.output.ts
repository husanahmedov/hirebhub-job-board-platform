import { Field, ObjectType, ID } from '@nestjs/graphql';
import { UserStatus, UserRole } from '../../enums/user.enum';

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

	@Field(() => Date)
	startYear: Date;

	@Field(() => Date, { nullable: true })
	endYear?: Date;
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

	@Field(() => Date)
	startDate: Date;

	@Field(() => Date, { nullable: true })
	endDate?: Date;

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

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	@Field(() => Date, { nullable: true })
	deletedAt?: Date;
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
	role: UserRole;

	@Field(() => Profile, { nullable: true })
	profile?: Profile;

	@Field(() => Date)
	createdAt: Date;
}

/**
 * User authentication response
 */
@ObjectType()
export class AuthResponse {
	@Field(() => User)
	user: User;

	@Field(() => String)
	accessToken: string;

	@Field(() => String)
	refreshToken: string;
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
