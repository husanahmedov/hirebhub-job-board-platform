import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { MongooseModule } from '@nestjs/mongoose';

import SessionSchema from '../../schemas/Session.model';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'Session', schema: SessionSchema }])],
	providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
