import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import CompanySchema from '../../schemas/Company.model';
import { CompanyResolver } from './company.resolver';
import { CompanyService } from './company.service';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import UserSchema from '../../schemas/User.model';
import { JobSchema } from '../../schemas/Job.model';

/**
 * CompanyModule - Module for company-related functionality
 *
 * This module provides:
 * - Company schema and model registration
 * - GraphQL resolver for company queries and mutations
 * - Service layer with business logic and MongoDB aggregations
 *
 * @exports CompanyService for use in other modules (e.g., JobModule)
 */
@Module({
	imports: [
		// Register the Company schema with Mongoose
		MongooseModule.forFeature([
			{ name: 'Company', schema: CompanySchema },
			{ name: 'User', schema: UserSchema },
			{ name: 'Job', schema: JobSchema },
		]),
		AuthModule, // Import AuthModule for authentication and authorization
		UserModule, // Import UserModule to access user-related functionality
	],
	providers: [
		CompanyResolver, // GraphQL resolver
		CompanyService, // Business logic service
	],
	exports: [
		CompanyService, // Export for use in other modules
	],
})
export class CompanyModule {}
