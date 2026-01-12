import { Field, InputType, Int } from '@nestjs/graphql';
import { IsOptional, IsEnum, IsNumber, Min, Max, IsString, IsBoolean } from 'class-validator';
import { UserStatus, UserRole } from '../../enums';

/**
 * Pagination input
 */
@InputType()
export class PaginationInput {
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Field(() => Int, { nullable: true, defaultValue: 1, description: 'Page number' })
	page?: number;

	@IsOptional()
	@IsNumber()
	@Min(1)
	@Max(100)
	@Field(() => Int, { nullable: true, defaultValue: 10, description: 'Items per page' })
	limit?: number;
}

/**
 * Sort direction enum
 */
export enum SortDirection {
	ASC = 'ASC',
	DESC = 'DESC',
}

/**
 * User sort options
 */
@InputType()
export class UserSortInput {
	@IsOptional()
	@IsEnum(SortDirection)
	@Field(() => String, { nullable: true, defaultValue: SortDirection.DESC })
	createdAt?: SortDirection;

	@IsOptional()
	@IsEnum(SortDirection)
	@Field(() => String, { nullable: true })
	updatedAt?: SortDirection;

	@IsOptional()
	@IsEnum(SortDirection)
	@Field(() => String, { nullable: true })
	firstName?: SortDirection;

	@IsOptional()
	@IsEnum(SortDirection)
	@Field(() => String, { nullable: true })
	lastName?: SortDirection;
}

/**
 * User filter input for queries
 */
@InputType()
export class UserFilterInput {
	@IsOptional()
	@IsString()
	@Field(() => String, { nullable: true, description: 'Search by name or email' })
	search?: string;

	@IsOptional()
	@IsEnum(UserRole)
	@Field(() => String, { nullable: true })
	role?: UserRole;

	@IsOptional()
	@IsEnum(UserStatus)
	@Field(() => String, { nullable: true })
	status?: UserStatus;

	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true })
	emailVerified?: boolean;

	@IsOptional()
	@IsString()
	@Field(() => String, { nullable: true, description: 'Filter by location city' })
	city?: string;

	@IsOptional()
	@IsString()
	@Field(() => String, { nullable: true, description: 'Filter by location country' })
	country?: string;

	@IsOptional()
	@IsString()
	@Field(() => String, { nullable: true, description: 'Filter by skill' })
	skill?: string;

	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true, defaultValue: false, description: 'Include deleted users' })
	includeDeleted?: boolean;
}

/**
 * Complete user query input with pagination, sorting, and filtering
 */
@InputType()
export class UserQueryInput {
	@IsOptional()
	@Field(() => PaginationInput, { nullable: true })
	pagination?: PaginationInput;

	@IsOptional()
	@Field(() => UserSortInput, { nullable: true })
	sort?: UserSortInput;

	@IsOptional()
	@Field(() => UserFilterInput, { nullable: true })
	filter?: UserFilterInput;
}

/**
 * User ID input for single user queries
 */
@InputType()
export class UserIdInput {
	@IsString()
	@Field(() => String)
	userId: string;
}

/**
 * Bulk user IDs input
 */
@InputType()
export class BulkUserIdsInput {
	@IsString({ each: true })
	@Field(() => [String])
	userIds: string[];
}

/**
 * User search by email input
 */
@InputType()
export class UserEmailInput {
	@IsString()
	@Field(() => String)
	email: string;
}
