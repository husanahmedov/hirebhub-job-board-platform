import { BaseGraphQLException } from './base.exception';
import { ErrorCode } from '../enums/error.enum';

/**
 * UserNotFoundException - Thrown when a user is not found
 */
export class UserNotFoundException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.USER_NOT_FOUND, undefined, details);
	}
}

/**
 * UserAlreadyExistsException - Thrown when attempting to create a user that already exists
 */
export class UserAlreadyExistsException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.USER_ALREADY_EXISTS, undefined, details);
	}
}

/**
 * UserCreationFailedException - Thrown when user creation fails
 */
export class UserCreationFailedException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.USER_CREATION_FAILED, undefined, details);
	}
}

/**
 * InvalidCredentialsException - Thrown when authentication credentials are invalid
 */
export class InvalidCredentialsException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.INVALID_CREDENTIALS, undefined, details);
	}
}

/**
 * UnauthorizedException - Thrown when user is not authorized
 */
export class UnauthorizedException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.UNAUTHORIZED, undefined, details);
	}
}

/**
 * UnAuthenticatedException - Thrown when user is not authenticated
 */
export class UnAuthenticatedException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.USER_NOT_AUTHENTICATED, undefined, details);
	}
}

/**
 * UserDeactivatedException - Thrown when user is deactivated
 */
export class UserDeactivatedException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.USER_STATUS_DEACTIVATED, undefined, details);
	}
}

/**
 * UserSuspendedException - Thrown when user is deactivated
 */
export class UserSuspendedException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.USER_STATUS_SUSPENDED, undefined, details);
	}
}

/**
 * TokenExpiredException - Thrown when authentication token has expired
 */

export class TokenExpiredException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.TOKEN_EXPIRED, undefined, details);
	}
}

/**
 * ForbiddenException - Thrown when user doesn't have permission
 */
export class ForbiddenException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.FORBIDDEN, undefined, details);
	}
}

/**
 * CompanyNotFoundException - Thrown when a company is not found
 */
export class CompanyNotFoundException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.COMPANY_NOT_FOUND, undefined, details);
	}
}

/**
 * JobNotFoundException - Thrown when a job is not found
 */
export class JobNotFoundException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.JOB_NOT_FOUND, undefined, details);
	}
}

/**
 * ApplicationNotFoundException - Thrown when an application is not found
 */
export class ApplicationNotFoundException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.APPLICATION_NOT_FOUND, undefined, details);
	}
}

/**
 * ApplicationAlreadyExistsException - Thrown when user has already applied
 */
export class ApplicationAlreadyExistsException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.APPLICATION_ALREADY_EXISTS, undefined, details);
	}
}

/**
 * ResumeNotFoundException - Thrown when a resume is not found
 */
export class ResumeNotFoundException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.RESUME_NOT_FOUND, undefined, details);
	}
}

/**
 * ResumeUploadFailedException - Thrown when resume upload fails
 */
export class ResumeUploadFailedException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.RESUME_UPLOAD_FAILED, undefined, details);
	}
}

/**
 * InvalidFileFormatException - Thrown when file format is invalid
 */
export class InvalidFileFormatException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.INVALID_FILE_TYPE, undefined, details);
	}
}

/**
 * FileSizeExceededException - Thrown when file size exceeds limit
 */
export class FileSizeExceededException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.FILE_TOO_LARGE, undefined, details);
	}
}

/**
 * BookmarkNotFoundException - Thrown when a bookmark is not found
 */
export class BookmarkNotFoundException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.BOOKMARK_NOT_FOUND, undefined, details);
	}
}

/**
 * BookmarkAlreadyExistsException - Thrown when bookmark already exists
 */
export class BookmarkAlreadyExistsException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.BOOKMARK_ALREADY_EXISTS, undefined, details);
	}
}

/**
 * DatabaseException - Thrown when database operation fails
 */
export class DatabaseException extends BaseGraphQLException {
	constructor(errorCode: ErrorCode = ErrorCode.DATABASE_QUERY_FAILED, details?: any) {
		super(errorCode, undefined, details);
	}
}

/**
 * ValidationException - Thrown when validation fails
 */
export class ValidationException extends BaseGraphQLException {
	constructor(message?: string, details?: any) {
		super(ErrorCode.INVALID_INPUT, message, details);
	}
}

/**
 * NotFoundException - Generic not found exception
 */
export class NotFoundException extends BaseGraphQLException {
	constructor(resource: string, details?: any) {
		super(ErrorCode.NOT_FOUND, `${resource} not found`, details);
	}
}

/**
 * BadRequestException - Generic bad request exception
 */
export class BadRequestException extends BaseGraphQLException {
	constructor(message?: string, details?: any) {
		super(ErrorCode.BAD_REQUEST, message, details);
	}
}

/**
 * DuplicateEducationException - Thrown when trying to add duplicate education entry
 */
export class DuplicateEducationException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.DUPLICATE_KEY_ERROR, 'Education entry already exists for this school', details);
	}
}

/**
 * DuplicateExperienceException - Thrown when trying to add duplicate experience entry
 */
export class DuplicateExperienceException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.DUPLICATE_KEY_ERROR, 'Experience entry already exists for this company', details);
	}
}

/**
 * DuplicateQualificationException - Thrown when trying to add duplicate qualification entry
 */
export class DuplicateQualificationException extends BaseGraphQLException {
	constructor(details?: any) {
		super(ErrorCode.DUPLICATE_KEY_ERROR, 'Qualification entry already exists with this name', details);
	}
}

/**
 * InternalServerException - Generic internal server error
 */
export class InternalServerException extends BaseGraphQLException {
	constructor(message?: string, details?: any) {
		super(ErrorCode.INTERNAL_SERVER_ERROR, message, details);
	}
}
