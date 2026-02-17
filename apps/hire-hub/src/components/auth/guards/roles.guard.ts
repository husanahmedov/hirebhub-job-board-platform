import { BadRequestException, CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { UnauthorizedException, UserRole } from '../../../libs';

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private authService: AuthService,
	) {}

	async canActivate(context: ExecutionContext | any): Promise<boolean> {
		const roles = this.reflector.get<string[]>('roles', context.getHandler());
		if (!roles) return true;

		console.info(`--- @guard() Authentication [RolesGuard]: ${roles} ---`);
		if (context.contextType === 'graphql') {
			const request = context.getArgByIndex(2).req;
			const bearerToken = request.headers.authorization;
			if (!bearerToken)
				throw new UnauthorizedException(
			`You are not authorized to perform this action. Please first have proper access rights`,
		);
		
		const token = bearerToken.split(' ')[1],
		authUser = await this.authService.verifyToken(token);
			const hasRole = () => roles.indexOf(authUser.role) > -1;
			const hasPermission: boolean = hasRole();
			if (!authUser || !hasPermission)
				throw new UnauthorizedException(
					`You are not authorized to perform this action. Please first have proper access rights`,
				);

			console.log('userFullName[roles] =>', authUser.fullName + `---${authUser.role}---`);
			request.authUser = authUser;
			return true;
		}
		return false;

		// description => http, rpc, gprs and etc are ignored
	}
}
