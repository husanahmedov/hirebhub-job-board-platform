import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * AuthMember Parameter Decorator
 *
 * This decorator extracts the authenticated member's information from the request and injects it
 * as a parameter in your resolver or controller methods.
 
 *
 * @returns The authenticated member tokens object, a specific property of the member, or null if not authenticated
 */
export const AuthToken = createParamDecorator((data: string, context: ExecutionContext | any) => {
	// Variable to hold the request object
	let request: any;

	// Check if the request is coming from GraphQL context
	if (context.contextType === 'graphql') {
		// For GraphQL, the request object is in the 3rd argument (index 2) of the resolver context
		request = context.getArgByIndex(2).req;

		// Attach the authorization header to authUser for reference
		// This is useful if you need to access the original token later
		if (request.authUser) {
			request.authUser.authorization = request.headers?.authorization;
		}
	} else {
		// For HTTP requests, switch to HTTP context and get the request object
		request = context.switchToHttp().getRequest();
		if (request.authUser) {
			request.authUser.authorization = request.headers?.authorization;
		}
	}

	// Extract the authenticated member from request.body
	// This was previously set by AuthGuard or RolesGuard after token verification
	const bearerToken = request.authUser.authorization;
	// INFO need to extract refreshToken mainly
	const token = bearerToken ? bearerToken.split(' ')[1] : null;
	const refreshToken = bearerToken ? bearerToken.split(' ')[3] : null;

	/**
	 * NOTE - for now we are returning refreshToken coming from AuthHeader
	 * TODO In future, if we need to return accessToken or both tokens, we can modify here
	 */
	if (refreshToken) return refreshToken;
	else return null;
});
