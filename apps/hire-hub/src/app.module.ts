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
import { DatabaseModule } from './database/database.module';

import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { AppResolver } from './app.resolver';

@Module({
	imports: [
		ConfigModule.forRoot(),
		GraphQLModule.forRoot({
			autoSchemaFile: true,
			driver: ApolloDriver,
			uploads: false,
			playground: true,
		}),
		UserModule,
		CompanyModule,
		JobModule,
		ApplicationModule,
		NotificationModule,
		BookmarkModule,
		ResumeModule,
		CompanyReviewModule,
		DatabaseModule,
	],
	controllers: [AppController],
	providers: [AppService, AppResolver],
})
export class AppModule {}
