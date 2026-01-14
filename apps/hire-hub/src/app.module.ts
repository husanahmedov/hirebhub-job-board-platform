import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
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

import { GraphQLModule, DateScalarMode } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { AppResolver } from './app.resolver';
import { ErrorCode, ErrorMessage, IGraphqlError } from './libs';
import { GraphQLExceptionFilter } from './libs/filters/graphql-exception.filter';
import { AuthModule } from './components/auth/auth.module';
import { AdminModule } from './components/admin/admin.module';
import { UploaderModule } from './components/uploader/uploader.module';
import { HealthModule } from './components/health/health.module';
import { ViewModule } from './components/view/view.module';

@Module({
	imports: [
		ConfigModule.forRoot(),
		GraphQLModule.forRoot({
			autoSchemaFile: true,
			driver: ApolloDriver,
			uploads: false,
			playground: true,
			dateScalarMode: 'isoDate' as DateScalarMode,
			formatError: (error: IGraphqlError) => {
				const code = error?.extensions?.code || 'INTERNAL_SERVER_ERROR';
				const timestamp = error?.extensions?.timestamp || new Date().toISOString();
				let message = error?.extensions?.originalError?.message || error?.message || 'An unexpected error occurred';
				const statusCode = error?.extensions?.originalError?.statusCode || 500;
				let details = error?.extensions?.details;

				// Handle GraphQL schema validation errors (BAD_USER_INPUT)
				if (code === 'BAD_USER_INPUT') {
					// Parse field name from error message
					const fieldMatch = message.match(/Field "(\w+)" of required type/);
					const field = fieldMatch ? fieldMatch[1] : message;

					console.log('Detected BAD_USER_INPUT for field:', message);
					message = ErrorMessage[ErrorCode.BAD_USER_INPUT];
					details = {
						field: `${field} is missing or invalid`,
					};
				} else {
				}
				return {
					code: code === 'BAD_USER_INPUT' ? ErrorCode.BAD_USER_INPUT : code,
					message,
					timestamp,
					statusCode,
					...(details && { details }),
				};
			},
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
		AuthModule,
		AdminModule,
		UploaderModule,
		HealthModule,
		ViewModule,
	],
	controllers: [AppController],
	providers: [
		AppService,
		AppResolver,
		{
			provide: APP_FILTER,
			useClass: GraphQLExceptionFilter,
		},
	],
})
export class AppModule {}
