import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'apps/hire-hub/src/libs';
import { SessionOutput } from 'apps/hire-hub/src/libs/dto/sessions/output';
import { Model } from 'mongoose';

@Injectable()
export class HirehubBatchService {
	constructor(
		@InjectModel('Sessions') private sessionModel: Model<SessionOutput>,
		@InjectModel('Users') private userModel: Model<User>,
	) {}

	// =============================================================================================
	// --------------------------------- // [USER] // ----------------------------------------------
	// =============================================================================================

	public async batchRemoveExpiredSessions(): Promise<void> {
		const now = new Date();
		await this.sessionModel.deleteMany({ expiresAt: { $lt: now } });
	}

	getHello(): string {
		return 'Hello World!';
	}
}
