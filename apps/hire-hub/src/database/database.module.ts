import { Module, OnModuleInit } from '@nestjs/common';
import { InjectConnection, MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { StartupLogger } from '../libs/startup-logger.util';

/**
 * DatabaseModule - Handles MongoDB connection configuration and lifecycle
 *
 * This module sets up the MongoDB connection using Mongoose with environment-based
 * configuration. It automatically selects the appropriate database URI based on
 * the NODE_ENV environment variable.
 *
 * Connection States:
 * - 0: Disconnected
 * - 1: Connected
 * - 2: Connecting
 * - 3: Disconnecting
 *
 * @module DatabaseModule
 * @requires MongooseModule
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [DatabaseModule],
 * })
 * export class AppModule {}
 * ```
 */
@Module({
	imports: [
		MongooseModule.forRootAsync({
			useFactory: () => {
				const environment = process.env.NODE_ENV ?? 'development';
				const uri = environment === 'production' ? process.env.MONGO_PROD : process.env.MONGO_DEV;

				// Validate that the database URI exists
				if (!uri) {
					throw new Error(`Database URI not configured for ${environment} environment`);
				}

				return {
					uri,
					// Connection pool settings for optimal performance
					maxPoolSize: 10,
					minPoolSize: 2,
					// Timeout configurations (in milliseconds)
					serverSelectionTimeoutMS: 5000,
					socketTimeoutMS: 45000,
					// Connection options
					retryWrites: true,
					retryReads: true,
				};
			},
		}),
	],
	exports: [MongooseModule],
})
export class DatabaseModule implements OnModuleInit {
	/**
	 * Creates an instance of DatabaseModule
	 * @param connection - The MongoDB connection instance injected by NestJS
	 */
	constructor(@InjectConnection() private readonly connection: Connection) {}

	/**
	 * Lifecycle hook called after module initialization
	 * Verifies database connection and sets up event listeners
	 */
	async onModuleInit(): Promise<void> {
		this.setupConnectionEventListeners();
		this.logConnectionStatus();
	}

	/**
	 * Set up event listeners for database connection events
	 * Provides real-time feedback on connection state changes
	 * @private
	 */
	private setupConnectionEventListeners(): void {
		this.connection.on('connected', () => {
			StartupLogger.printConnectionStatus('MongoDB', 'connected');
		});

		this.connection.on('disconnected', () => {
			StartupLogger.printConnectionStatus('MongoDB', 'disconnected');
		});

		this.connection.on('error', (error: Error) => {
			console.error('❌ MongoDB connection error:', error.message);
		});

		this.connection.on('reconnected', () => {
			StartupLogger.printConnectionStatus('MongoDB', 'connected');
		});
	}

	/**
	 * Log the current connection status with appropriate styling
	 * @private
	 */
	private logConnectionStatus(): void {
		const isConnected = this.connection.readyState === 1;

		if (isConnected) {
			StartupLogger.printConnectionStatus('MongoDB', 'connected');
		} else {
			StartupLogger.printConnectionStatus('MongoDB', 'connecting');
		}
	}

	/**
	 * Get a human-readable description of the current connection state
	 * @returns Description of the connection state
	 * @private
	 */
	private getReadyStateDescription(): string {
		const states: Record<number, string> = {
			0: 'Disconnected',
			1: 'Connected',
			2: 'Connecting',
			3: 'Disconnecting',
		};

		return states[this.connection.readyState] ?? 'Unknown';
	}

	/**
	 * Get the current connection instance
	 * @returns The MongoDB connection instance
	 * @public
	 */
	public getConnection(): Connection {
		return this.connection;
	}

	/**
	 * Check if the database is connected
	 * @returns True if connected, false otherwise
	 * @public
	 */
	public isConnected(): boolean {
		return this.connection.readyState === 1;
	}
}
