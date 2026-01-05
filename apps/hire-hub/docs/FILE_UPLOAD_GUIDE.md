# File Upload Guide

## Overview

The application uses **local file storage** for handling file uploads. All uploaded files are stored in the `uploads/` directory at the project root.

## Folder Structure

```
uploads/
├── avatars/
│   └── {userId}/
│       └── {uuid}.{ext}
├── resumes/
│   └── {userId}/
│       └── {uuid}.{ext}
└── companies/
    └── {userId}/
        └── {uuid}.{ext}
```

## Endpoints

### 1. Upload Avatar

- **URL**: `POST /uploader/avatar`
- **Auth**: Required (JWT)
- **File Size Limit**: 5MB
- **Allowed Formats**: jpg, jpeg, png, gif, webp
- **Example**:

```bash
curl -X POST http://localhost:3000/uploader/avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@avatar.png"
```

### 2. Upload Resume

- **URL**: `POST /uploader/resume`
- **Auth**: Required (JWT)
- **File Size Limit**: 10MB
- **Allowed Formats**: pdf, docx
- **Example**:

```bash
curl -X POST http://localhost:3000/uploader/resume \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@resume.pdf"
```

### 3. Upload Company Logo

- **URL**: `POST /uploader/company-logo`
- **Auth**: Required (JWT)
- **File Size Limit**: 2MB
- **Allowed Formats**: jpg, jpeg, png, gif, webp
- **Example**:

```bash
curl -X POST http://localhost:3000/uploader/company-logo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@logo.png"
```

## Response Format

```json
{
	"url": "/uploads/avatars/userId/uuid.png",
	"filename": "original-name.png",
	"size": 123456,
	"mimeType": "image/png"
}
```

## Frontend Usage

### React/Next.js Example

```typescript
async function uploadAvatar(file: File) {
	const formData = new FormData();
	formData.append('file', file);

	const response = await fetch('http://localhost:3000/uploader/avatar', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
		},
		body: formData,
	});

	const { url } = await response.json();
	return url;
}
```

### With React Hook

```typescript
import { useState } from 'react';

function useFileUpload(endpoint: string) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`http://localhost:3000/uploader/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return data.url;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error };
}

// Usage
function AvatarUpload() {
  const { upload, uploading } = useFileUpload('avatar');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await upload(file);
      console.log('File uploaded:', url);
    }
  };

  return (
    <input
      type="file"
      onChange={handleFileChange}
      disabled={uploading}
      accept="image/*"
    />
  );
}
```

## Accessing Uploaded Files

Files are served statically at: `http://localhost:3000/uploads/{folder}/{userId}/{filename}`

Example: `http://localhost:3000/uploads/avatars/507f1f77bcf86cd799439011/a1b2c3d4.png`

## File Deletion

Use the `deleteFile()` method in `UploaderService`:

```typescript
await this.uploaderService.deleteFile(fileUrl);
```

## Production Considerations

For production, consider migrating to cloud storage:

- **AWS S3** - Most popular, scalable
- **Google Cloud Storage** - Good integration with GCP
- **Cloudinary** - Built-in image transformations
- **DigitalOcean Spaces** - S3-compatible, cheaper

The current implementation makes it easy to switch to S3 later by just changing the `uploadFile()` method implementation.
