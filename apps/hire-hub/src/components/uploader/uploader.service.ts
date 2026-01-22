import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import * as path from 'path';

@Injectable()
export class UploaderService {
	constructor() {}

	/**
	 * Upload file to local storage
	 * @param file - The file to upload
	 * @param folder - The folder name (e.g., 'avatars', 'resumes', 'companies')
	 * @param type - The type of file ('image' or 'document')
	 * @returns The public URL path to access the file
	 */
	async uploadFile(file: Express.Multer.File, folder: string, type: 'image' | 'document'): Promise<string> {
		// Create uploads directory structure
		const uploadDir = path.join(process.cwd(), 'uploads', folder);
		await fs.mkdir(uploadDir, { recursive: true });

		// Generate unique filename
		const fileExtension = file.originalname.split('.').pop();
		const fileName = `${uuidv4()}.${fileExtension}`;
		const filePath = path.join(uploadDir, fileName);

		// Save file to disk
		await fs.writeFile(filePath, file.buffer);

		// Return public URL path
		return `/uploads/${folder}/${fileName}`;
	}

	async uploadFiles(files: Express.Multer.File[], folder: string, type: 'image' | 'document'): Promise<string[]> {
		const uploadPromises = files.map((file) => this.uploadFile(file, folder, type));
		return Promise.all(uploadPromises);
	}

	/**
	 * Delete file from local storage
	 * @param fileUrl - The URL path of the file to delete
	 */
	async deleteFile(fileUrl: string): Promise<void> {
		try {
			// Remove leading slash and construct file path
			const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
			const filePath = path.join(process.cwd(), relativePath);

			// Delete file
			await fs.unlink(filePath);
		} catch (error) {
			console.error('Error deleting file:', error);
			// Don't throw error if file doesn't exist
		}
	}
}
