import { registerEnumType } from '@nestjs/graphql';

export enum CompanyIndustry {
	IT = 'IT',
	FINANCE = 'FINANCE',
	EDUCATION = 'EDUCATION',
	HEALTHCARE = 'HEALTHCARE',
	MANUFACTURING = 'MANUFACTURING',
	RETAIL = 'RETAIL',
	HOSPITALITY = 'HOSPITALITY',
	CONSTRUCTION = 'CONSTRUCTION',
	TRANSPORTATION = 'TRANSPORTATION',
	OTHER = 'OTHER',
}

export enum CompanySize {
	SOLO = 'SOLO', // 1 employee
	SMALL = 'SMALL', // 1-50 employees
	MEDIUM = 'MEDIUM', // 51-500 employees
	LARGE = 'LARGE', // 501-10000 employees
	ENTERPRISE = 'ENTERPRISE', // 10000+ employees
}

export enum CompanyPlan {
	FREE = 'FREE',
	PRO = 'PRO',
	ENTERPRISE = 'ENTERPRISE',
}

registerEnumType(CompanyIndustry, {
	name: 'CompanyIndustry',
	description: 'Industries that a company can belong to',
});

registerEnumType(CompanySize, {
	name: 'CompanySize',
	description: 'Sizes of companies based on number of employees',
});

registerEnumType(CompanyPlan, {
	name: 'CompanyPlan',
	description: 'Subscription plans for companies',
});
