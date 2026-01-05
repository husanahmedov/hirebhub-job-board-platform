import { registerEnumType } from '@nestjs/graphql';

export enum ApplicationStatus {
	PENDING = 'PENDING',
	REVIEWED = 'REVIEWED',
	SHORTLISTED = 'SHORTLISTED',
	INTERVIEW = 'INTERVIEW',
	OFFERED = 'OFFERED',
	REJECTED = 'REJECTED',
	HIRED = 'HIRED',
	WITHDRAWN = 'WITHDRAWN',
}

export enum ApplicationSource {
	PLATFORM = 'PLATFORM',
	REFERRAL = 'REFERRAL',
	AGENCY = 'AGENCY',
	DIRECT = 'DIRECT',
	EXTERNAL = 'EXTERNAL',
}

registerEnumType(ApplicationStatus, {
	name: 'ApplicationStatus',
	description: 'Statuses of a job application',
});

registerEnumType(ApplicationSource, {
	name: 'ApplicationSource',
	description: 'Sources from which a job application can come',
});
