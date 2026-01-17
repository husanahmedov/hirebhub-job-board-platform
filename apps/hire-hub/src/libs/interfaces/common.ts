import type { ObjectId } from 'mongoose';

export interface StatsModifier {
	id: ObjectId;
	targetKey: string;
	modifier: number;
}
