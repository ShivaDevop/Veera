import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { SubmitSubmissionDto } from './dto/submit-submission.dto';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestWithRole } from '../common/interfaces/request-with-role.interface';
import { ConfigService } from '@nestjs/config';

@ApiTags('submissions')
@ApiBearerAuth('JWT-auth')
@Controller('submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  private readonly maxFileSize: number;

  constructor(
    private readonly submissionsService: SubmissionsService,
    private configService: ConfigService,
  ) {
    this.maxFileSize = this.configService.get<number>('storage.limits.maxFileSize') || 104857600;
  }

  @Post('draft')
  @Roles('Student')
  @ApiOperation({ summary: 'Create a draft submission (Student only)' })
  @ApiResponse({ status: 201, description: 'Draft submission created successfully' })
  @ApiResponse({ status: 400, description: 'Draft already exists' })
  @ApiResponse({ status: 404, description: 'Project or assignment not found' })
  createDraft(@Body() createDto: CreateSubmissionDto, @Request() req: RequestWithRole) {
    return this.submissionsService.createDraft(createDto, req.user.id);
  }

  @Get('my-submissions')
  @Roles('Student')
  @ApiOperation({ summary: 'Get all my submissions (Student only)' })
  @ApiResponse({ status: 200, description: 'List of submissions' })
  getMySubmissions(
    @Request() req: RequestWithRole,
    @Param('projectId') projectId?: string,
  ) {
    return this.submissionsService.getMySubmissions(req.user.id, projectId);
  }

  @Get(':id')
  @Roles('Student')
  @ApiOperation({ summary: 'Get submission by ID with media access URLs (Student only)' })
  @ApiResponse({ status: 200, description: 'Submission found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not your submission' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  getMySubmission(@Param('id') id: string, @Request() req: RequestWithRole) {
    return this.submissionsService.getMySubmission(id, req.user.id);
  }

  @Patch(':id')
  @Roles('Student')
  @ApiOperation({ summary: 'Update draft submission (Student only)' })
  @ApiResponse({ status: 200, description: 'Draft updated successfully' })
  @ApiResponse({ status: 400, description: 'Only draft submissions can be updated' })
  updateDraft(
    @Param('id') id: string,
    @Body() updateDto: UpdateSubmissionDto,
    @Request() req: RequestWithRole,
  ) {
    return this.submissionsService.updateDraft(id, updateDto, req.user.id);
  }

  @Post(':id/submit')
  @Roles('Student')
  @ApiOperation({ summary: 'Submit draft submission (Student only)' })
  @ApiResponse({ status: 200, description: 'Submission submitted successfully' })
  @ApiResponse({ status: 400, description: 'Only draft submissions can be submitted' })
  submit(
    @Param('id') id: string,
    @Body() submitDto: SubmitSubmissionDto,
    @Request() req: RequestWithRole,
  ) {
    return this.submissionsService.submit(id, submitDto, req.user.id);
  }

  @Delete(':id')
  @Roles('Student')
  @ApiOperation({ summary: 'Delete draft submission (Student only)' })
  @ApiResponse({ status: 200, description: 'Draft deleted successfully' })
  @ApiResponse({ status: 400, description: 'Only draft submissions can be deleted' })
  deleteDraft(@Param('id') id: string, @Request() req: RequestWithRole) {
    return this.submissionsService.deleteDraft(id, req.user.id);
  }

  @Post(':id/media/upload')
  @Roles('Student')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload media file to submission (Student only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Media uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or only draft submissions can have media' })
  uploadMedia(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: this.maxFileSize }),
          new FileTypeValidator({
            fileType: /(image|video|application|text)\/.*/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Request() req: RequestWithRole,
  ) {
    return this.submissionsService.uploadMedia(id, file, req.user.id);
  }

  @Post(':id/media/upload-url')
  @Roles('Student')
  @ApiOperation({ summary: 'Generate secure upload URL for direct client upload (Student only)' })
  @ApiResponse({ status: 200, description: 'Upload URL generated successfully' })
  generateUploadUrl(
    @Param('id') id: string,
    @Body() generateDto: GenerateUploadUrlDto,
    @Request() req: RequestWithRole,
  ) {
    return this.submissionsService.generateUploadUrl(
      id,
      generateDto.fileName,
      generateDto.mimeType,
      req.user.id,
    );
  }

  @Delete('media/:mediaId')
  @Roles('Student')
  @ApiOperation({ summary: 'Delete media file from submission (Student only)' })
  @ApiResponse({ status: 200, description: 'Media deleted successfully' })
  @ApiResponse({ status: 400, description: 'Media can only be deleted from draft submissions' })
  deleteMedia(@Param('mediaId') mediaId: string, @Request() req: RequestWithRole) {
    return this.submissionsService.deleteMedia(mediaId, req.user.id);
  }
}

