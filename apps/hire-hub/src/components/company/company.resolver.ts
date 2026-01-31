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
import { AuthUser } from '../auth/decorators/authUser.decorator';
import type { ObjectId } from 'mongoose';

/***
 * FEATURE: COMPANY OPERATIONS
 ***/
@Resolver()
export class CompanyResolver {
	constructor(private readonly companyService: CompanyService) {}

	/***
	 * API: GET COMPANIES
	 ***/
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

	/***
	 * API: GET NEARBY COMPANIES
	 ***/
	@Query(() => PaginatedCompaniesOutput, {
		name: 'getNearbyCompanies',
		description: 'Find companies near a specific location',
	})
	async getNearbyCompanies(@Args('input') input: NearbyCompaniesInput): Promise<PaginatedCompaniesOutput> {
		return this.companyService.getNearbyCompanies(input);
	}

	/***
	 * API: GET COMPANY BY ID
	 ***/
	@Query(() => CompanyOutput, {
		name: 'getCompanyById',
		description: 'Get a single company by ID',
	})
	async getCompanyById(@Args('id', { type: () => ID }) id: string): Promise<CompanyOutput> {
		return this.companyService.getCompanyById(id);
	}

	/***
	 * API: GET COMPANY STATS
	 ***/
	@Query(() => String, {
		name: 'getCompanyStats',
		description: 'Get company statistics',
	})
	async getCompanyStats() {
		return this.companyService.getCompanyStats();
	}

	/***
	 * CRITICAL: CREATE COMPANY
	 ***/
	@Roles(UserRole.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => CompanyOutput, {
		name: 'createCompany',
		description: 'Create a new company (Admin only)',
	})
	async createCompany(@Args('input') input: CreateCompanyInput): Promise<CompanyOutput> {
		return this.companyService.createCompany(input);
	}

	/***
	 * FEATURE: UPDATE COMPANY
	 ***/
	@Mutation(() => CompanyOutput, {
		name: 'updateCompany',
		description: 'Update an existing company',
	})
	@Roles(UserRole.ADMIN, UserRole.COMPANY_OWNER) // Uncomment when auth is ready
	@UseGuards(RolesGuard) // Uncomment when auth is ready
	async updateCompany(
		@Args('id', { type: () => ID }) id: string,
		@Args('input') input: UpdateCompanyInput,
		@AuthUser('_id') userId: ObjectId,
	): Promise<CompanyOutput> {
		return this.companyService.updateCompany(id, userId, input);
	}

	/***
	 * CRITICAL: DELETE COMPANY
	 ***/
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
