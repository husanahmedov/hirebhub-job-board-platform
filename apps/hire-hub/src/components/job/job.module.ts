import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobSchema } from '../../schemas/Job.model';
import { JobService } from './job.service';
import { JobResolver } from './job.resolver';
import { AuthModule } from '../auth/auth.module';
import { ViewModule } from '../view/view.module';
import { CompanyModule } from '../company/company.module';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'Job', schema: JobSchema }]), AuthModule, ViewModule, CompanyModule],
	providers: [JobService, JobResolver],
	exports: [JobService],
})
export class JobModule {}
