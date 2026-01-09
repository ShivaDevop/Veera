import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient, BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } from '@azure/storage-blob';
import { PrismaService } from '../database/prisma.service';

export interface FileUploadResult {
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  blobPath: string;
  blobContainer: string;
  mediaType: 'image' | 'video' | 'document';
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private blobServiceClient: BlobServiceClient;
  private containerName: string;
  private connectionString: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.connectionString = this.configService.get<string>('storage.azure.connectionString');
    this.containerName = this.configService.get<string>('storage.azure.containerName') || 'submissions';

    if (!this.connectionString) {
      this.logger.warn('Azure Storage connection string not configured');
    } else {
      try {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(this.connectionString);
        this.ensureContainerExists();
      } catch (error) {
        this.logger.error('Failed to initialize Azure Blob Storage client', error);
      }
    }
  }

  private async ensureContainerExists() {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      await containerClient.createIfNotExists({
        access: 'private',
      });
    } catch (error) {
      this.logger.error('Failed to ensure container exists', error);
    }
  }

  validateFile(file: Express.Multer.File): { mediaType: 'image' | 'video' | 'document' } {
    const config = this.configService.get('storage');
    const allowedTypes = config.allowedMimeTypes;
    const limits = config.limits;

    // Check file size
    if (file.size > limits.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${limits.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Determine media type and validate
    let mediaType: 'image' | 'video' | 'document';
    if (allowedTypes.image.includes(file.mimetype)) {
      mediaType = 'image';
      if (file.size > limits.maxImageSize) {
        throw new BadRequestException(
          `Image size exceeds maximum allowed size of ${limits.maxImageSize / 1024 / 1024}MB`,
        );
      }
    } else if (allowedTypes.video.includes(file.mimetype)) {
      mediaType = 'video';
      if (file.size > limits.maxVideoSize) {
        throw new BadRequestException(
          `Video size exceeds maximum allowed size of ${limits.maxVideoSize / 1024 / 1024}MB`,
        );
      }
    } else if (allowedTypes.document.includes(file.mimetype)) {
      mediaType = 'document';
      if (file.size > limits.maxDocumentSize) {
        throw new BadRequestException(
          `Document size exceeds maximum allowed size of ${limits.maxDocumentSize / 1024 / 1024}MB`,
        );
      }
    } else {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: images, videos, documents`,
      );
    }

    return { mediaType };
  }

  async uploadFile(
    file: Express.Multer.File,
    submissionId: string,
  ): Promise<FileUploadResult> {
    if (!this.blobServiceClient) {
      throw new InternalServerErrorException('Azure Blob Storage is not configured');
    }

    const { mediaType } = this.validateFile(file);

    // Generate unique file name
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${submissionId}/${timestamp}-${randomString}.${fileExtension}`;

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(fileName);

      // Upload file
      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: {
          blobContentType: file.mimetype,
        },
      });

      // Save media record to database
      const media = await this.prisma.submissionMedia.create({
        data: {
          submissionId,
          fileName,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          blobPath: fileName,
          blobContainer: this.containerName,
          mediaType,
        },
      });

      return {
        fileName: media.fileName,
        originalName: media.originalName,
        mimeType: media.mimeType,
        fileSize: media.fileSize,
        blobPath: media.blobPath,
        blobContainer: media.blobContainer,
        mediaType: media.mediaType as 'image' | 'video' | 'document',
      };
    } catch (error) {
      this.logger.error('Failed to upload file to Azure Blob Storage', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  async generateUploadUrl(
    submissionId: string,
    fileName: string,
    mimeType: string,
  ): Promise<{ uploadUrl: string; blobPath: string }> {
    if (!this.blobServiceClient) {
      throw new InternalServerErrorException('Azure Blob Storage is not configured');
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = fileName.split('.').pop();
    const blobPath = `${submissionId}/${timestamp}-${randomString}.${fileExtension}`;

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

      // Generate SAS token for upload (write permission, 1 hour expiry)
      const sasExpiry = new Date();
      sasExpiry.setHours(sasExpiry.getHours() + 1);

      const sasToken = generateBlobSASQueryParameters(
        {
          containerName: this.containerName,
          blobName: blobPath,
          permissions: BlobSASPermissions.parse('w'), // Write only
          startsOn: new Date(),
          expiresOn: sasExpiry,
        },
        this.blobServiceClient.credential as StorageSharedKeyCredential,
      ).toString();

      const uploadUrl = `${blockBlobClient.url}?${sasToken}`;

      return { uploadUrl, blobPath };
    } catch (error) {
      this.logger.error('Failed to generate upload URL', error);
      throw new InternalServerErrorException('Failed to generate upload URL');
    }
  }

  async generateAccessUrl(
    blobPath: string,
    expiryMinutes: number = 60,
  ): Promise<string> {
    if (!this.blobServiceClient) {
      throw new InternalServerErrorException('Azure Blob Storage is not configured');
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

      // Generate SAS token for read access
      const sasExpiry = new Date();
      sasExpiry.setMinutes(sasExpiry.getMinutes() + expiryMinutes);

      // Get account name and key from connection string
      const accountName = this.connectionString.match(/AccountName=([^;]+)/)?.[1];
      const accountKey = this.connectionString.match(/AccountKey=([^;]+)/)?.[1];

      if (!accountName || !accountKey) {
        throw new InternalServerErrorException('Invalid Azure Storage connection string');
      }

      const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

      const sasToken = generateBlobSASQueryParameters(
        {
          containerName: this.containerName,
          blobName: blobPath,
          permissions: BlobSASPermissions.parse('r'), // Read only
          startsOn: new Date(),
          expiresOn: sasExpiry,
        },
        sharedKeyCredential,
      ).toString();

      return `${blockBlobClient.url}?${sasToken}`;
    } catch (error) {
      this.logger.error('Failed to generate access URL', error);
      throw new InternalServerErrorException('Failed to generate access URL');
    }
  }

  async deleteFile(mediaId: string): Promise<void> {
    const media = await this.prisma.submissionMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new BadRequestException('Media file not found');
    }

    try {
      if (this.blobServiceClient) {
        const containerClient = this.blobServiceClient.getContainerClient(media.blobContainer);
        const blockBlobClient = containerClient.getBlockBlobClient(media.blobPath);
        await blockBlobClient.delete();
      }

      await this.prisma.submissionMedia.delete({
        where: { id: mediaId },
      });
    } catch (error) {
      this.logger.error('Failed to delete file', error);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  async getSubmissionMedia(submissionId: string) {
    return this.prisma.submissionMedia.findMany({
      where: { submissionId },
      orderBy: { uploadedAt: 'desc' },
    });
  }
}

