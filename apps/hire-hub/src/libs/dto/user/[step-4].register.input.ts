import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ExperienceInput } from '../../index';

@InputType()
export class Step4RegisterInput {
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ExperienceInput)
	@Field(() => [ExperienceInput], { nullable: true })
	experience?: ExperienceInput[];
}
