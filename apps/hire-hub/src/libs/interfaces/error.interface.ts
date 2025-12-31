/**
 * Error Response Interfaces
 *
 * These interfaces define the structure of error responses
 * sent to clients for both REST and GraphQL APIs
 */

/**
 * Standard error response structure for REST API
 */
export interface IErrorResponse {
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
 * GraphQL error extension structure
 */
export interface IGraphQLErrorExtension {
	code: string;
	details?: any;
	timestamp?: string;
	stacktrace?: string[];
	originalError?: {
		message?: string;
		error?: string;
		statusCode?: number;
		details?: any;
	};
}

/**
 * Validation error detail structure
*/
export interface IValidationError {
	field: string;
	message: string;
	value?: any;
}

/**
 * Database error detail structure
*/
export interface IDatabaseError {
	operation: string;
	collection?: string;
	error: string;
}

/**
 * File error detail structure
*/
export interface IFileError {
	filename: string;
	size?: number;
	mimetype?: string;
	message: string;
}

export interface IGraphqlError {
	message?: string;
	locations?: { line: number; column: number }[];
	path?: string[];
	extensions?: IGraphQLErrorExtension;
	componentErrorCode?: string;
}
