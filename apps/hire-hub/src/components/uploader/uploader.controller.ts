import {
	Controller,
	Post,
	UseInterceptors,
	UploadedFile,
	UploadedFiles,
	UseGuards,
	BadRequestException,
} from '@nestjs/common';

import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthUser } from '../auth/decorators/authUser.decorator';
import { UploaderService } from './uploader.service';
import { InvalidFileFormatException, User } from '../../libs';

@Controller('uploader')
@UseGuards(AuthGuard)
export class UploaderController {
	constructor(private readonly uploadService: UploaderService) {}

	@Post('avatar')
	@UseInterceptors(
		FileInterceptor('file', {
			limits: { fileSize: 5 * 1024 * 1024 },
		}),
	)
	async uploadAvatar(@UploadedFile() file: Express.Multer.File, @AuthUser() user: User) {
		console.log(`--- file upload request received (${user}) ---`);
		if (!file) {
			throw new InvalidFileFormatException('No file uploaded');
		}
		if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
			throw new InvalidFileFormatException('Only image files (JPG, JPEG, PNG, GIF, WEBP) are allowed');
		}
		const url = await this.uploadService.uploadFile(file, `avatars/${user._id}`, 'image');
		return {
			url,
			filename: file.originalname,
			size: file.size,
			mimeType: file.mimetype,
		};
	}

	@Post('resume')
	@UseInterceptors(
		FileInterceptor('file', {
			limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for resumes
		}),
	)
	public async uploadResume(@UploadedFile() file: Express.Multer.File, @AuthUser() user: User) {
		if (!file) {
			throw new InvalidFileFormatException('No file uploaded');
		}
		if (
			!file.mimetype.match(
				/^(application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/,
			)
		) {
			throw new InvalidFileFormatException('Only PDF and DOCX files are allowed');
		}
		const url = await this.uploadService.uploadFile(file, `resumes/${user._id}`, 'document');

		return {
			url,
			filename: file.originalname,
			size: file.size,
		};
	}

	@Post('company-logo')
	@UseInterceptors(
		FileInterceptor('file', {
			limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
		}),
	)
	async uploadCompanyLogo(@UploadedFile() file: Express.Multer.File, @AuthUser() user: User) {
		if (!file) {
			throw new InvalidFileFormatException('No file uploaded');
		}
		if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
			throw new InvalidFileFormatException('Only image files (JPG, JPEG, PNG, GIF, WEBP) are allowed');
		}
		// Verify user has company permissions
		const url = await this.uploadService.uploadFile(file, `companies/${user._id}`, 'image');
		return { url };
	}

	@Post('job-images')
	@UseInterceptors(
		FilesInterceptor('files', 10, {
			limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
		}),
	)
	async uploadJobImages(@UploadedFiles() files: Express.Multer.File[], @AuthUser() user: User) {
		if (!files || files.length === 0) {
			throw new InvalidFileFormatException('No files uploaded');
		}
		for (const file of files) {
			if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
				throw new InvalidFileFormatException('Only image files (JPG, JPEG, PNG, GIF, WEBP) are allowed');
			}
		}
		// Verify user has company/recruiter permissions
		const url = await this.uploadService.uploadFiles(files, `jobs/${user._id}`, 'image');
		return { url };
	}
}
