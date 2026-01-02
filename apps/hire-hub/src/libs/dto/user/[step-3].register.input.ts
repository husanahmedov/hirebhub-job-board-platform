import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { EducationInput, ExperienceInput } from '../../index';

@InputType()
export class Step3RegisterInput {
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => EducationInput)
	@Field(() => [EducationInput], { nullable: true })
	education?: EducationInput[];
}
