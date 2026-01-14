import { Schema } from 'mongoose';
import { ViewGroup } from '../libs';

const ViewSchema = new Schema(
	{
		viewGroup: {
			type: String,
			enum: ViewGroup,
			required: true,
		},

		viewRefId: {
			type: Schema.Types.ObjectId,
			required: true,
		},

		userId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'User',
		},
	},
	{ timestamps: true, collection: 'views' },
);

ViewSchema.index({ userId: 1, viewRefId: 1 }, { unique: true });

export default ViewSchema;
