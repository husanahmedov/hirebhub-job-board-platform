import { NestFactory } from '@nestjs/core';
import { HirehubBatchModule } from './hirehub-batch.module';
import { LoggerUtil } from 'apps/hire-hub/src/libs';

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

		LoggerUtil.info('Bootstrap', 'Starting batch service initialization...');

		// Create NestJS application instance
		const app = await NestFactory.create(HirehubBatchModule, {
			logger: ['error', 'warn'],
		});

		// Set up graceful shutdown handlers
		setupGracefulShutdown(app);

		// Start the application
		await app.listen(PORT);

		// Display beautiful startup banner
		LoggerUtil.separator();
		LoggerUtil.printBanner(APP_NAME, VERSION, PORT, ENVIRONMENT);
		LoggerUtil.success('Batch service started successfully');
		LoggerUtil.info('Service', 'Ready to process background jobs');
		LoggerUtil.separator();
	} catch (error) {
		LoggerUtil.error('Failed to start batch service', error as Error);
		process.exit(1);
	}
}

/**
 * Set up graceful shutdown handlers for the batch service
 * Ensures all running jobs are completed before shutdown
 *
 * @param app - The NestJS application instance
 */
function setupGracefulShutdown(app: any): void {
	const gracefulShutdown = async (signal: string) => {
		LoggerUtil.warn(`${signal} signal received`, 'Finishing active jobs...');

		try {
			await app.close();
			LoggerUtil.success('Batch service closed successfully');
			process.exit(0);
		} catch (error) {
			LoggerUtil.error('Error during shutdown', error as Error);
			process.exit(1);
		}
	};

	process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
	process.on('SIGINT', () => gracefulShutdown('SIGINT'));

	process.on('uncaughtException', (error: Error) => {
		LoggerUtil.error('Uncaught Exception', error);
		process.exit(1);
	});

	process.on('unhandledRejection', (reason: any) => {
		LoggerUtil.error('Unhandled Rejection', reason);
		process.exit(1);
	});

	LoggerUtil.module('Graceful Shutdown Handlers');
}

// Start the batch service
bootstrap();
