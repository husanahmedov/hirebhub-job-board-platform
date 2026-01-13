import { registerEnumType } from '@nestjs/graphql';

/**
 * SortOrder - Enum for sort direction
 */
export enum SortOrder {
	ASC = 'asc',
	DESC = 'desc',
}

registerEnumType(SortOrder, {
	name: 'SortOrder',
	description: 'Sort order (ascending or descending)',
});
