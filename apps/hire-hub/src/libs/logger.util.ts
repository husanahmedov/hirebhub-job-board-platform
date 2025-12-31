import chalk from 'chalk';

/**
 * LoggerUtil - A utility class for beautiful, structured console logging
 *
 * This class provides consistent, color-coded logging throughout the application.
 * All methods are static and can be used without instantiation.
 *
 * @example
 * ```typescript
 * LoggerUtil.success('Database connected successfully');
 * LoggerUtil.error('Connection failed', new Error('Connection timeout'));
 * LoggerUtil.info('Server', `Running on port ${port}`);
 * ```
 */
export class LoggerUtil {
	/**
	 * Get current timestamp in a formatted string
	 * @returns Formatted timestamp string
	 * @private
	 */
	private static getTimestamp(): string {
		return new Date().toISOString();
	}

	/**
	 * Log a success message in green
	 * @param message - The main message to log
	 * @param details - Optional additional details
	 *
	 * @example
	 * ```typescript
	 * LoggerUtil.success('Application Started', 'Port: 3000');
	 * ```
	 */
	public static success(message: string, details?: string): void {
		const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
		const label = chalk.bgGreen.black.bold(' SUCCESS ');
		const msg = chalk.green.bold(message);
		const det = details ? chalk.green(` → ${details}`) : '';

		console.log(`${timestamp} ${label} ${msg}${det}`);
	}

	/**
	 * Log an error message in red
	 * @param message - The error message to log
	 * @param error - Optional error object or additional details
	 *
	 * @example
	 * ```typescript
	 * LoggerUtil.error('Database Connection Failed', error);
	 * ```
	 */
	public static error(message: string, error?: Error | string | Record<string, any>): void {
		const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
		const label = chalk.bgRed.white.bold(' ERROR ');
		const msg = chalk.red.bold(message);

		console.log(`${timestamp} ${label} ${msg}`);

		if (error) {
			if (error instanceof Error) {
				console.log(chalk.red(`  ↳ ${error.message}`));
				if (error.stack) {
					console.log(chalk.gray(error.stack.split('\n').slice(1).join('\n')));
				}
			} else {
				console.log(chalk.red(`  ↳ ${error}`));
			}
		}
	}

	/**
	 * Log a warning message in yellow
	 * @param message - The warning message to log
	 * @param details - Optional additional details
	 *
	 * @example
	 * ```typescript
	 * LoggerUtil.warn('Deprecated API used', 'Please use the new endpoint');
	 * ```
	 */
	public static warn(message: string, details?: string): void {
		const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
		const label = chalk.bgYellow.black.bold(' WARNING ');
		const msg = chalk.yellow.bold(message);
		const det = details ? chalk.yellow(` → ${details}`) : '';

		console.log(`${timestamp} ${label} ${msg}${det}`);
	}

	/**
	 * Log an informational message in blue
	 * @param title - The title/category of the information
	 * @param message - The information message
	 *
	 * @example
	 * ```typescript
	 * LoggerUtil.info('Environment', process.env.NODE_ENV);
	 * ```
	 */
	public static info(title: string, message: string | Record<string, any>): void {
		const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
		const label = chalk.bgBlue.white.bold(' INFO ');
		const titleStr = chalk.cyan.bold(title);
		const msg = chalk.cyan(message);

		console.log(`${timestamp} ${label} ${titleStr}: ${msg}`);
	}

	/**
	 * Log a debug message in magenta (only in development)
	 * @param message - The debug message
	 * @param data - Optional data to log
	 *
	 * @example
	 * ```typescript
	 * LoggerUtil.debug('User payload received', userData);
	 * ```
	 */
	public static debug(message: string, data?: unknown): void {
		if (process.env.NODE_ENV === 'production') return;

		const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
		const label = chalk.bgMagenta.white.bold(' DEBUG ');
		const msg = chalk.magenta(message);

		console.log(`${timestamp} ${label} ${msg}`);

		if (data !== undefined) {
			console.log(chalk.magenta(JSON.stringify(data, null, 2)));
		}
	}

	/**
	 * Print a beautiful banner for application startup
	 * @param appName - The name of the application
	 * @param version - The application version
	 * @param port - The port the application is running on
	 * @param environment - The current environment (development/production)
	 *
	 * @example
	 * ```typescript
	 * LoggerUtil.printBanner('HireHub API', '1.0.0', 3000, 'development');
	 * ```
	 */
	public static printBanner(appName: string, version: string, port: number, environment: string): void {
		const banner = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║  ${chalk.cyan.bold(appName.padEnd(55))}  ║
║  ${chalk.gray(`Version: ${version}`.padEnd(55))}  ║
║                                                           ║
║  ${chalk.green('Status:')} ${chalk.green.bold('Running ✓').padEnd(47)}  ║
║  ${chalk.blue('Port:')} ${chalk.blue.bold(String(port)).padEnd(49)}  ║
║  ${chalk.yellow('Environment:')} ${chalk.yellow.bold(environment).padEnd(42)}  ║
║  ${chalk.magenta('URL:')} ${chalk.magenta.bold(`http://localhost:${port}`).padEnd(48)}  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`;
		console.log(banner);
	}

	/**
	 * Print a separator line
	 * Used to visually separate different sections in logs
	 */
	public static separator(): void {
		console.log(chalk.gray('─'.repeat(60)));
	}

	/**
	 * Log a database connection message with custom styling
	 * @param dbType - Type of database (MongoDB, PostgreSQL, etc.)
	 * @param environment - Environment the database is connected to
	 * @param success - Whether the connection was successful
	 *
	 * @example
	 * ```typescript
	 * LoggerUtil.database('MongoDB', 'development', true);
	 * ```
	 */
	public static database(dbType: string, environment: string, success: boolean): void {
		if (success) {
			const icon = chalk.green('✓');
			const msg = chalk.green.bold(`${dbType} Connected`);
			const env = chalk.gray(`(${environment})`);
			console.log(`${icon} ${msg} ${env}`);
		} else {
			const icon = chalk.red('✗');
			const msg = chalk.red.bold(`${dbType} Connection Failed`);
			const env = chalk.gray(`(${environment})`);
			console.log(`${icon} ${msg} ${env}`);
		}
	}

	/**
	 * Log module initialization
	 * @param moduleName - Name of the module being initialized
	 *
	 * @example
	 * ```typescript
	 * LoggerUtil.module('UserModule');
	 * ```
	 */
	public static module(moduleName: string): void {
		const icon = chalk.blue('◆');
		const msg = chalk.blue(`${moduleName} initialized`);
		console.log(`${icon} ${msg}`);
	}
}
