import { registerEnumType } from '@nestjs/graphql';

export enum ResumeFileType {
	PDF = 'PDF',
	DOC = 'DOC',
	DOCX = 'DOCX',
	TXT = 'TXT',
}

registerEnumType(ResumeFileType, {
	name: 'ResumeFileType',
	description: 'Supported file types for resumes',
});