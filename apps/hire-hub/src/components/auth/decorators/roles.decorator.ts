import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'apps/hire-hub/src/libs';

/**
 * Roles Decorator
 *
 * This decorator is used to specify which user roles are allowed to access a particular route or resolver method.
 * It works in conjunction with the RolesGuard to enforce role-based access control (RBAC).
 *
 * @param roles - One or more role strings (e.g., 'ADMIN', 'CANDIDATE', 'RECRUITER') that are allowed to access the endpoint
 *
 * @example
 * // Allow only ADMIN role
 * @Roles('ADMIN')
 *
 * @example
 * // Allow both ADMIN and RECRUITER roles
 * @Roles('ADMIN', 'RECRUITER')
 *
 * Usage:
 * 1. Apply this decorator to a resolver method or controller method
 * 2. Apply @UseGuards(RolesGuard) to enforce the role restriction
 * 3. The RolesGuard will read the roles metadata and verify if the authenticated user has any of the required roles
 *
 * How it works:
 * - SetMetadata attaches the roles array to the method's metadata with the key 'roles'
 * - RolesGuard uses NestJS Reflector to retrieve this metadata
 * - If the user's memberType matches any of the roles, access is granted
 * - If no match is found, a ForbiddenException is thrown
 */

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
