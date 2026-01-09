import { registerAs } from '@nestjs/config';

export const storageConfig = registerAs('storage', () => ({
  azure: {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
    containerName: process.env.AZURE_STORAGE_CONTAINER || 'submissions',
    sasTokenExpiry: parseInt(process.env.AZURE_SAS_TOKEN_EXPIRY || '3600', 10), // Default 1 hour
  },
  limits: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // Default 100MB in bytes
    maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE || '10485760', 10), // Default 10MB
    maxVideoSize: parseInt(process.env.MAX_VIDEO_SIZE || '104857600', 10), // Default 100MB
    maxDocumentSize: parseInt(process.env.MAX_DOCUMENT_SIZE || '10485760', 10), // Default 10MB
  },
  allowedMimeTypes: {
    image: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
    video: [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
    ],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
    ],
  },
}));

