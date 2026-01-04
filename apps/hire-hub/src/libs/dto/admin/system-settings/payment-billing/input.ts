import { InputType, Field } from '@nestjs/graphql';
import { IsBoolean, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class PaymentBillingSettingsInput {
    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true })
    autoBillingEnabled?: boolean;

    @IsOptional()
    @IsNumber()
    @Field(() => Number, { nullable: true })
    billingCycleInDays?: number;

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true })
    sendBillingReminders?: boolean;

    @IsOptional()
    @IsNumber()
    @Field(() => Number, { nullable: true })
    reminderFrequencyInDays?: number;

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true })
    stripeEnabled?: boolean;

    @IsOptional()
    @IsNumber()
    @Field(() => Number, { nullable: true })
    freePlanJobPostLimit?: number;

    @IsOptional()
    @IsNumber()
    @Field(() => Number, { nullable: true })
    proPlanJobPostLimit?: number;

    @IsOptional()
    @IsNumber()
    @Field(() => Number, { nullable: true })
    enterprisePlanJobPostLimit?: number;

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true })
    subscriptionRequired?: boolean;
}
