import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggerUtil } from 'apps/hire-hub/src/libs';

/**
 * Bootstrap function - Initializes and starts the HireHub application
 *
 * This function performs the following operations:
 * 1. Creates a NestJS application instance
 * 2. Configures global middleware and pipes
 * 3. Sets up graceful shutdown handlers
 * 4. Starts the HTTP server
 * 5. Displays a beautiful startup banner
 *
 * @async
 * @throws {Error} If the application fails to start
 */
async function bootstrap(): Promise<void> {
	try {
		// Application configuration
		const PORT = parseInt(process.env.HIREHUB_PORT ?? '3000', 10);
		const ENVIRONMENT = process.env.NODE_ENV ?? 'development';
		const APP_NAME = 'HireHub API';
		const VERSION = '1.0.0';

		LoggerUtil.info('Bootstrap', 'Starting application initialization...');

		// Create NestJS application instance with custom logger disabled
		// We use our custom LoggerUtil for consistent logging
		const app = await NestFactory.create(AppModule, {
			logger: ['error', 'warn'], // Only log errors and warnings from NestJS
		});

		// Enable CORS for cross-origin requests
		app.enableCors({
			origin: process.env.CORS_ORIGIN ?? '*',
			credentials: true,
		});
		LoggerUtil.module('CORS');

		// Global validation pipe for automatic DTO validation
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true, // Strip properties that don't have decorators
				forbidNonWhitelisted: false, // Don't throw on extra properties
				transform: true, // Automatically transform payloads to DTO instances
				disableErrorMessages: false, // Show detailed validation errors
				validationError: {
					target: false, // Don't expose the target object in errors
					value: false, // Don't expose the value in errors
				},
			}),
		);
		LoggerUtil.module('Global Validation Pipe');

		// Set up graceful shutdown handlers
		setupGracefulShutdown(app);

		// Start the application
		await app.listen(PORT);

		// Display beautiful startup banner
		LoggerUtil.separator();
		LoggerUtil.printBanner(APP_NAME, VERSION, PORT, ENVIRONMENT);
		LoggerUtil.success('Application started successfully');
		LoggerUtil.separator();
	} catch (error) {
		LoggerUtil.error('Failed to start application', error as Error);
		process.exit(1);
	}
}

/**
 * Set up graceful shutdown handlers for the application
 * Ensures proper cleanup on SIGTERM and SIGINT signals
 *
 * @param app - The NestJS application instance
 */
function setupGracefulShutdown(app: any): void {
	const gracefulShutdown = async (signal: string) => {
		LoggerUtil.warn(`${signal} signal received`, 'Starting graceful shutdown...');

		try {
			await app.close();
			LoggerUtil.success('Application closed successfully');
			process.exit(0);
		} catch (error) {
			LoggerUtil.error('Error during shutdown', error as Error);
			process.exit(1);
		}
	};

	// Handle termination signals
	process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
	process.on('SIGINT', () => gracefulShutdown('SIGINT'));

	// Handle uncaught exceptions
	process.on('uncaughtException', (error: Error) => {
		LoggerUtil.error('Uncaught Exception', error);
		process.exit(1);
	});

	// Handle unhandled promise rejections
	process.on('unhandledRejection', (reason: any) => {
		LoggerUtil.error('Unhandled Rejection', reason);
		process.exit(1);
	});

	LoggerUtil.module('Graceful Shutdown Handlers');
}

// Start the application
bootstrap();
