import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './components/user/user.module';
import { CompanyModule } from './components/company/company.module';
import { JobModule } from './components/job/job.module';
import { ApplicationModule } from './components/application/application.module';
import { NotificationModule } from './components/notification/notification.module';
import { BookmarkModule } from './components/bookmark/bookmark.module';
import { ResumeModule } from './components/resume/resume.module';
import { CompanyReviewModule } from './components/company-review/company-review.module';

@Module({
	imports: [
		ConfigModule.forRoot(),
		UserModule,
		CompanyModule,
		JobModule,
		ApplicationModule,
		NotificationModule,
		BookmarkModule,
		ResumeModule,
		CompanyReviewModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
