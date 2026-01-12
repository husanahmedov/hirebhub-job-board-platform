import { forwardRef, Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminService } from './admin.service';
import { AdminResolver } from './admin.resolver';
import { SystemSettingSchema } from '../../schemas/SystemSetting.model';
import { UserModule } from '../user/user.module';
import { seedDefaultSystemSettings } from './admin-settings.seed';
import { AuthModule } from '../auth/auth.module';

@Module({
	imports: [
		forwardRef(() => UserModule),
		MongooseModule.forFeature([{ name: 'SystemSetting', schema: SystemSettingSchema }]),
		AuthModule,
	],
	providers: [AdminService, AdminResolver],
	exports: [AdminService],
})
export class AdminModule implements OnModuleInit {
	constructor(
		@InjectModel('SystemSetting')
		private systemSettingModel: Model<any>,
	) {}

	/**
	 * Initialize default system settings on module startup
	 * This ensures all required settings exist in the database
	 */
	async onModuleInit() {
		try {
			await seedDefaultSystemSettings(this.systemSettingModel);
		} catch (error) {
			console.error('❌ Failed to seed system settings:', error);
		}
	}
}
