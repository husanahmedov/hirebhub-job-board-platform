import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UnAuthenticatedException, User } from '../../../libs';
import { CheckUserStatus } from '../../../libs/check-user-status';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		private authService: AuthService,
	) {}

	async canActivate(context: ExecutionContext | any): Promise<boolean> {
		let request;

		if (context.contextType === 'graphql') {
			request = context.getArgByIndex(2).req;
		} else if (context.contextType === 'http') {
			request = context.switchToHttp().getRequest();
		} else {
			return false;
		}

		// Common auth logic for both
		const bearerToken = request.headers.authorization;
		if (!bearerToken) {
			throw context.contextType === 'graphql'
				? new UnAuthenticatedException('You are not authenticated. Please go to the login page.')
				: new HttpException('You are not authenticated. Please go to the login page.', 401);
		}

		const token = bearerToken.split(' ')[1];
		const authUser = await this.authService.verifyToken(token);

		if (!authUser) {
			throw context.contextType === 'graphql'
				? new UnAuthenticatedException('You are not authenticated. Please go to the login page.')
				: new Error('Your session has expired. Please log in again.');
		}

		CheckUserStatus.displayUserDetails(authUser);

		// ✅ Consistent for both contexts
		request.authUser = authUser;

		return true;
	}
}
