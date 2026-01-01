import { ObjectId } from 'bson';

export const shapeIntoMongoObjectId = (targetId: any) => {
	return typeof targetId === 'string' ? new ObjectId(targetId) : targetId;
};
