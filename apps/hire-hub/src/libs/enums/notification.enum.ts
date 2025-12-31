import { registerEnumType } from '@nestjs/graphql';

export enum NotificationType {
	APPLICATION_SUBMITTED = 'APPLICATION_SUBMITTED',
	APPLICATION_STATUS_UPDATED = 'APPLICATION_STATUS_UPDATED',
	NEW_JOB_POSTED = 'NEW_JOB_POSTED',
	COMPANY_ANNOUNCEMENT = 'COMPANY_ANNOUNCEMENT',
	MESSAGE = 'MESSAGE',
	SYSTEM = 'SYSTEM',
}

registerEnumType(NotificationType, {
	name: 'NotificationType',
	description: 'Types of notifications that can be sent to users',
});

export enum NotificationChannel {
	EMAIL = 'EMAIL',
	SMS = 'SMS',
	IN_APP = 'IN_APP',
	PUSH = 'PUSH',
}

registerEnumType(NotificationChannel, {
	name: 'NotificationChannel',
	description: 'Channels through which notifications can be sent',
});

export enum NotificationPriority {
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	HIGH = 'HIGH',
	URGENT = 'URGENT',
}

registerEnumType(NotificationPriority, {
	name: 'NotificationPriority',
	description: 'Priority levels for notifications',
});
