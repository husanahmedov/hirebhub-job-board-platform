import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationResolver } from './application.resolver';
import { ApplicationService } from './application.service';
import ApplicationSchema from '../../schemas/Application.model';
import { JobSchema } from '../../schemas/Job.model';
import UserSchema from '../../schemas/User.model';
import { AuthModule } from '../auth/auth.module';
import { JobModule } from '../job/job.module';
import { CompanyModule } from '../company/company.module';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: 'Application', schema: ApplicationSchema }
		]),
    AuthModule,
    JobModule,
    CompanyModule
	],
	providers: [ApplicationResolver, ApplicationService],
	exports: [ApplicationService],
})
export class ApplicationModule {}
