/**
 * ErrorCode - Enumeration of all application error codes
 *
 * These codes provide a consistent way to identify and handle different types of errors
 * across the application. Each code corresponds to a specific error scenario.
 */
export enum ErrorCode {
	// Authentication & Authorization Errors (1xxx)
	UNAUTHORIZED = 'AUTH_1001',
	INVALID_CREDENTIALS = 'AUTH_1002',
	TOKEN_EXPIRED = 'AUTH_1003',
	TOKEN_INVALID = 'AUTH_1004',
	FORBIDDEN = 'AUTH_1005',
	INSUFFICIENT_PERMISSIONS = 'AUTH_1006',
	USER_NOT_AUTHENTICATED = 'AUTH_1007',

	// User Related Errors (2xxx)
	USER_NOT_FOUND = 'USER_2001',
	USER_ALREADY_EXISTS = 'USER_2002',
	USER_CREATION_FAILED = 'USER_2003',
	USER_UPDATE_FAILED = 'USER_2004',
	USER_DELETION_FAILED = 'USER_2005',
	USER_STATUS_DEACTIVATED = 'USER_2006',
	USER_STATUS_SUSPENDED = 'USER_2007',
	// USER_STATUS_ACTIVATE = 'USER_2008',
	INVALID_USER_DATA = 'USER_2008',

	// Company Related Errors (3xxx)
	COMPANY_NOT_FOUND = 'COMPANY_3001',
	COMPANY_ALREADY_EXISTS = 'COMPANY_3002',
	COMPANY_CREATION_FAILED = 'COMPANY_3003',
	COMPANY_UPDATE_FAILED = 'COMPANY_3004',
	COMPANY_DELETION_FAILED = 'COMPANY_3005',
	COMPANY_OWNER_DUPLICATED = 'COMPANY_3006',

	// Job Related Errors (4xxx)
	JOB_NOT_FOUND = 'JOB_4001',
	JOB_CREATION_FAILED = 'JOB_4002',
	JOB_UPDATE_FAILED = 'JOB_4003',
	JOB_DELETION_FAILED = 'JOB_4004',
	JOB_APPLICATION_FAILED = 'JOB_4005',

	// Application Related Errors (5xxx)
	APPLICATION_NOT_FOUND = 'APPLICATION_5001',
	APPLICATION_ALREADY_EXISTS = 'APPLICATION_5002',
	APPLICATION_CREATION_FAILED = 'APPLICATION_5003',
	APPLICATION_UPDATE_FAILED = 'APPLICATION_5004',

	// Resume Related Errors (6xxx)
	RESUME_NOT_FOUND = 'RESUME_6001',
	RESUME_UPLOAD_FAILED = 'RESUME_6002',
	RESUME_INVALID_FORMAT = 'RESUME_6003',
	RESUME_SIZE_EXCEEDED = 'RESUME_6004',

	// Bookmark Related Errors (7xxx)
	BOOKMARK_NOT_FOUND = 'BOOKMARK_7001',
	BOOKMARK_ALREADY_EXISTS = 'BOOKMARK_7002',

	// Notification Related Errors (8xxx)
	NOTIFICATION_NOT_FOUND = 'NOTIFICATION_8001',
	NOTIFICATION_SEND_FAILED = 'NOTIFICATION_8002',

	// Database Errors (9xxx)
	DATABASE_CONNECTION_FAILED = 'DB_9001',
	DATABASE_QUERY_FAILED = 'DB_9002',
	DATABASE_TRANSACTION_FAILED = 'DB_9003',
	DUPLICATE_KEY_ERROR = 'DB_9004',
	VALIDATION_ERROR = 'DB_9005',

	// Validation Errors (10xxx)
	INVALID_INPUT = 'VALIDATION_10001',
	REQUIRED_FIELD_MISSING = 'VALIDATION_10002',
	INVALID_EMAIL = 'VALIDATION_10003',
	INVALID_PASSWORD = 'VALIDATION_10004',
	INVALID_PHONE_NUMBER = 'VALIDATION_10005',

	// File Related Errors (11xxx)
	FILE_NOT_FOUND = 'FILE_11001',
	FILE_UPLOAD_FAILED = 'FILE_11002',
	FILE_TOO_LARGE = 'FILE_11003',
	INVALID_FILE_TYPE = 'FILE_11004',

	// External Service Errors (12xxx)
	EXTERNAL_SERVICE_ERROR = 'EXTERNAL_12001',
	EMAIL_SERVICE_FAILED = 'EXTERNAL_12002',
	STORAGE_SERVICE_FAILED = 'EXTERNAL_12003',

	// Generic Errors (99xxx)
	INTERNAL_SERVER_ERROR = 'ERROR_99001',
	NOT_FOUND = 'ERROR_99002',
	BAD_REQUEST = 'ERROR_99003',
	SERVICE_UNAVAILABLE = 'ERROR_99004',
	TIMEOUT = 'ERROR_99005',
	UNKNOWN_ERROR = 'ERROR_99999',

	// SCHEMA VALIDATION ERROR
	BAD_USER_INPUT = 'ERROR_100001',
}

/**
 * ErrorMessage - Human-readable messages for each error code
 */
export const ErrorMessage: Record<ErrorCode, string> = {
	// Authentication & Authorization
	[ErrorCode.UNAUTHORIZED]: 'You are not authorized to perform this action',
	[ErrorCode.INVALID_CREDENTIALS]: 'Invalid credentials provided',
	[ErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please login again',
	[ErrorCode.TOKEN_INVALID]: 'Invalid authentication token',
	[ErrorCode.FORBIDDEN]: 'Access forbidden',
	[ErrorCode.INSUFFICIENT_PERMISSIONS]: 'You do not have sufficient permissions',
	[ErrorCode.USER_NOT_AUTHENTICATED]: 'You are not authenticated. Please login to continue',

	// User Related
	[ErrorCode.USER_NOT_FOUND]: 'User not found',
	[ErrorCode.USER_ALREADY_EXISTS]: 'User already exists with this email',
	[ErrorCode.USER_CREATION_FAILED]: 'Failed to create user',
	[ErrorCode.USER_UPDATE_FAILED]: 'Failed to update user',
	[ErrorCode.USER_DELETION_FAILED]: 'Failed to delete user',
	[ErrorCode.USER_STATUS_DEACTIVATED]: 'User status is deactivated. If you want to activate, please reach us',
	[ErrorCode.USER_STATUS_SUSPENDED]: 'User status is suspended. If you want to activate, please reach us',
	[ErrorCode.INVALID_USER_DATA]: 'Invalid user data provided',

	// Company Related
	[ErrorCode.COMPANY_NOT_FOUND]: 'Company not found',
	[ErrorCode.COMPANY_ALREADY_EXISTS]: 'Company already exists',
	[ErrorCode.COMPANY_CREATION_FAILED]: 'Failed to create company',
	[ErrorCode.COMPANY_UPDATE_FAILED]: 'Failed to update company',
	[ErrorCode.COMPANY_DELETION_FAILED]: 'Failed to delete company',
	[ErrorCode.COMPANY_OWNER_DUPLICATED]: 'Chosen user is already registered for another company',

	// Job Related
	[ErrorCode.JOB_NOT_FOUND]: 'Job not found',
	[ErrorCode.JOB_CREATION_FAILED]: 'Failed to create job posting',
	[ErrorCode.JOB_UPDATE_FAILED]: 'Failed to update job posting',
	[ErrorCode.JOB_DELETION_FAILED]: 'Failed to delete job posting',
	[ErrorCode.JOB_APPLICATION_FAILED]: 'Failed to submit job application',

	// Application Related
	[ErrorCode.APPLICATION_NOT_FOUND]: 'Application not found',
	[ErrorCode.APPLICATION_ALREADY_EXISTS]: 'You have already applied to this job',
	[ErrorCode.APPLICATION_CREATION_FAILED]: 'Failed to create application',
	[ErrorCode.APPLICATION_UPDATE_FAILED]: 'Failed to update application',

	// Resume Related
	[ErrorCode.RESUME_NOT_FOUND]: 'Resume not found',
	[ErrorCode.RESUME_UPLOAD_FAILED]: 'Failed to upload resume',
	[ErrorCode.RESUME_INVALID_FORMAT]: 'Invalid resume format. Please upload PDF or DOCX',
	[ErrorCode.RESUME_SIZE_EXCEEDED]: 'Resume size exceeds maximum limit of 5MB',

	// Bookmark Related
	[ErrorCode.BOOKMARK_NOT_FOUND]: 'Bookmark not found',
	[ErrorCode.BOOKMARK_ALREADY_EXISTS]: 'This job is already bookmarked',

	// Notification Related
	[ErrorCode.NOTIFICATION_NOT_FOUND]: 'Notification not found',
	[ErrorCode.NOTIFICATION_SEND_FAILED]: 'Failed to send notification',

	// Database Errors
	[ErrorCode.DATABASE_CONNECTION_FAILED]: 'Database connection failed',
	[ErrorCode.DATABASE_QUERY_FAILED]: 'Database query failed',
	[ErrorCode.DATABASE_TRANSACTION_FAILED]: 'Database transaction failed',
	[ErrorCode.DUPLICATE_KEY_ERROR]: 'A record with this information already exists',
	[ErrorCode.VALIDATION_ERROR]: 'Data validation failed',

	// Validation Errors
	[ErrorCode.INVALID_INPUT]: 'Invalid input provided',
	[ErrorCode.REQUIRED_FIELD_MISSING]: 'Required field is missing',
	[ErrorCode.INVALID_EMAIL]: 'Invalid email address',
	[ErrorCode.INVALID_PASSWORD]: 'Password does not meet requirements',
	[ErrorCode.INVALID_PHONE_NUMBER]: 'Invalid phone number format',

	// File Related
	[ErrorCode.FILE_NOT_FOUND]: 'File not found',
	[ErrorCode.FILE_UPLOAD_FAILED]: 'File upload failed',
	[ErrorCode.FILE_TOO_LARGE]: 'File size exceeds maximum limit',
	[ErrorCode.INVALID_FILE_TYPE]: 'Invalid file type',

	// External Service
	[ErrorCode.EXTERNAL_SERVICE_ERROR]: 'External service error',
	[ErrorCode.EMAIL_SERVICE_FAILED]: 'Failed to send email',
	[ErrorCode.STORAGE_SERVICE_FAILED]: 'Storage service error',

	// Generic Errors
	[ErrorCode.INTERNAL_SERVER_ERROR]: 'Internal server error occurred',
	[ErrorCode.NOT_FOUND]: 'Resource not found',
	[ErrorCode.BAD_REQUEST]: 'Bad request',
	[ErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
	[ErrorCode.TIMEOUT]: 'Request timeout',
	[ErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred',

	// Schema Validation Error
	[ErrorCode.BAD_USER_INPUT]: 'Invalid input data according to schema validation',
};
