import { registerEnumType } from '@nestjs/graphql';

export enum ViewGroup {
	USER = 'USER',
	ARTICLE = 'ARTICLE',
	JOB = 'JOB',
}
registerEnumType(ViewGroup, {
	name: 'ViewGroup',
});
