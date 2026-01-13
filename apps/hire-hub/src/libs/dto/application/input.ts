import { InputType, Field, Int, ID, registerEnumType } from '@nestjs/graphql';
import {
	IsString,
	IsEnum,
	IsOptional,
	IsArray,
	MaxLength,
	IsNumber,
	Min,
	Max,
	IsDate,
	ValidateNested,
	IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApplicationStatus, ApplicationSource } from '../../enums/applications';
import { SortOrder, PaginationInput } from '../..';

/**
 * AttachmentInput - Input type for file attachments
 */
@InputType({ description: 'Input for file attachment' })
export class AttachmentInput {
	@Field({ description: 'File name' })
	@IsString()
	fileName: string;

	@Field({ description: 'File URL' })
	@IsString()
	fileUrl: string;

	@Field({ description: 'File MIME type' })
	@IsString()
	fileType: string;

	@Field(() => Int, { description: 'File size in bytes' })
	@IsNumber()
	@Min(0)
	fileSize: number;
}

/**
 * NoteInput - Input type for creating a note
 */
@InputType({ description: 'Input for creating a note' })
export class NoteInput {
	@Field({ description: 'Note content' })
	@IsString()
	@MaxLength(1000, { message: 'Note content cannot exceed 1000 characters' })
	content: string;
}

/**
 * CreateApplicationInput - Input type for creating a new application
 */
@InputType({ description: 'Input for creating a new application' })
export class CreateApplicationInput {
	@Field({ description: 'Job ID' })
	@IsString()
	jobId: string;

	@Field(() => ApplicationSource, {
		nullable: true,
		description: 'Application source',
		defaultValue: ApplicationSource.PLATFORM,
	})
	@IsOptional()
	@IsEnum(ApplicationSource)
	source?: ApplicationSource;

	@Field({ nullable: true, description: 'Cover letter text' })
	@IsOptional()
	@IsString()
	@MaxLength(5000, { message: 'Cover letter cannot exceed 5000 characters' })
	coverLetter?: string;

	@Field(() => [AttachmentInput], {
		nullable: true,
		description: 'File attachments',
	})
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => AttachmentInput)
	attachments?: AttachmentInput[];
}

/**
 * UpdateApplicationInput - Input type for updating an existing application
 */
@InputType({ description: 'Input for updating an application' })
export class UpdateApplicationInput {
	@Field(() => ID, { description: 'Application ID' })
	@IsString()
	applicationId: string;

	@Field(() => ApplicationStatus, {
		nullable: true,
		description: 'Application status',
	})
	@IsOptional()
	@IsEnum(ApplicationStatus)
	status?: ApplicationStatus;

	@Field({ nullable: true, description: 'Cover letter text' })
	@IsOptional()
	@IsString()
	@MaxLength(5000, { message: 'Cover letter cannot exceed 5000 characters' })
	coverLetter?: string;

	@Field(() => [AttachmentInput], {
		nullable: true,
		description: 'File attachments',
	})
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => AttachmentInput)
	attachments?: AttachmentInput[];

	@Field(() => Int, {
		nullable: true,
		description: 'Application score (0-100)',
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(100)
	score?: number;
}

/**
 * AddNoteInput - Input type for adding a note to an application
 */
@InputType({ description: 'Input for adding a note to an application' })
export class AddNoteInput {
	@Field(() => ID, { description: 'Application ID' })
	@IsString()
	applicationId: string;

	@Field({ description: 'Note content' })
	@IsString()
	@MaxLength(1000, { message: 'Note content cannot exceed 1000 characters' })
	content: string;
}

/**
 * ApplicationFilterInput - Filters for querying applications
 */
@InputType({ description: 'Filters for querying applications' })
export class ApplicationFilterInput {
	@Field({ nullable: true, description: 'Filter by job ID' })
	@IsOptional()
	@IsString()
	jobId?: string;

	@Field({ nullable: true, description: 'Filter by candidate ID' })
	@IsOptional()
	@IsString()
	candidateId?: string;

	@Field({ nullable: true, description: 'Filter by company ID' })
	@IsOptional()
	@IsString()
	companyId?: string;

	@Field(() => [ApplicationStatus], {
		nullable: true,
		description: 'Filter by application statuses',
	})
	@IsOptional()
	@IsArray()
	@IsEnum(ApplicationStatus, { each: true })
	statuses?: ApplicationStatus[];

	@Field(() => [ApplicationSource], {
		nullable: true,
		description: 'Filter by application sources',
	})
	@IsOptional()
	@IsArray()
	@IsEnum(ApplicationSource, { each: true })
	sources?: ApplicationSource[];

	@Field({ nullable: true, description: 'Filter by minimum score' })
	@IsOptional()
	@IsNumber()
	@Min(0)
	minScore?: number;

	@Field({ nullable: true, description: 'Filter by maximum score' })
	@IsOptional()
	@IsNumber()
	@Max(100)
	maxScore?: number;

	@Field({ nullable: true, description: 'Filter by applied date from' })
	@IsOptional()
	@IsDate()
	@Type(() => Date)
	appliedFrom?: Date;

	@Field({ nullable: true, description: 'Filter by applied date to' })
	@IsOptional()
	@IsDate()
	@Type(() => Date)
	appliedTo?: Date;

	@Field({
		nullable: true,
		description: 'Include deleted applications',
		defaultValue: false,
	})
	@IsOptional()
	@IsBoolean()
	includeDeleted?: boolean;
}

/**
 * ApplicationSortField - Enum for sortable fields
 */
export enum ApplicationSortField {
	APPLIED_AT = 'appliedAt',
	UPDATED_AT = 'updatedAt',
	SCORE = 'score',
	STATUS = 'status',
}

registerEnumType(ApplicationSortField, {
	name: 'ApplicationSortField',
	description: 'Fields available for sorting applications',
});

/**
 * ApplicationSortInput - Sorting options for applications
 */
@InputType({ description: 'Sorting options for applications' })
export class ApplicationSortInput {
	@Field(() => String, {
		nullable: true,
		description: 'Field to sort by',
		defaultValue: ApplicationSortField.APPLIED_AT,
	})
	@IsOptional()
	@IsEnum(ApplicationSortField)
	field?: ApplicationSortField;

	@Field(() => String, {
		nullable: true,
		description: 'Sort order (asc or desc)',
		defaultValue: SortOrder.DESC,
	})
	@IsOptional()
	@IsEnum(SortOrder)
	order?: SortOrder;
}

/**
 * GetApplicationsInput - Combined input for getting applications with filters, sorting, and pagination
 */
@InputType({ description: 'Input for getting applications with filters' })
export class GetApplicationsInput {
	@Field(() => ApplicationFilterInput, {
		nullable: true,
		description: 'Filters to apply',
	})
	@IsOptional()
	@ValidateNested()
	@Type(() => ApplicationFilterInput)
	filter?: ApplicationFilterInput;

	@Field(() => ApplicationSortInput, {
		nullable: true,
		description: 'Sorting options',
	})
	@IsOptional()
	@ValidateNested()
	@Type(() => ApplicationSortInput)
	sort?: ApplicationSortInput;

	@Field(() => PaginationInput, {
		nullable: true,
		description: 'Pagination options',
	})
	@IsOptional()
	@ValidateNested()
	@Type(() => PaginationInput)
	pagination?: PaginationInput;
}
