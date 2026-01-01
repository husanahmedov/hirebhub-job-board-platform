import { Module } from '@nestjs/common';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import UserModel from '../../schemas/User.model';
import { AuthModule } from '../auth/auth.module';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'User', schema: UserModel }]), AuthModule],
	providers: [UserResolver, UserService],
})
export class UserModule {}
