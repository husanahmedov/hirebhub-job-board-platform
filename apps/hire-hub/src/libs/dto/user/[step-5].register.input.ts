import { InputType, Field, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
	IsArray,
	IsNumber,
	IsOptional,
	IsString,
	ValidateNested,
	IsNotEmpty,
	MaxLength,
	Min,
	Max,
	Validate,
	ValidatorConstraint,
	ValidatorConstraintInterface,
	ValidationArguments,
} from 'class-validator';

/**
 * Custom validator to check for duplicate profcertorawards names
 */
@ValidatorConstraint({ name: 'UniqueQualifications', async: false })
export class UniqueQualificationsConstraint implements ValidatorConstraintInterface {
	validate(qualifications: QualificationsInput[], args: ValidationArguments) {
		if (!qualifications || !Array.isArray(qualifications)) {
			return true;
		}

		const names = qualifications.map((q) => q.profcertorawards?.toLowerCase().trim());
		const uniqueNames = new Set(names);

		return names.length === uniqueNames.size;
	}

	defaultMessage(args: ValidationArguments) {
		return 'Duplicate qualification names are not allowed. Each profcertorawards must be unique.';
	}
}

@InputType()
export class Step5RegisterInput {
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => QualificationsInput)
	@Validate(UniqueQualificationsConstraint)
	@Field(() => [QualificationsInput], { nullable: true })
	qualifications?: QualificationsInput[];
}

@InputType()
export class QualificationsInput {
	@IsNotEmpty()
	@IsString()
	@MaxLength(200)
	@Field(() => String, { description: 'Name of professional certification or award' })
	profcertorawards: string;

	@IsNotEmpty()
	@IsString()
	@MaxLength(200)
	@Field(() => String, { description: 'Organization that conferred the qualification' })
	conferOrganization: string;

	@IsNotEmpty()
	@IsString()
	@MaxLength(1000)
	@Field(() => String, { description: 'Summary of the qualification' })
	summary: string;

	@IsNotEmpty()
	@IsNumber()
	@Min(1900)
	@Max(new Date().getFullYear() + 1)
	@Field(() => Int, { description: 'Year the qualification was awarded' })
	year: number;
}
