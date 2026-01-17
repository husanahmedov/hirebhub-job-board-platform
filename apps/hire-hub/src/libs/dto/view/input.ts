import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';
import { ViewGroup } from '../../';

@InputType()
export class ViewInput {
	@Field(() => String, { nullable: true })
	userId?: string;

	@IsNotEmpty()
	@Field(() => ViewGroup)
	viewGroup: ViewGroup;

	@IsNotEmpty()
	@Field(() => String)
	viewRefId: string;
}
