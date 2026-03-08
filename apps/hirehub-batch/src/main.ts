import { NestFactory } from '@nestjs/core';
import { HirehubBatchModule } from './hirehub-batch.module';
import { StartupLogger } from '../src/libs/startup-logger';

/**
 * Bootstrap function - Initializes and starts the HireHub Batch Processing Service
 *
 * This service handles background jobs, scheduled tasks, and batch processing
 * operations for the HireHub platform.
 *
 * @async
 * @throws {Error} If the application fails to start
 */
async function bootstrap(): Promise<void> {
	try {
		// Application configuration
		const PORT = parseInt(process.env.HIREHUB_BATCH_PORT ?? '3001', 10);
		const ENVIRONMENT = process.env.NODE_ENV ?? 'development';
		const APP_NAME = 'HireHub Batch Service';
		const VERSION = '1.0.0';

		StartupLogger.printStartupInfo({
			port: PORT,
			environment: ENVIRONMENT,
			graphqlPath: '/graphql',
			databaseUrl: process.env.MONGO_DEV ?? 'mongodb://localhost:27017/hirehub',
		});

		// Create NestJS application instance
		const app = await NestFactory.create(HirehubBatchModule, {
			logger: ['error', 'warn', 'debug'], // Configure logging levels
		});

		// Start the application
		await app.listen(PORT);
	} catch (error) {
		console.error('Failed to start batch service:', error);
		process.exit(1);
	}
}

// Start the batch service
bootstrap();
