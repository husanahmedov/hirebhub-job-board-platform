import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * AuthMember Parameter Decorator
 *
 * This decorator extracts the authenticated member's information from the request and injects it
 * as a parameter in your resolver or controller methods.
 *
 * @param data - Optional property name to extract specific field from the member object (e.g., '_id', 'memberNick')
 * @param context - The execution context containing request information
 *
 * @returns The authenticated member object, a specific property of the member, or null if not authenticated
 */
export const AuthUser = createParamDecorator((data: string, context: ExecutionContext | any) => {
	// Variable to hold the request object
	let request: any;

	// Check if the request is coming from GraphQL context
	if (context.contextType === 'graphql') {
		// For GraphQL, the request object is in the 3rd argument (index 2) of the resolver context
		request = context.getArgByIndex(2).req;

		// Attach the authorization header to authMember for reference
		// This is useful if you need to access the original token later
		if (request.autUser) {
			request.authUser.authorization = request.headers?.authorization;
		}
	} else {
		// For HTTP requests, switch to HTTP context and get the request object
		request = context.switchToHttp().getRequest();
		if (request.autUser) {
			request.authUser.authorization = request.headers?.authorization;
		}
	}

	// Extract the authenticated member from request.body
	// This was previously set by AuthGuard or RolesGuard after token verification
	const user = request.authUser;

	// Return logic:
	// - If member exists and data parameter is provided, return specific property (e.g., member['_id'])
	// - If member exists and no data parameter, return the entire member object
	// - If no member exists, return null
	if (user) return data ? user?.[data] : user;
	else return null;
});
