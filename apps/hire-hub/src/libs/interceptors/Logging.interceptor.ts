import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger: Logger = new Logger(LoggingInterceptor.name);
	public intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const recordTime = Date.now();
		const type = context.getType<GqlContextType>();

		if (type === 'http') {
			const req = context.switchToHttp().getRequest();
			this.logger.log(`📥 HTTP ${req.method} ${req.url}`);
			return next.handle().pipe(
				tap(() => {
					const responseTime = Date.now() - recordTime;
					this.logger.log(`📤 HTTP ${req.method} ${req.url} +${responseTime}ms\n`);
				}),
			);
		} else if (type === 'graphql') {
			const gqlCtx = GqlExecutionContext.create(context);
			const info = gqlCtx.getInfo();
			const operationType = info?.operation?.operation || 'unknown';
			const fieldName = info?.fieldName || 'unknown';

			this.logger.log(`📥 GraphQL ${operationType.toUpperCase()} ${fieldName}`);

			return next.handle().pipe(
				tap(() => {
					const responseTime = Date.now() - recordTime;
					const color = responseTime > 1000 ? '🔴' : responseTime > 500 ? '🟡' : '🟢';
					this.logger.log(`📤 GraphQL ${operationType.toUpperCase()} ${fieldName} ${color} +${responseTime}ms\n`);
				}),
			);
		}
		return next.handle();
	}

	private stringify(context: any): string {
		return JSON.stringify(context).slice(0, 75);
	}
}
