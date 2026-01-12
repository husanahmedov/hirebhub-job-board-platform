import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, BadRequestException } from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
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
			fileFilter: (request, file, cb) => {
				if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
					return cb(new InvalidFileFormatException('Only image files are allowed'), false);
				}
				cb(null, true);
			},
		}),
	)
	async uploadAvatar(@UploadedFile() file: Express.Multer.File, @AuthUser() user: User) {
        console.log(`--- file upload request received (${user}) ---`);
		if (!file) {
			throw new InvalidFileFormatException(
				'You have chosen invalid file type. Please double check you file type anb retry to upload proces',
			);
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
			fileFilter: (request, file, cb) => {
				if (
					!file.mimetype.match(
						/^(application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/,
					)
				) {
					return cb(new InvalidFileFormatException('Only PDF and DOCX files are allowed'), false);
				}
				cb(null, true);
			},
		}),
	)
	public async uploadResume(@UploadedFile() file: Express.Multer.File, @AuthUser() user: User) {
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
		// Verify user has company permissions
		const url = await this.uploadService.uploadFile(file, `companies/${user._id}`, 'image');
		return { url };
	}
}
