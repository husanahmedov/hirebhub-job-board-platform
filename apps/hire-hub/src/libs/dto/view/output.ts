import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ViewGroup } from '../../';
import type { ObjectId } from 'mongodb';

@ObjectType()
export class View {
	@Field(() => String, { nullable: true })
	_id: string;

	@Field(() => ViewGroup)
	viewGroup: ViewGroup;

	@Field(() => String)
	viewRefId: ObjectId;

	@Field(() => String)
	userId: ObjectId;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}
