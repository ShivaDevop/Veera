import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { ApproveSubmissionDto } from './dto/approve-submission.dto';
import { RejectSubmissionDto } from './dto/reject-submission.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestWithRole } from '../common/interfaces/request-with-role.interface';

@ApiTags('reviews')
@ApiBearerAuth('JWT-auth')
@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('submissions')
  @Roles('Teacher', 'SchoolAdmin', 'PlatformAdmin')
  @ApiOperation({ summary: 'Get submissions for review (Teacher, SchoolAdmin, PlatformAdmin)' })
  @ApiResponse({ status: 200, description: 'List of submissions' })
  getSubmissionsForReview(
    @Request() req: RequestWithRole,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.reviewsService.getSubmissionsForReview(req.user.id, status, projectId);
  }

  @Get('submissions/:id')
  @Roles('Teacher', 'SchoolAdmin', 'PlatformAdmin')
  @ApiOperation({ summary: 'Get submission details for review (Teacher, SchoolAdmin, PlatformAdmin)' })
  @ApiResponse({ status: 200, description: 'Submission found' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  getSubmissionForReview(@Param('id') id: string, @Request() req: RequestWithRole) {
    return this.reviewsService.getSubmissionForReview(id, req.user.id);
  }

  @Post('submissions/:id/approve')
  @Roles('Teacher', 'SchoolAdmin', 'PlatformAdmin')
  @ApiOperation({
    summary: 'Approve submission and generate skills (Teacher, SchoolAdmin, PlatformAdmin)',
    description: 'Approves the submission and automatically generates skills from project template. Uses database transaction for atomicity.',
  })
  @ApiResponse({ status: 200, description: 'Submission approved and skills generated' })
  @ApiResponse({ status: 400, description: 'Invalid submission status' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  @ApiResponse({ status: 500, description: 'Transaction failed - all changes rolled back' })
  approveSubmission(
    @Param('id') id: string,
    @Body() approveDto: ApproveSubmissionDto,
    @Request() req: RequestWithRole,
  ) {
    return this.reviewsService.approveSubmission(id, approveDto, req.user.id);
  }

  @Post('submissions/:id/reject')
  @Roles('Teacher', 'SchoolAdmin', 'PlatformAdmin')
  @ApiOperation({
    summary: 'Reject submission (Teacher, SchoolAdmin, PlatformAdmin)',
    description: 'Rejects the submission. Comment is mandatory. Uses database transaction.',
  })
  @ApiResponse({ status: 200, description: 'Submission rejected' })
  @ApiResponse({ status: 400, description: 'Invalid submission status or missing comment' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  @ApiResponse({ status: 500, description: 'Transaction failed - all changes rolled back' })
  rejectSubmission(
    @Param('id') id: string,
    @Body() rejectDto: RejectSubmissionDto,
    @Request() req: RequestWithRole,
  ) {
    return this.reviewsService.rejectSubmission(id, rejectDto, req.user.id);
  }

  @Patch('submissions/:id/comment')
  @Roles('Teacher', 'SchoolAdmin', 'PlatformAdmin')
  @ApiOperation({
    summary: 'Add comment to submission (Teacher, SchoolAdmin, PlatformAdmin)',
    description: 'Adds a comment to the submission. Can be used at any review stage.',
  })
  @ApiResponse({ status: 200, description: 'Comment added' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  addComment(
    @Param('id') id: string,
    @Body() commentDto: AddCommentDto,
    @Request() req: RequestWithRole,
  ) {
    return this.reviewsService.addComment(id, commentDto, req.user.id);
  }
}

