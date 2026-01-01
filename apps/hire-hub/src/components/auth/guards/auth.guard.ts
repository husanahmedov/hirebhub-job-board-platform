import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UnauthorizedException } from '../../../libs';
import chalk from 'chalk';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private authService: AuthService) {}

	private displayUserDetails(authUser: any): void {
		const boxWidth = 70;
		const line = '═'.repeat(boxWidth);
		const separator = '─'.repeat(boxWidth);

		console.log('\n' + chalk.cyan('╔' + line + '╗'));
		console.log(
			chalk.cyan('║') + chalk.bold.white(this.centerText('🔐 AUTHENTICATED USER', boxWidth)) + chalk.cyan('║'),
		);
		console.log(chalk.cyan('╠' + line + '╣'));

		// User Basic Info
		console.log(chalk.cyan('║') + chalk.bold.magenta('  👤 User Information') + ' '.repeat(boxWidth - 21) + chalk.cyan('║'));
		console.log(chalk.cyan('║') + chalk.gray('  ' + separator.substring(0, boxWidth - 2)) + chalk.cyan('║'));
		this.printField('Full Name', authUser.fullName, '🏷️ ', boxWidth + 2);
		this.printField('Email', authUser.email, '📧 ', boxWidth);
		this.printField('Role', authUser.role, '👔 ', boxWidth);
		this.printField('Status', authUser.status, '📊 ', boxWidth);

		// ID & Verification
		console.log(chalk.cyan('║') + ' '.repeat(boxWidth) + chalk.cyan('║'));
		console.log(
			chalk.cyan('║') + chalk.bold.blue('  🔑 Identity & Security') + ' '.repeat(boxWidth - 24) + chalk.cyan('║'),
		);
		console.log(chalk.cyan('║') + chalk.gray('  ' + separator.substring(0, boxWidth - 2)) + chalk.cyan('║'));
		this.printField('User ID', authUser._id, '🆔 ', boxWidth);
		this.printField(
			'Email Verified',
			authUser.emailVerified ? chalk.green('✓ Yes') : chalk.red('✗ No'),
			'✉️  ',
			boxWidth + 1,
			false,
		);

		// Timestamps
		console.log(chalk.cyan('║') + ' '.repeat(boxWidth) + chalk.cyan('║'));
		console.log(chalk.cyan('║') + chalk.bold.yellow('  ⏰ Timestamps') + ' '.repeat(boxWidth - 15) + chalk.cyan('║'));
		console.log(chalk.cyan('║') + chalk.gray('  ' + separator.substring(0, boxWidth - 2)) + chalk.cyan('║'));
		this.printField('Created', this.formatDate(authUser.createdAt), '📅 ', boxWidth);
		this.printField('Updated', this.formatDate(authUser.updatedAt), '🔄 ', boxWidth);

		// Profile Info (if available)
		if (authUser.profile) {
			console.log(chalk.cyan('║') + ' '.repeat(boxWidth) + chalk.cyan('║'));
			console.log(
				chalk.cyan('║') + chalk.bold.green('  📋 Profile Details') + ' '.repeat(boxWidth - 20) + chalk.cyan('║'),
			);
			console.log(chalk.cyan('║') + chalk.gray('  ' + separator.substring(0, boxWidth - 2)) + chalk.cyan('║'));
			if (authUser.profile.headline) {
				this.printField('Headline', authUser.profile.headline, '💼 ', boxWidth);
			}
			if (authUser.profile.location?.city) {
				const location = `${authUser.profile.location.city}${authUser.profile.location.country ? ', ' + authUser.profile.location.country : ''}`;
				this.printField('Location', location, '📍 ', boxWidth);
			}
			if (authUser.profile.skills?.length > 0) {
				const skills =
					authUser.profile.skills.slice(0, 3).join(', ') + (authUser.profile.skills.length > 3 ? '...' : '');
				this.printField('Skills', skills, '🎯 ', boxWidth);
			}
		}

		console.log(chalk.cyan('╚' + line + '╝') + '\n');
	}

	private printField(label: string, value: any, icon: string = '', boxWidth: number, colorize: boolean = true): void {
		const labelText = `${icon}${label}:`;
		const valueText = colorize ? chalk.white(value) : value;
		const padding = boxWidth - labelText.length - this.stripAnsi(valueText.toString()).length - 4;
		console.log(
			chalk.cyan('║') +
				'  ' +
				chalk.dim(labelText) +
				' '.repeat(Math.max(1, padding)) +
				valueText +
				'  ' +
				chalk.cyan('║'),
		);
	}

	private centerText(text: string, width: number): string {
		const padding = Math.max(0, Math.floor((width - text.length) / 2));
		return ' '.repeat(padding) + text + ' '.repeat(width - padding - text.length);
	}

	private formatDate(date: any): string {
		if (!date) return 'N/A';
		const d = new Date(date);
		return d.toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
	}

	private stripAnsi(str: string): string {
		return str.replace(/\x1b\[[0-9;]*m/g, '');
	}

	async canActivate(context: ExecutionContext | any): Promise<boolean> {
		if (context.contextType === 'graphql') {
			const request = context.getArgByIndex(2).req;

			const bearerToken = request.headers.authorization;
			if (!bearerToken) throw new UnauthorizedException(`You are not authenticated. Please login to continue`);

			const token = bearerToken.split(' ')[1],
				authUser = await this.authService.verifyToken(token);
			if (!authUser) throw new UnauthorizedException(`You are not authenticated. Please login to continue`);

			this.displayUserDetails(authUser);
			request.body.authUser = authUser;

			return true;
		}
		return false;

		// description => http, rpc, gprs and etc are ignored
	}
}
