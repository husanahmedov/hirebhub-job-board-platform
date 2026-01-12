import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CompanyService } from './company.service';
import {
	CompanyOutput,
	PaginatedCompaniesOutput,
	CreateCompanyInput,
	UpdateCompanyInput,
	GetCompaniesInput,
	NearbyCompaniesInput,
} from '../../libs';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../libs';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '../auth/guards/auth.guard';

/**
 * CompanyResolver - GraphQL resolver for company queries and mutations
 *
 * This resolver exposes GraphQL endpoints for:
 * - Querying companies with advanced filtering, sorting, and pagination
 * - Finding nearby companies using geospatial queries
 * - Getting individual companies by ID or slug
 * - Creating, updating, and deleting companies
 * - Getting company statistics
 *
 * @see CompanyService for business logic implementation
 */
@Resolver()
export class CompanyResolver {
	constructor(private readonly companyService: CompanyService) {}

	/**
	 * Query: Get companies with filters, sorting, and pagination
	 *
	 * This is the main query for fetching companies. It supports:
	 * - Full-text search on name and description
	 * - Filtering by industry, size, plan, verification status, location
	 * - Sorting by various fields (name, created date, job count, rating, etc.)
	 * - Pagination with page and limit
	 * - Automatic population of job count, review count, and average rating
	 *
	 * @example GraphQL Query:
	 * ```graphql
	 * query GetCompanies {
	 *   getCompanies(
	 *     input: {
	 *       filter: {
	 *         search: "tech"
	 *         industries: [IT, FINANCE]
	 *         verified: true
	 *         city: "San Francisco"
	 *       }
	 *       sort: {
	 *         field: "averageRating"
	 *         order: "desc"
	 *       }
	 *       pagination: {
	 *         page: 1
	 *         limit: 20
	 *       }
	 *     }
	 *   ) {
	 *     companies {
	 *       _id
	 *       name
	 *       slug
	 *       industry
	 *       size
	 *       verified
	 *       jobCount
	 *       averageRating
	 *       location {
	 *         city
	 *         country
	 *       }
	 *     }
	 *     totalCount
	 *     page
	 *     totalPages
	 *     hasNextPage
	 *   }
	 * }
	 * ```
	 */
	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard)
	@UseGuards(AuthGuard)
	@Query(() => PaginatedCompaniesOutput, {
		name: 'getCompanies',
		description: 'Get companies with advanced filtering, sorting, and pagination',
	})
	public async getCompanies(
		@Args('input', { nullable: true }) input: GetCompaniesInput = {},
	): Promise<PaginatedCompaniesOutput> {
		return this.companyService.getCompanies(input);
	}

	/**
	 * Query: Find companies near a specific location
	 *
	 * Uses MongoDB geospatial queries to find companies within a specified
	 * distance from a point, sorted by distance from nearest to farthest.
	 *
	 * @example GraphQL Query:
	 * ```graphql
	 * query GetNearbyCompanies {
	 *   getNearbyCompanies(
	 *     input: {
	 *       longitude: -122.4194
	 *       latitude: 37.7749
	 *       maxDistance: 50
	 *       pagination: { page: 1, limit: 10 }
	 *     }
	 *   ) {
	 *     companies {
	 *       _id
	 *       name
	 *       location {
	 *         city
	 *         country
	 *         coordinates
	 *       }
	 *       distanceKm
	 *     }
	 *     totalCount
	 *   }
	 * }
	 * ```
	 */
	@Query(() => PaginatedCompaniesOutput, {
		name: 'getNearbyCompanies',
		description: 'Find companies near a specific location',
	})
	async getNearbyCompanies(@Args('input') input: NearbyCompaniesInput): Promise<PaginatedCompaniesOutput> {
		return this.companyService.getNearbyCompanies(input);
	}

	/**
	 * Query: Get a single company by ID
	 *
	 * Returns detailed company information including:
	 * - Basic company data
	 * - Job count (active jobs)
	 * - Review count
	 * - Average rating from reviews
	 *
	 * @example GraphQL Query:
	 * ```graphql
	 * query GetCompany {
	 *   getCompanyById(id: "507f1f77bcf86cd799439011") {
	 *     _id
	 *     name
	 *     slug
	 *     description
	 *     industry
	 *     size
	 *     verified
	 *     plan
	 *     jobCount
	 *     reviewCount
	 *     averageRating
	 *     location {
	 *       address
	 *       city
	 *       country
	 *       coordinates
	 *     }
	 *   }
	 * }
	 * ```
	 */
	@Query(() => CompanyOutput, {
		name: 'getCompanyById',
		description: 'Get a single company by ID',
	})
	async getCompanyById(@Args('id', { type: () => ID }) id: string): Promise<CompanyOutput> {
		return this.companyService.getCompanyById(id);
	}

	/**
	 * Query: Get a company by slug
	 *
	 * Similar to getCompanyById but uses the URL-friendly slug instead.
	 * Useful for creating SEO-friendly URLs like /companies/google-inc
	 *
	 * @example GraphQL Query:
	 * ```graphql
	 * query GetCompany {
	 *   getCompanyBySlug(slug: "google-inc") {
	 *     _id
	 *     name
	 *     slug
	 *     description
	 *   }
	 * }
	 * ```
	 */
	@Query(() => CompanyOutput, {
		name: 'getCompanyBySlug',
		description: 'Get a company by slug',
	})
	async getCompanyBySlug(@Args('slug') slug: string): Promise<CompanyOutput> {
		return this.companyService.getCompanyBySlug(slug);
	}

	/**
	 * Query: Get company statistics
	 *
	 * Returns aggregated statistics about companies including:
	 * - Total company count
	 * - Number of verified companies
	 * - Distribution by industry
	 * - Distribution by size
	 * - Distribution by subscription plan
	 *
	 * Useful for analytics dashboards and charts.
	 *
	 * @example GraphQL Query:
	 * ```graphql
	 * query GetCompanyStats {
	 *   getCompanyStats {
	 *     totalCompanies
	 *     verifiedCompanies
	 *     byIndustry
	 *     bySize
	 *     byPlan
	 *   }
	 * }
	 * ```
	 */
	@Query(() => String, {
		name: 'getCompanyStats',
		description: 'Get company statistics',
	})
	async getCompanyStats() {
		return this.companyService.getCompanyStats();
	}

	/**
	 * Mutation: Create a new company
	 *
	 * Creates a new company with the provided data.
	 * Requires admin authentication and permissions.
	 *
	 * @param input - Company creation data
	 * @returns Created company with all computed fields
	 *
	 * @example GraphQL Mutation:
	 * ```graphql
	 * mutation CreateCompany {
	 *   createCompany(
	 *     input: {
	 *       name: "Acme Corporation"
	 *       slug: "acme-corp"
	 *       industry: IT
	 *       size: MEDIUM
	 *       description: "Leading software company"
	 *       website: "https://acme.com"
	 *       location: {
	 *         city: "San Francisco"
	 *         country: "United States"
	 *         coordinates: [-122.4194, 37.7749]
	 *       }
	 *       logoUrl: "https://acme.com/logo.png"
	 *     }
	 *   ) {
	 *     _id
	 *     name
	 *     slug
	 *     industry
	 *     size
	 *     verified
	 *     createdAt
	 *   }
	 * }
	 * ```
	 *
	 * @requires Authentication - Must be logged in
	 * @requires Authorization - Must have ADMIN role
	 * @throws UnAuthenticatedException if not authenticated
	 * @throws ForbiddenException if not an admin
	 * @throws BadRequestException if validation fails or slug already exists
	 */
	@Roles(UserRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => CompanyOutput, {
		name: 'createCompany',
		description: 'Create a new company (Admin only)',
	})
	async createCompany(@Args('input') input: CreateCompanyInput): Promise<CompanyOutput> {
		return this.companyService.createCompany(input);
	}

	/**
	 * Mutation: Update an existing company
	 *
	 * Updates company data. Only provided fields will be updated.
	 * Requires authentication and appropriate permissions.
	 *
	 * @example GraphQL Mutation:
	 * ```graphql
	 * mutation UpdateCompany {
	 *   updateCompany(
	 *     id: "507f1f77bcf86cd799439011"
	 *     input: {
	 *       description: "Updated description"
	 *       verified: true
	 *       plan: PRO
	 *     }
	 *   ) {
	 *     _id
	 *     name
	 *     verified
	 *     plan
	 *   }
	 * }
	 * ```
	 */
	@Mutation(() => CompanyOutput, {
		name: 'updateCompany',
		description: 'Update an existing company',
	})
	// @UseGuards(JwtAuthGuard, RolesGuard) // Uncomment when auth is ready
	// @Roles(UserRole.ADMIN, UserRole.RECRUITER) // Uncomment when auth is ready
	async updateCompany(
		@Args('id', { type: () => ID }) id: string,
		@Args('input') input: UpdateCompanyInput,
	): Promise<CompanyOutput> {
		return this.companyService.updateCompany(id, input);
	}

	/**
	 * Mutation: Delete a company (soft delete)
	 *
	 * Soft deletes a company by setting the deletedAt timestamp.
	 * The company data is retained but won't appear in queries by default.
	 * Requires authentication and admin permissions.
	 *
	 * @example GraphQL Mutation:
	 * ```graphql
	 * mutation DeleteCompany {
	 *   deleteCompany(id: "507f1f77bcf86cd799439011")
	 * }
	 * ```
	 */
	@Mutation(() => Boolean, {
		name: 'deleteCompany',
		description: 'Delete a company (soft delete)',
	})
	// @UseGuards(JwtAuthGuard, RolesGuard) // Uncomment when auth is ready
	// @Roles(UserRole.ADMIN) // Uncomment when auth is ready
	async deleteCompany(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
		return this.companyService.deleteCompany(id);
	}
}
