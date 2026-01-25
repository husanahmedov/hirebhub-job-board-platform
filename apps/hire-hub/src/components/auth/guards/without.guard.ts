import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { CheckUserStatus } from 'apps/hire-hub/src/libs/check-user-status';

@Injectable()
export class WithoutGuard implements CanActivate {
	constructor(private authService: AuthService) {}

	async canActivate(context: ExecutionContext | any): Promise<boolean> {
		console.info('--- @guard() Authentication [WithoutGuard] ---');

		if (context.contextType === 'graphql') {
			const request = context.getArgByIndex(2).req,
				bearerToken = request.headers.authorization;

			if (bearerToken) {
				try {
					const token = bearerToken.split(' ')[1],
						authUser = await this.authService.verifyToken(token);
					CheckUserStatus.displayUserDetails(authUser);
					request.authUser = authUser;
				} catch (err) {
					request.authUser = null;
				}
			} else request.authUser = null;

			console.log('User Email[without] =>', request.authUser?.email ?? 'none');
			return true;
		}
		return false;

		// description => http, rpc, gprs and etc are ignored
	}
}
