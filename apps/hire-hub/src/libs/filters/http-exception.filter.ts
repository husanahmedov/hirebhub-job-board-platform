import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerUtil } from '../logger.util';
import { ErrorCode } from '../enums/error.enum';

type RequestLike = Pick<Request, 'url' | 'method' | 'get' | 'ip'>;

/**
 * ErrorResponse - Structure of error responses sent to clients
 */
export interface ErrorResponse {
	statusCode: number;
	errorCode: string;
	message: string;
	timestamp: string;
	path: string;
	method: string;
	details?: any;
	stack?: string;
}

/**
 * HttpExceptionFilter - Global exception filter for handling all HTTP exceptions
 *
 * This filter catches all exceptions thrown in the application, formats them consistently,
 * logs them appropriately, and returns a structured error response to the client.
 *
 * Features:
 * - Catches all exceptions (HTTP and non-HTTP)
 * - Formats errors consistently
 * - Logs errors with proper context
 * - Handles MongoDB/Mongoose errors
 * - Provides stack traces in development
 * - Sanitizes errors in production
 *
 * @example
 * ```typescript
 * // In app.module.ts or main.ts
 * app.useGlobalFilters(new HttpExceptionFilter());
 * ```
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost): void {
		// Check if this is a GraphQL context
		if (host.getType<string>() === 'graphql') {
			// GraphQL errors are handled by Apollo's formatError
			// Just rethrow to let GraphQL handle it
			throw exception;
		}

		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = this.getRequest(ctx);

		// Additional safety check for response object
		if (!response || typeof response.status !== 'function') {
			LoggerUtil.error('Invalid response object in HttpExceptionFilter', exception as Error);
			return;
		}

		// Determine status code and error details
		let statusCode: number;
		let errorCode: string;
		let message: string;
		let details: any;

		// Handle different types of exceptions
		if (exception instanceof HttpException) {
			// NestJS built-in HTTP exceptions
			statusCode = exception.getStatus();
			const exceptionResponse = exception.getResponse() as any;
			errorCode = exceptionResponse.errorCode || 'HTTP_ERROR';
			message = exceptionResponse.message || exception.message;
			details = exceptionResponse.details;
		} else if (exception instanceof Error) {
			// Handle specific error types
			const errorResult = this.handleSpecificErrors(exception);
			statusCode = errorResult.statusCode;
			errorCode = errorResult.errorCode;
			message = errorResult.message;
			details = errorResult.details;
		} else {
			// Unknown errors
			statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
			errorCode = ErrorCode.UNKNOWN_ERROR;
			message = 'An unexpected error occurred';
			details = undefined;
		}

		// Construct error response
		const errorResponse = this.buildErrorResponse({
			statusCode,
			errorCode,
			message,
			details,
			exception,
			request,
		});

		// Log the error with appropriate level
		this.logError(statusCode, errorCode, message, request, exception);

		// Send response
		response.status(statusCode).json(errorResponse);
	}

	private getRequest(ctx: ReturnType<ArgumentsHost['switchToHttp']>): RequestLike | undefined {
		try {
			return ctx.getRequest<Request>();
		} catch {
			return undefined;
		}
	}

	private buildErrorResponse(params: {
		statusCode: number;
		errorCode: string;
		message: string;
		details?: any;
		exception?: unknown;
		request?: RequestLike;
	}): ErrorResponse {
		const { statusCode, errorCode, message, details, exception, request } = params;
		const errorResponse: ErrorResponse = {
			statusCode,
			errorCode,
			message,
			timestamp: new Date().toISOString(),
			path: request?.url ?? 'N/A',
			method: request?.method ?? 'N/A',
		};

		if (details) {
			errorResponse.details = details;
		}

		if (this.isDevelopment() && exception instanceof Error) {
			errorResponse.stack = exception.stack;
		}

		return errorResponse;
	}

	/**
	 * Handle specific error types (MongoDB, Mongoose, etc.)
	 */
	private handleSpecificErrors(error: Error): {
		statusCode: number;
		errorCode: string;
		message: string;
		details?: any;
	} {
		// MongoDB duplicate key error
		if (error.name === 'MongoServerError' && (error as any).code === 11000) {
			const duplicatedField = Object.keys((error as any).keyValue || {})[0];
			return {
				statusCode: HttpStatus.CONFLICT,
				errorCode: ErrorCode.DUPLICATE_KEY_ERROR,
				message: `A record with this ${duplicatedField} already exists`,
				details: { field: duplicatedField },
			};
		}

		// Mongoose validation error
		if (error.name === 'ValidationError') {
			const validationErrors = (error as any).errors;
			const messages = Object.keys(validationErrors).map((key) => validationErrors[key].message);
			return {
				statusCode: HttpStatus.BAD_REQUEST,
				errorCode: ErrorCode.VALIDATION_ERROR,
				message: messages.join(', '),
				details: validationErrors,
			};
		}

		// Mongoose cast error (invalid ObjectId, etc.)
		if (error.name === 'CastError') {
			return {
				statusCode: HttpStatus.BAD_REQUEST,
				errorCode: ErrorCode.INVALID_INPUT,
				message: `Invalid ${(error as any).path}: ${(error as any).value}`,
				details: { path: (error as any).path, value: (error as any).value },
			};
		}

		// JWT errors
		if (error.name === 'JsonWebTokenError') {
			return {
				statusCode: HttpStatus.UNAUTHORIZED,
				errorCode: ErrorCode.TOKEN_INVALID,
				message: 'Invalid authentication token',
				details: undefined,
			};
		}

		if (error.name === 'TokenExpiredError') {
			return {
				statusCode: HttpStatus.UNAUTHORIZED,
				errorCode: ErrorCode.TOKEN_EXPIRED,
				message: 'Authentication token has expired',
				details: undefined,
			};
		}

		// Default error
		return {
			statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
			errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
			message: error.message || 'Internal server error',
			details: undefined,
		};
	}

	/**
	 * Log error with appropriate level based on status code
	 */
	private logError(
		statusCode: number,
		errorCode: string,
		message: string,
		request?: RequestLike,
		exception?: unknown,
	): void {
		const context = {
			errorCode,
			statusCode,
			path: request?.url ?? 'N/A',
			method: request?.method ?? 'N/A',
			userAgent: request?.get('user-agent') || 'unknown',
			ip: request?.ip ?? 'unknown',
		};

		// Log client errors (4xx) as warnings
		if (statusCode >= 400 && statusCode < 500) {
			LoggerUtil.warn(message, JSON.stringify(context));
		}
		// Log server errors (5xx) as errors
		else if (statusCode >= 500) {
			LoggerUtil.error(message, exception instanceof Error ? exception : new Error(message));
		}
	}

	private isDevelopment(): boolean {
		return process.env.NODE_ENV === 'development';
	}
}
