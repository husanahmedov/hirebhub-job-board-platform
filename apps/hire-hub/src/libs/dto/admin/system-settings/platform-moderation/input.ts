import { InputType, Field } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { isString, IsArray, IsBoolean, IsString, IsOptional, IsEmail, ValidateNested } from 'class-validator';

@InputType()
export class PlatformSettingsInput {
    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true })
    maintenanceMode?: boolean;

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true })
    registrationEnabled?: boolean;

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true })
    requireEmailVerification?: boolean;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Field(() => [String], { nullable: true })
    allowedEmailDomains?: string[];

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true })
    allowGuestBrowsing?: boolean;

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    platformName?: string;

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    platformUrl?: string;

    @IsOptional()
    @IsEmail()
    @Field(() => String, { nullable: true })
    supportEmail?: string;
}
