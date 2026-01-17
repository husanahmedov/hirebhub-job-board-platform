import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import chalk from 'chalk';

interface RequestLog {
	timestamp: string;
	type: string;
	operation: string;
	user: string;
	responseTime: number;
	status: string;
}

@Injectable()
export class StatusInterceptor implements NestInterceptor {
	private readonly logger: Logger = new Logger('StatusInterceptor');

	public intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const startTime = Date.now();
		const type = context.getType<GqlContextType>();

		if (type === 'http') {
			return this.handleHttpRequest(context, next, startTime);
		} else if (type === 'graphql') {
			return this.handleGraphQLRequest(context, next, startTime);
		}

		return next.handle();
	}

	private handleHttpRequest(context: ExecutionContext, next: CallHandler, startTime: number): Observable<any> {
		const req = context.switchToHttp().getRequest();
		const method = req.method;
		const url = req.url;
		const user = req.user ? `${req.user.email || req.user._id}` : 'Guest';

		return next.handle().pipe(
			tap(() => {
				const responseTime = Date.now() - startTime;
				this.logRequest({
					timestamp: new Date().toLocaleTimeString(),
					type: 'HTTP',
					operation: `${method} ${url}`,
					user,
					responseTime,
					status: 'SUCCESS',
				});
			}),
			catchError((error) => {
				const responseTime = Date.now() - startTime;
				this.logRequest({
					timestamp: new Date().toLocaleTimeString(),
					type: 'HTTP',
					operation: `${method} ${url}`,
					user,
					responseTime,
					status: 'ERROR',
				});
				return throwError(() => error);
			}),
		);
	}

	private handleGraphQLRequest(context: ExecutionContext, next: CallHandler, startTime: number): Observable<any> {
		const gqlCtx = GqlExecutionContext.create(context);
		const info = gqlCtx.getInfo();
		const ctx = gqlCtx.getContext();

		const operationType = (info?.operation?.operation || 'unknown').toUpperCase();
		const fieldName = info?.fieldName || 'unknown';
		const user = ctx?.req?.user ? `${ctx.req.user.email || ctx.req.user.fullName || ctx.req.user._id}` : 'Guest';

		return next.handle().pipe(
			tap(() => {
				const responseTime = Date.now() - startTime;
				this.logRequest({
					timestamp: new Date().toLocaleTimeString(),
					type: operationType,
					operation: fieldName,
					user,
					responseTime,
					status: 'SUCCESS',
				});
			}),
			catchError((error) => {
				const responseTime = Date.now() - startTime;
				this.logRequest({
					timestamp: new Date().toLocaleTimeString(),
					type: operationType,
					operation: fieldName,
					user,
					responseTime,
					status: 'ERROR',
				});
				return throwError(() => error);
			}),
		);
	}

	private logRequest(log: RequestLog): void {
		const divider = chalk.gray('─'.repeat(120));
		const timestamp = chalk.cyan(log.timestamp.padEnd(12));
		const type = this.getTypeFormatted(log.type);
		const operation = this.getOperationFormatted(log.operation, log.type);
		const user = this.getUserFormatted(log.user);
		const responseTime = this.getResponseTimeFormatted(log.responseTime);
		const status = this.getStatusFormatted(log.status);

		console.log(divider);
		console.log(`${timestamp} ${type} ${operation} ${user} ${responseTime} ${status}`);
	}

	private getTypeFormatted(type: string): string {
		const typeMap: { [key: string]: string } = {
			QUERY: chalk.blue.bold('QUERY   '),
			MUTATION: chalk.magenta.bold('MUTATION'),
			HTTP: chalk.yellow.bold('HTTP    '),
		};
		return typeMap[type] || chalk.white.bold(type.padEnd(8));
	}

	private getOperationFormatted(operation: string, type: string): string {
		const maxLength = 35;
		const truncated = operation.length > maxLength ? operation.substring(0, maxLength - 3) + '...' : operation;

		if (type === 'QUERY') {
			return chalk.blue(truncated.padEnd(maxLength));
		} else if (type === 'MUTATION') {
			return chalk.magenta(truncated.padEnd(maxLength));
		} else {
			return chalk.yellow(truncated.padEnd(maxLength));
		}
	}

	private getUserFormatted(user: string): string {
		const maxLength = 25;
		const truncated = user.length > maxLength ? user.substring(0, maxLength - 3) + '...' : user;

		if (user === 'Guest') {
			return chalk.gray('👤 ' + truncated.padEnd(maxLength));
		} else {
			return chalk.green('🔐 ' + truncated.padEnd(maxLength));
		}
	}

	private getResponseTimeFormatted(responseTime: number): string {
		let color: (text: string) => string;
		let icon: string;

		if (responseTime < 100) {
			color = chalk.green;
			icon = '⚡';
		} else if (responseTime < 500) {
			color = chalk.cyan;
			icon = '✓';
		} else if (responseTime < 1000) {
			color = chalk.yellow;
			icon = '⚠';
		} else {
			color = chalk.red;
			icon = '⏱';
		}

		return color(`${icon} ${responseTime}ms`.padEnd(12));
	}

	private getStatusFormatted(status: string): string {
		if (status === 'SUCCESS') {
			return chalk.green.bold('✓ OK  ');
		} else {
			return chalk.red.bold('✗ ERROR');
		}
	}

	// Pretty table header (call this once at application start)
	public static printHeader(): void {
		const divider = chalk.gray('═'.repeat(120));
		const header =
			chalk.cyan('Time'.padEnd(12)) +
			' ' +
			chalk.white.bold('Type'.padEnd(8)) +
			' ' +
			chalk.white.bold('Operation'.padEnd(35)) +
			' ' +
			chalk.white.bold('User'.padEnd(27)) +
			' ' +
			chalk.white.bold('Response'.padEnd(12)) +
			' ' +
			chalk.white.bold('Status');

		console.log('\n' + divider);
		console.log(header);
		console.log(divider);
	}
}
