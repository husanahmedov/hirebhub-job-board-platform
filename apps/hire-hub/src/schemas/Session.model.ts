import { Document, Schema as MongooseSchema } from 'mongoose';

const SessionSchema = new MongooseSchema(
	{
		userId: {
			type: MongooseSchema.Types.ObjectId,
			ref: 'User',
			index: true,
		},

		token: {
			type: String,
		},

		deviceName: {
			type: String,
		},

		deviceType: {
			type: String,
		},

		browser: {
			type: String,
		},

		os: {
			type: String,
		},

		ipAddress: {
			type: String,
			required: true,
		},
		location: {
			type: String,
		},

		lastUsedAt: {
			type: Date,
			required: true,
		},

		expiresAt: {
			type: Date,
		},

		isActive: {
			type: Boolean,
		},
		isCurrent: {
			type: Boolean,
		},
	},
	{
		timestamps: true,
		collection: 'sessions',
	},
);

export default SessionSchema;
