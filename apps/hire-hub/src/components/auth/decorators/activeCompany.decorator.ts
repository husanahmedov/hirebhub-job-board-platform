import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../../../libs/enums';

/**
 * ActiveCompany Parameter Decorator
 *
 * This decorator extracts the active company ID from the authenticated user's profile.
 * It should be used in recruiter endpoints to automatically inject the company context.
 *
 * @throws UnauthorizedException if user is not a recruiter or has no active company
 *
 * @example
 * ```typescript
 * @UseGuards(AuthGuard)
 * @Mutation(() => JobOutput)
 * async createJob(
 *   @ActiveCompany() companyId: string,
 *   @Args('input') input: CreateJobInput
 * ) {
 *   // companyId is automatically injected from user.activeCompanyId
 * }
 * ```
 */
export const ActiveCompany = createParamDecorator((data: unknown, context: ExecutionContext | any) => {
	let request: any;

	// Check if the request is coming from GraphQL context
	if (context.contextType === 'graphql') {
		// For GraphQL, the request object is in the 3rd argument (index 2) of the resolver context
		request = context.getArgByIndex(2).req;
	} else {
		// For HTTP requests, get the request object
		request = context.switchToHttp().getRequest();
	}

	const user = request.authUser;

	if (!user) {
		throw new UnauthorizedException('User not authenticated');
	}

	// Check if user is a recruiter
	if (user.role !== UserRole.RECRUITER) {
		throw new UnauthorizedException('Only recruiters can use this endpoint');
	}

	// Check if user has an active company set
	if (!user.activeCompanyId) {
		throw new UnauthorizedException(
			'No active company selected. Please select a company first using the switchActiveCompany mutation.',
		);
	}

	return user.activeCompanyId.toString();
});
