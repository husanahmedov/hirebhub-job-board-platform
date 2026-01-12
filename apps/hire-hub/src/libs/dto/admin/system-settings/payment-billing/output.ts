import { ObjectType, Field } from '@nestjs/graphql';

/**
 * Output type for payment and billing settings
 * Returns the current values of all payment and billing settings
 */
@ObjectType()
export class PaymentBillingSettings {
	@Field(() => Boolean, { description: 'Indicates if automatic billing is enabled' })
	autoBillingEnabled: boolean;

	@Field(() => Number, { description: 'Number of days in the billing cycle' })
	billingCycleInDays: number;

	@Field(() => Boolean, { description: 'Indicates if billing reminders are sent' })
	sendBillingReminders: boolean;

	@Field(() => Number, { description: 'Frequency of billing reminders in days' })
	reminderFrequencyInDays: number;

	@Field(() => Boolean, { description: 'Indicates if Stripe payment gateway is enabled' })
	stripeEnabled: boolean;

	@Field(() => Number, { description: 'Job post limit for the free plan' })
	freePlanJobPostLimit: number;

	@Field(() => Number, { description: 'Job post limit for the pro plan' })
	proPlanJobPostLimit: number;

	@Field(() => Number, { description: 'Job post limit for the enterprise plan' })
	enterprisePlanJobPostLimit: number;

	@Field(() => Boolean, { description: 'Indicates if a subscription is required for access' })
	subscriptionRequired: boolean;
}
