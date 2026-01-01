import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { EnvUtil } from '../../libs/';

@Module({
	imports: [
		JwtModule.register({
			secret: `${EnvUtil.getJwtSecret()}`,
			signOptions: { expiresIn: '30d' },
		}),
	],
	providers: [AuthService],
	exports: [AuthService],
})
export class AuthModule {}
