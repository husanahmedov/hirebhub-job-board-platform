import { Module } from '@nestjs/common';
import { HirehubBatchController } from './hirehub-batch.controller';
import { HirehubBatchService } from './hirehub-batch.service';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import SessionSchema from 'apps/hire-hub/src/schemas/Session.model';
import UserSchema from 'apps/hire-hub/src/schemas/User.model';

@Module({
	imports: [
		DatabaseModule,
		ConfigModule.forRoot(),
		MongooseModule.forFeature([
			{
				name: 'Sessions',
				schema: SessionSchema,
				collection: 'sessions',
			},
			{
				name: 'Users',
				schema: UserSchema,
				collection: 'users',
			},
		]),
	],
	controllers: [HirehubBatchController],
	providers: [HirehubBatchService],
})
export class HirehubBatchModule {}
