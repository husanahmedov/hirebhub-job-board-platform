import { Catch, ArgumentsHost, ExceptionFilter, BadRequestException } from '@nestjs/common';
import { GqlArgumentsHost, GqlContextType } from '@nestjs/graphql';
import { BaseGraphQLException } from '../exceptions/base.exception';
import { ErrorCode, ErrorMessage } from '../enums';

/**
 * GraphQLExceptionFilter - Global exception filter for GraphQL operations
 *
 * This filter catches validation errors from class-validator and transforms them
 * into consistent BaseGraphQLException format with proper error codes.
 *
 * Handles:
 * - ValidationPipe errors (BadRequestException with validation details)
 * - Custom GraphQL exceptions (re-throws as-is)
 * - Generic errors (transforms with context)
 *
 * @example
 * ```typescript
 * // In app.module.ts providers array
 * {
 *   provide: APP_FILTER,
 *   useClass: GraphQLExceptionFilter,
 * }
 * ```
 */
@Catch()
export class GraphQLExceptionFilter implements ExceptionFilter {
	catch(exception: any, host: ArgumentsHost) {
		// Only handle GraphQL context
		const gqlHost = GqlArgumentsHost.create(host);
		const contextType = host.getType<GqlContextType>();

		if (contextType !== 'graphql') {
			// Let HTTP filter handle REST endpoints
			throw exception;
		}

		// If it's already a BaseGraphQLException, re-throw it
		if (exception instanceof BaseGraphQLException) {
			throw exception;
		}

		// Handle class-validator validation errors from ValidationPipe
		if (exception instanceof BadRequestException) {
			const response = exception.getResponse() as any;
			// Check if it has validation error structure
			if (response.message && Array.isArray(response.message)) {
				const validationErrors = this.formatValidationErrors(response.message);

				throw new BaseGraphQLException(ErrorCode.VALIDATION_ERROR, ErrorMessage[ErrorCode.VALIDATION_ERROR], {
					validationErrors,
				});
			}

			// Generic bad request
			throw new BaseGraphQLException(ErrorCode.INVALID_INPUT, response.message || 'Invalid input provided');
		}

		// Transform unknown errors
		throw new BaseGraphQLException(
			ErrorCode.INTERNAL_SERVER_ERROR,
			exception.message || 'An unexpected error occurred',
			{
				originalError: exception.name,
			},
		);
	}

	/**
	 * Format class-validator error messages into a cleaner structure
	 *
	 * @param messages - Array of validation error messages
	 * @returns Formatted validation error details
	 */
	private formatValidationErrors(messages: string[]): Array<{ field: string; constraints: string[] }> {
		const errors: Array<{ field: string; constraints: string[] }> = [];
		const fieldMap = new Map<string, string[]>();

		messages.forEach((message) => {
			// Parse validation messages like "email must be an email"
			const match = message.match(/^(\w+)\s+(.+)$/);
			if (match) {
				const [, field, constraint] = match;
				if (!fieldMap.has(field)) {
					fieldMap.set(field, []);
				}
				fieldMap.get(field)!.push(constraint);
			} else {
				// Generic message without field
				if (!fieldMap.has('_general')) {
					fieldMap.set('_general', []);
				}
				fieldMap.get('_general')!.push(message);
			}
		});

		fieldMap.forEach((constraints, field) => {
			errors.push({ field, constraints });
		});

		return errors;
	}
}
