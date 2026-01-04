import { ObjectType, Field } from '@nestjs/graphql';

/*
 * Output type for email notifications settings
 * Returns the current values of all email notifications settings
 * */
@ObjectType()
export class EmailNotificationsSettings {
	@Field(() => Boolean, { description: 'Indicates if email notifications are enabled' })
	emailNotificationsEnabled: boolean;

	@Field(() => Boolean, { description: 'Indicates if SMS notifications are enabled' })
	smsNotificationsEnabled: boolean;

	@Field(() => Boolean, { description: 'Indicates if new job alert notifications are enabled' })
	newJobAlertEnabled: boolean;

	@Field(() => Boolean, { description: 'Indicates if application status email notifications are enabled' })
	applicationStatusEmailEnabled: boolean;

	@Field(() => Boolean, { description: 'Indicates if weekly digest emails are enabled' })
	weeklyDigestEnabled: boolean;
}
