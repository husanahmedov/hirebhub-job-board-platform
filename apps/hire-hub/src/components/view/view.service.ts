import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { shapeIntoMongoObjectId } from '../../libs/config';
import type { Model, ObjectId } from 'mongoose';
import { InternalServerException, View, ViewInput } from '../../libs';

@Injectable()
export class ViewService {
	constructor(@InjectModel('View') private readonly viewModel: Model<View>) {}
	public async incremenetViewCount(input: ViewInput): Promise<View | null> {
		const { userId, viewRefId } = input;
		let existingView;
		if (userId) {
			existingView = await this.checkViewExists(userId, viewRefId);
			console.log(existingView);
			
		}

		return existingView ? null : this.viewModel.create(input);
	}

	public async checkViewExists(userId: string, viewRefId: string): Promise<boolean> {
		const shapedUserId = shapeIntoMongoObjectId(userId);
		const shapedViewRefId = shapeIntoMongoObjectId(viewRefId);
		try {
			const result = await this.viewModel.findOne({ userId: shapedUserId, viewRefId: shapedViewRefId }).exec();
			return result !== null;
		} catch (error) {
			console.log(`---------Error: ${error} ---------`);
			throw new InternalServerException('Internel View Checking Error Detected');
		}
	}
}
