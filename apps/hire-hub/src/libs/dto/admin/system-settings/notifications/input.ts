import { InputType, Field } from '@nestjs/graphql';
import { IsBoolean, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class EmailNotificationsSettingsInput {
    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true })
    emailNotificationsEnabled?: boolean;

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true })
    smsNotificationsEnabled?: boolean;

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true })
    newJobAlertEnabled?: boolean;

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true })
    applicationStatusEmailEnabled?: boolean;

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true })
    weeklyDigestEnabled?: boolean;
}
