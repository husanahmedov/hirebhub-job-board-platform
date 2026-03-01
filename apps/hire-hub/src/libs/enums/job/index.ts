import { registerEnumType } from '@nestjs/graphql';

export enum JobType {
	FULL_TIME = 'FULL_TIME',
	PART_TIME = 'PART_TIME',
	CONTRACT = 'CONTRACT',
	TEMPORARY = 'TEMPORARY',
	INTERNSHIP = 'INTERNSHIP',
	VOLUNTEER = 'VOLUNTEER',
	FREELANCE = 'FREELANCE',
	REMOTE = 'REMOTE',
	OTHER = 'OTHER',
}

export enum JobProfession {
	ENGINEERING = 'ENGINEERING',
	DESIGN = 'DESIGN',
	MARKETING = 'MARKETING',
	SALES = 'SALES',
	HR = 'HR',
	FINANCE = 'FINANCE',
	OPERATIONS = 'OPERATIONS',
	PRODUCT = 'PRODUCT',
	WRITING = 'WRITING',
	OTHER = 'OTHER',
}

export enum JobLevel {
	ENTRY = 'ENTRY',
	MIDDLE = 'MIDDLE',
	SENIOR = 'SENIOR',
	MANAGER = 'MANAGER',
	DIRECTOR = 'DIRECTOR',
	LEAD = 'LEAD',
	INTERN = 'INTERN',
	OTHER = 'OTHER',
}

export enum SalaryCurrency {
	USD = 'USD',
	EUR = 'EUR',
	GBP = 'GBP',
	INR = 'INR',
	AUD = 'AUD',
	CAD = 'CAD',
	SGD = 'SGD',
	JPY = 'JPY',
	CNY = 'CNY',
	KRW = 'KRW',
	SUM = 'SUM',
	OTHER = 'OTHER',
}

export enum Visibility {
	PUBLIC = 'PUBLIC',
	PRIVATE = 'PRIVATE',
	UNLISTED = 'UNLISTED',
}

registerEnumType(JobType, {
	name: 'JobType',
	description: 'Types of job positions',
});

registerEnumType(JobLevel, {
	name: 'JobLevel',
	description: 'Seniority levels for job positions',
});

registerEnumType(SalaryCurrency, {
	name: 'SalaryCurrency',
	description: 'Currencies for salary',
});

registerEnumType(Visibility, {
	name: 'Visibility',
	description: 'Visibility levels for job postings',
});

registerEnumType(JobProfession, {
	name: 'JobProfession',
	description: 'Professional categories for job positions',
});