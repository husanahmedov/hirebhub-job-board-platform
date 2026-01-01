import { Injectable, NestInterceptor, ExecutionContext, CallHandler, RequestTimeoutException } from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
	private readonly TIMEOUT_MS = 10000; // 10 seconds

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(
			timeout(this.TIMEOUT_MS),
			catchError((err) => {
				if (err instanceof TimeoutError) {
					return throwError(() => new RequestTimeoutException(`Request timeout after ${this.TIMEOUT_MS}ms`));
				}
				return throwError(() => err);
			}),
		);
	}
}
