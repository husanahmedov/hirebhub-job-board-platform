import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { ApplicationStatus, ApplicationSource } from '../../enums/applications';
import { JobOutput } from '../job/output';
import { CompanyOutput } from '../company/output';
import { PublicUser } from '../../';

/**
 * AttachmentOutput - GraphQL output type for file attachments
 */
@ObjectType({ description: 'File attachment information' })
export class AttachmentOutput {
	@Field({ description: 'File name' })
	fileName: string;

	@Field({ description: 'File URL' })
	fileUrl: string;

	@Field({ description: 'File MIME type' })
	fileType: string;

	@Field(() => Int, { description: 'File size in bytes' })
	fileSize: number;

	@Field({ description: 'Upload timestamp' })
	uploadedAt: Date;
}

/**
 * NoteOutput - GraphQL output type for application notes
 */
@ObjectType({ description: 'Internal note about an application' })
export class NoteOutput {
	@Field(() => ID, { description: 'Note ID' })
	_id: string;

	@Field({ description: 'Note content' })
	content: string;

	@Field(() => ID, { description: 'User ID who created the note' })
	createdBy: string;

	@Field(() => PublicUser, {
		nullable: true,
		description: 'User who created the note',
	})
	createdByData?: PublicUser;

	@Field({ description: 'Creation timestamp' })
	createdAt: Date;
}

/**
 * ApplicationOutput - Main GraphQL output type for application data
 */
@ObjectType({ description: 'Job application information' })
export class ApplicationOutput {
	@Field(() => ID, { description: 'Unique application identifier' })
	_id: string;

	@Field(() => ID, { description: 'Job ID' })
	jobId: string;

	@Field(() => JobOutput, {
		nullable: true,
		description: 'Job details',
	})
	jobData?: JobOutput;

	@Field(() => ID, { description: 'Candidate ID' })
	candidateId: string;

	@Field(() => PublicUser, {
		nullable: true,
		description: 'Candidate details',
	})
	candidateData?: PublicUser;

	@Field(() => ID, { description: 'Company ID' })
	companyId: string;

	@Field(() => CompanyOutput, {
		nullable: true,
		description: 'Company details',
	})
	companyData?: CompanyOutput;

	@Field(() => ApplicationStatus, { description: 'Application status' })
	status: ApplicationStatus;

	@Field(() => ApplicationSource, { description: 'Application source' })
	source: ApplicationSource;

	@Field({ nullable: true, description: 'Cover letter text' })
	coverLetter?: string;

	@Field(() => [AttachmentOutput], { description: 'File attachments' })
	attachments: AttachmentOutput[];

	@Field(() => [NoteOutput], { description: 'Internal notes' })
	notes: NoteOutput[];

	@Field(() => Int, { nullable: true, description: 'Application score (0-100)' })
	score?: number;

	@Field({ description: 'Application submission date' })
	appliedAt: Date;

	@Field({ description: 'Last update timestamp' })
	updatedAt: Date;

	@Field({ description: 'Creation timestamp' })
	createdAt: Date;

	@Field({ nullable: true, description: 'Soft delete timestamp' })
	deletedAt?: Date;
}

/**
 * PaginatedApplicationsOutput - Paginated response for applications list
 */
@ObjectType({ description: 'Paginated applications response' })
export class PaginatedApplicationsOutput {
	@Field(() => [ApplicationOutput], { description: 'List of applications' })
	applications: ApplicationOutput[];

	@Field(() => Int, { description: 'Total number of applications' })
	totalCount: number;

	@Field(() => Int, { description: 'Current page number' })
	page: number;

	@Field(() => Int, { description: 'Number of applications per page' })
	limit: number;

	@Field(() => Int, { description: 'Total number of pages' })
	totalPages: number;

	@Field({ description: 'Whether there is a next page' })
	hasNextPage: boolean;

	@Field({ description: 'Whether there is a previous page' })
	hasPreviousPage: boolean;
}

/**
 * ApplicationStatsOutput - Statistics about applications
 */
@ObjectType({ description: 'Application statistics' })
export class ApplicationStatsOutput {
	@Field(() => Int, { description: 'Total number of applications' })
	totalApplications: number;

	@Field(() => Int, { description: 'Number of pending applications' })
	pendingApplications: number;

	@Field(() => Int, { description: 'Number of reviewed applications' })
	reviewedApplications: number;

	@Field(() => Int, { description: 'Number of shortlisted applications' })
	shortlistedApplications: number;

	@Field(() => Int, { description: 'Number of interview stage applications' })
	interviewApplications: number;

	@Field(() => Int, { description: 'Number of offered applications' })
	offeredApplications: number;

	@Field(() => Int, { description: 'Number of rejected applications' })
	rejectedApplications: number;

	@Field(() => Int, { description: 'Number of hired applications' })
	hiredApplications: number;

	@Field(() => Int, { description: 'Number of withdrawn applications' })
	withdrawnApplications: number;
}
