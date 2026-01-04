import { ObjectType, Field } from '@nestjs/graphql';

/**
 * Output type for platform settings
 * Returns the current values of all platform settings
 */
@ObjectType()
export class PlatformSettings {
	@Field(() => Boolean, { description: 'Indicates if the platform is in maintenance mode' })
	maintenanceMode?: boolean;

	@Field(() => Boolean, { description: 'Indicates if user registration is enabled' })
	registrationEnabled?: boolean;

	@Field(() => Boolean, { description: 'Indicates if email verification is required for new users' })
	requireEmailVerification: boolean;

	@Field(() => [String], { description: 'List of allowed email domains for user registration' })
	allowedEmailDomains?: string[];

	@Field(() => Boolean, { description: 'Indicates if guest browsing is allowed' })
	allowGuestBrowsing: boolean;

	@Field(() => String, { description: 'Name of the platform' })
	platformName?: string;

	@Field(() => String, { description: 'URL of the platform' })
	platformUrl?: string;

	@Field(() => String, { description: 'Support email address for the platform' })
	supportEmail?: string;
}