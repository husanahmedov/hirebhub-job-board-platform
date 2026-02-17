import chalk from 'chalk';

export class StartupLogger {
	private static readonly COLORS = {
		primary: chalk.hex('#3B82F6'), // blue
		success: chalk.hex('#10B981'), // green
		warning: chalk.hex('#F59E0B'), // yellow
		info: chalk.hex('#8B5CF6'), // purple
		accent: chalk.hex('#EC4899'), // pink
		muted: chalk.hex('#6B7280'), // gray
	};

	static printBanner(): void {
		const banner = `
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║   ${this.COLORS.accent('██╗  ██╗██╗██████╗ ███████╗    ██╗  ██╗██╗   ██╗██████╗')}             ║
║   ${this.COLORS.accent('██║  ██║██║██╔══██╗██╔════╝    ██║  ██║██║   ██║██╔══██╗')}            ║
║   ${this.COLORS.accent('███████║██║██████╔╝█████╗      ███████║██║   ██║██████╔╝')}            ║
║   ${this.COLORS.accent('██╔══██║██║██╔══██╗██╔══╝      ██╔══██║██║   ██║██╔══██╗')}            ║
║   ${this.COLORS.accent('██║  ██║██║██║  ██║███████╗    ██║  ██║╚██████╔╝██████╔╝')}            ║
║   ${this.COLORS.accent('╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚══════╝    ╚═╝  ╚═╝ ╚═════╝ ╚═════╝')}             ║
║                                                                       ║
║            ${this.COLORS.primary('Your Gateway to Career Opportunities')}                       ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
`;
		console.log(banner);
	}

	static printStartupInfo(config: {
		port: number;
		environment: string;
		graphqlPath: string;
		databaseUrl: string;
	}): void {
		const { port, environment, graphqlPath, databaseUrl } = config;

		console.log('');
		console.log(this.COLORS.primary('┌─────────────────────────────────────────────────────────────┐'));
		console.log(
			this.COLORS.primary('│') +
				'  ' +
				chalk.bold('Application Information') +
				'                              ' +
				this.COLORS.primary('      │'),
		);
		console.log(this.COLORS.primary('├─────────────────────────────────────────────────────────────┤'));

		this.printInfoRow('Environment', environment.toUpperCase(), environment === 'production' ? 'warning' : 'success');
		this.printInfoRow('Port', port.toString(), 'info');
		this.printInfoRow('GraphQL Playground', `http://localhost:${port}${graphqlPath}`, 'primary');
		this.printInfoRow('Database', this.maskDatabaseUrl(databaseUrl), 'muted');

		console.log(this.COLORS.primary('└─────────────────────────────────────────────────────────────┘'));
		console.log('');
	}

	private static printInfoRow(label: string, value: string, colorKey: keyof typeof StartupLogger.COLORS): void {
		const paddedLabel = label.padEnd(20, ' ');
		const coloredValue = this.COLORS[colorKey](value);
		console.log(
			this.COLORS.primary('│') +
				'  ' +
				this.COLORS.muted(paddedLabel) +
				coloredValue.padEnd(39, ' ') +
				this.COLORS.primary('      │'),
		);
	}

	private static maskDatabaseUrl(url: string): string {
		try {
			const urlObj = new URL(url);
			if (urlObj.password) {
				urlObj.password = '****';
			}
			return urlObj.toString();
		} catch {
			return 'Hidden for security';
		}
	}

	static printSuccessMessage(message: string): void {
		console.log('');
		console.log(this.COLORS.success('✓ ') + this.COLORS.success(chalk.bold(message)));
		console.log('');
	}

	static printDivider(): void {
		console.log(this.COLORS.muted('─'.repeat(65)));
	}

	static printConnectionStatus(service: string, status: 'connected' | 'disconnected' | 'connecting'): void {
		const statusColors = {
			connected: this.COLORS.success('● CONNECTED'),
			disconnected: this.COLORS.warning('● DISCONNECTED'),
			connecting: this.COLORS.info('● CONNECTING...'),
		};

		const statusText = statusColors[status];
		console.log(`  ${this.COLORS.muted(service.padEnd(20, ' '))} ${statusText}`);
	}
}
