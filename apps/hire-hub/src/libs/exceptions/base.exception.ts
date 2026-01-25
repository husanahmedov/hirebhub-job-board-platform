import { GraphQLError } from 'graphql';
import { ErrorCode, ErrorMessage } from '../enums';

/**
 * BaseGraphQLException - Base class for all custom GraphQL exceptions
 *
 * This class extends GraphQLError and provides a consistent structure for error handling
 * across the entire GraphQL API. All custom exceptions should extend this class.
 */
export class BaseGraphQLException extends GraphQLError {
	public readonly errorCode: ErrorCode;
	public readonly timestamp: string;
	public readonly details?: any;
	public readonly statusCode?: number;

	constructor(errorCode: ErrorCode, message?: string, details?: any, statusCode?: number) {
		const errorMessage = message || ErrorMessage[errorCode];

		super(errorMessage, {
			extensions: {
				code: errorCode,
				timestamp: new Date().toISOString(),
				statusCode: statusCode || 400,
				details,
			},
		});

		this.errorCode = errorCode;
		this.timestamp = new Date().toISOString();
		this.details = details;

		// Maintains proper stack trace for where our error was thrown
		Error.captureStackTrace(this, this.constructor);
	}
}
