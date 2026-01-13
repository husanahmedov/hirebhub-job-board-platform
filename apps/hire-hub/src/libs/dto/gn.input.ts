import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';

/**
 * PaginationInput - General pagination input type
 * Used across all paginated queries for consistency
 */
@InputType({ description: 'General pagination input' })
export class PaginationInput {
	@Field(() => Int, {
		nullable: true,
		description: 'Page number (starting from 1)',
		defaultValue: 1,
	})
	@IsOptional()
	@IsNumber()
	@Min(1)
	page?: number;

	@Field(() => Int, {
		nullable: true,
		description: 'Number of items per page',
		defaultValue: 20,
	})
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Max(100)
	limit?: number;
}
