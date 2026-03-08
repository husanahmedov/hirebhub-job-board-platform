import { Module } from '@nestjs/common';
import { HirehubBatchController } from './hirehub-batch.controller';
import { HirehubBatchService } from './hirehub-batch.service';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import SessionSchema from 'apps/hire-hub/src/schemas/Session.model';
import UserSchema from 'apps/hire-hub/src/schemas/User.model';
import CompanySchema from 'apps/hire-hub/src/schemas/Company.model';
import { JobSchema } from 'apps/hire-hub/src/schemas/Job.model';
import { SocketModule } from 'apps/hire-hub/src/socket/socket.module';

@Module({
	imports: [
		DatabaseModule,
		ConfigModule.forRoot(),
		ScheduleModule.forRoot(),
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
			{
				name: 'Companies',
				schema: CompanySchema,
				collection: 'companies',
			},
			{
				name: 'Jobs',
				schema: JobSchema,
				collection: 'jobs',
			},
		]),
		SocketModule
	],
	controllers: [HirehubBatchController],
	providers: [HirehubBatchService],
	exports: [HirehubBatchService],
})
export class HirehubBatchModule {}
