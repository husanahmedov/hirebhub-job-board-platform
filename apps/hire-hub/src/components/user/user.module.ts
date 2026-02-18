import { Module } from '@nestjs/common';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import UserModel from '../../schemas/User.model';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { ViewModule } from '../view/view.module';
import { SessionsModule } from '../sessions/sessions.module';
import { ThrottleGuard } from '../auth/guards/throttle.guard';
import { Reflector } from '@nestjs/core';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'User', schema: UserModel }]),
		AuthModule,
		NotificationModule,
		ViewModule,
		SessionsModule,
	],
	providers: [UserResolver, UserService, ThrottleGuard, Reflector],
	exports: [UserService], // Export UserService for use in other modules
})
export class UserModule {}
