import { BaseGraphQLException } from './base.exception';
import { ErrorCode } from '../enums';

/**
 * UserNotFoundException - Thrown when a user is not found
 */
export class UserNotFoundException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.USER_NOT_FOUND, undefined, details, statusCode);
	}
}

/**
 * UserAlreadyExistsException - Thrown when attempting to create a user that already exists
 */
export class UserAlreadyExistsException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.USER_ALREADY_EXISTS, undefined, details, statusCode);
	}
}

/**
 * UserCreationFailedException - Thrown when user creation fails
 */
export class UserCreationFailedException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.USER_CREATION_FAILED, undefined, details, statusCode);
	}
}

/**
 * InvalidCredentialsException - Thrown when authentication credentials are invalid
 */
export class InvalidCredentialsException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.INVALID_CREDENTIALS, undefined, details, statusCode);
	}
}

/**
 * UnauthorizedException - Thrown when user is not authorized
 */
export class UnauthorizedException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.UNAUTHORIZED, undefined, details, statusCode);
	}
}

/**
 * UnAuthenticatedException - Thrown when user is not authenticated
 */
export class UnAuthenticatedException extends BaseGraphQLException {
	constructor(message?: string, details?: any, statusCode?: number) {
		super(ErrorCode.USER_NOT_AUTHENTICATED, message, details, statusCode);
	}
}

/**
 * UserDeactivatedException - Thrown when user is deactivated
 */
export class UserDeactivatedException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.USER_STATUS_DEACTIVATED, undefined, details, statusCode);
	}
}

/**
 * UserSuspendedException - Thrown when user is deactivated
 */
export class UserSuspendedException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.USER_STATUS_SUSPENDED, undefined, details, statusCode);
	}
}

/**
 * TokenExpiredException - Thrown when authentication token has expired
 */

export class TokenExpiredException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.TOKEN_EXPIRED, undefined, details, statusCode);
	}
}

/**
 * ForbiddenException - Thrown when user doesn't have permission
 */
export class ForbiddenException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.FORBIDDEN, undefined, details, statusCode);
	}
}

/**
 * CompanyNotFoundException - Thrown when a company is not found
 */
export class CompanyNotFoundException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.COMPANY_NOT_FOUND, undefined, details, statusCode);
	}
}

/**
 * DuplicatedOnwerCompanyException - Thrown when a company owner is already registered for another company
 */
export class DuplicatedOnwerCompanyException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.COMPANY_OWNER_DUPLICATED, undefined, details, statusCode);
	}
}

/**
 * JobNotFoundException - Thrown when a job is not found
 */
export class JobNotFoundException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.JOB_NOT_FOUND, undefined, details, statusCode);
	}
}

/**
 * JobCreationFailedException - Thrown when job creation fails
 */
export class JobCreationFailedException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.JOB_CREATION_FAILED, undefined, details, statusCode);
	}
}


/**
 * ApplicationNotFoundException - Thrown when an application is not found
 */
export class ApplicationNotFoundException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.APPLICATION_NOT_FOUND, undefined, details, statusCode);
	}
}

/**
 * ApplicationAlreadyExistsException - Thrown when user has already applied
 */
export class ApplicationAlreadyExistsException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.APPLICATION_ALREADY_EXISTS, undefined, details, statusCode);
	}
}

/**
 * ResumeNotFoundException - Thrown when a resume is not found
 */
export class ResumeNotFoundException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.RESUME_NOT_FOUND, undefined, details, statusCode);
	}
}

/**
 * ResumeUploadFailedException - Thrown when resume upload fails
 */
export class ResumeUploadFailedException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.RESUME_UPLOAD_FAILED, undefined, details, statusCode);
	}
}

/**
 * InvalidFileFormatException - Thrown when file format is invalid
 */
export class InvalidFileFormatException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.INVALID_FILE_TYPE, undefined, details, statusCode);
	}
}

/**
 * FileSizeExceededException - Thrown when file size exceeds limit
 */
export class FileSizeExceededException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.FILE_TOO_LARGE, undefined, details, statusCode);
	}
}

/**
 * BookmarkNotFoundException - Thrown when a bookmark is not found
 */
export class BookmarkNotFoundException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.BOOKMARK_NOT_FOUND, undefined, details, statusCode);
	}
}

/**
 * BookmarkAlreadyExistsException - Thrown when bookmark already exists
 */
export class BookmarkAlreadyExistsException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.BOOKMARK_ALREADY_EXISTS, undefined, details, statusCode);
	}
}

/**
 * DatabaseException - Thrown when database operation fails
 */
export class DatabaseException extends BaseGraphQLException {
	constructor(errorCode: ErrorCode = ErrorCode.DATABASE_QUERY_FAILED, details?: any, statusCode?: number) {
		super(errorCode, undefined, details, statusCode);
	}
}

/**
 * ValidationException - Thrown when validation fails
 */
export class ValidationException extends BaseGraphQLException {
	constructor(message?: string, details?: any, statusCode?: number) {
		super(ErrorCode.INVALID_INPUT, message, details, statusCode);
	}
}

/**
 * NotFoundException - Generic not found exception
 */
export class NotFoundException extends BaseGraphQLException {
	constructor(resource: string, details?: any, statusCode?: number) {
		super(ErrorCode.NOT_FOUND, `${resource} not found`, details, statusCode);
	}
}

/**
 * BadRequestException - Generic bad request exception
 */
export class BadRequestException extends BaseGraphQLException {
	constructor(message?: string, details?: any, statusCode?: number) {
		super(ErrorCode.BAD_REQUEST, message, details, statusCode);
	}
}

/**
 * DuplicateEducationException - Thrown when trying to add duplicate education entry
 */
export class DuplicateEducationException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.DUPLICATE_KEY_ERROR, 'Education entry already exists for this school', details, statusCode);
	}
}

/**
 * DuplicateExperienceException - Thrown when trying to add duplicate experience entry
 */
export class DuplicateExperienceException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.DUPLICATE_KEY_ERROR, 'Experience entry already exists for this company', details, statusCode);
	}
}

/**
 * DuplicateQualificationException - Thrown when trying to add duplicate qualification entry
 */
export class DuplicateQualificationException extends BaseGraphQLException {
	constructor(details?: any, statusCode?: number) {
		super(ErrorCode.DUPLICATE_KEY_ERROR, 'Qualification entry already exists with this name', details, statusCode);
	}
}

/**
 * InternalServerException - Generic internal server error
 */
export class InternalServerException extends BaseGraphQLException {
	constructor(message?: string, details?: any, statusCode?: number) {
		super(ErrorCode.INTERNAL_SERVER_ERROR, message, details, statusCode);
	}
}
