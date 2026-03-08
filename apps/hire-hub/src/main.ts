import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { StartupLogger } from './libs/startup-logger.util';
import { EnvUtil } from './libs';
import { StatusInterceptor } from './libs/interceptors/Status.interceptor';
import { TimeoutInterceptor } from './libs/interceptors/Timeout.interceptor';
import { HttpExceptionFilter } from './libs/filters/http-exception.filter';
import { join } from 'path';
import * as express from 'express';
import * as path from 'path';
import { WsAdapter } from '@nestjs/platform-ws';

declare const module: any;

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
		// Clear console and print banner
		console.clear();
		StartupLogger.printBanner();

		// Application configuration
		const PORT = parseInt(process.env.HIREHUB_PORT ?? '3000', 10);
		const ENVIRONMENT = EnvUtil.getEnvironment();
		const GRAPHQL_PATH = '/graphql';
		const DATABASE_URL = process.env.HIREHUB_MONGODB_URI ?? 'mongodb://localhost:27017/hirehub';

		// Create NestJS application instance with custom logger disabled
		const app = await NestFactory.create<NestExpressApplication>(AppModule, {
			logger: ['log', 'error', 'warn', 'verbose'], // Enable log, error and warning levels
		});

		app.useWebSocketAdapter(new WsAdapter(app)); // Enable WebSocket support with the default adapter

		// Configure Handlebars as the view engine
		const viewsPath = join(process.cwd(), 'apps', 'hire-hub', 'views');
		app.setBaseViewsDir(viewsPath);
		app.setViewEngine('hbs');

		// Register Handlebars helpers
		const hbs = require('hbs');
		hbs.registerHelper('eq', function (a: any, b: any) {
			return a === b;
		});

		// Serve static files from uploads directory
		app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
		// Enable CORS for cross-origin requests
		app.enableCors({
			origin: process.env.CORS_ORIGIN ?? '*',
			credentials: true,
		});

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

		// Global Interceptors
		app.useGlobalInterceptors(new TimeoutInterceptor(), new StatusInterceptor());

		// Global Exception Filter
		app.useGlobalFilters(new HttpExceptionFilter());

		// Set up graceful shutdown handlers
		setupGracefulShutdown(app);

		// Start the application
		await app.listen(PORT);

		// Print startup information
		StartupLogger.printStartupInfo({
			port: PORT,
			environment: ENVIRONMENT,
			graphqlPath: GRAPHQL_PATH,
			databaseUrl: DATABASE_URL,
		});

		StartupLogger.printSuccessMessage('Application is ready to accept requests! 🚀');

		// Print status interceptor header
		StatusInterceptor.printHeader();
	} catch (error) {
		console.error('\n❌ Failed to start application:', error);
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
		console.log(`${signal} signal received. Starting graceful shutdown...`);

		try {
			await app.close();
			console.log('Application closed successfully');
			process.exit(0);
		} catch (error) {
			console.error('Error during shutdown:', error);
			process.exit(1);
		}
	};

	// Handle termination signals
	process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
	process.on('SIGINT', () => gracefulShutdown('SIGINT'));

	// Handle uncaught exceptions
	process.on('uncaughtException', (error: Error) => {
		console.error('Uncaught Exception:', error);
		process.exit(1);
	});

	// Handle unhandled promise rejections (only for critical errors)
	process.on('unhandledRejection', (reason: any) => {
		// Log the error but don't exit for HTTP exceptions (they're handled by filters)
		if (reason?.name === 'NotFoundException' || reason?.status === 404) {
			// Ignore 404 errors (like favicon.ico) - they're handled by exception filters
			return;
		}
		console.error('Unhandled Rejection:', reason);
		process.exit(1);
	});
	// salom
	// Enable hot-reload in development
	if (module.hot) {
		module.hot.accept();
		module.hot.dispose(() => app.close());
	}
}

// Start the application
bootstrap();
