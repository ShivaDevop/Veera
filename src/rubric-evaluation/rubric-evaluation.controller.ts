import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RubricEvaluationService } from './rubric-evaluation.service';
import { EvaluateRubricDto } from './dto/evaluate-rubric.dto';
import { UpdateRubricEvaluationDto } from './dto/update-rubric-evaluation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestWithRole } from '../common/interfaces/request-with-role.interface';

@ApiTags('rubric-evaluation')
@ApiBearerAuth('JWT-auth')
@Controller('rubric-evaluation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RubricEvaluationController {
  constructor(private readonly rubricEvaluationService: RubricEvaluationService) {}

  @Post('submissions/:submissionId/evaluate')
  @Roles('Teacher')
  @ApiOperation({
    summary: 'Evaluate submission using rubric (Teacher only)',
    description: 'Evaluates a submission using the rubric from the project template. Scoring is optional.',
  })
  @ApiResponse({ status: 201, description: 'Rubric evaluation created' })
  @ApiResponse({ status: 400, description: 'Invalid rubric or scores' })
  @ApiResponse({ status: 404, description: 'Submission not found or no rubric defined' })
  evaluateRubric(
    @Param('submissionId') submissionId: string,
    @Body() evaluateDto: EvaluateRubricDto,
    @Request() req: RequestWithRole,
  ) {
    return this.rubricEvaluationService.evaluateRubric(submissionId, evaluateDto, req.user.id);
  }

  @Patch('submissions/:submissionId/evaluation')
  @Roles('Teacher')
  @ApiOperation({
    summary: 'Update rubric evaluation (Teacher only)',
    description: 'Updates an existing rubric evaluation. Can update scores, comments, or overall evaluation.',
  })
  @ApiResponse({ status: 200, description: 'Rubric evaluation updated' })
  @ApiResponse({ status: 404, description: 'Evaluation not found' })
  updateRubricEvaluation(
    @Param('submissionId') submissionId: string,
    @Body() updateDto: UpdateRubricEvaluationDto,
    @Request() req: RequestWithRole,
  ) {
    return this.rubricEvaluationService.updateRubricEvaluation(submissionId, updateDto, req.user.id);
  }

  @Get('submissions/:submissionId/evaluation')
  @Roles('Teacher', 'SchoolAdmin', 'PlatformAdmin')
  @ApiOperation({
    summary: 'Get rubric evaluation for submission (Teacher, SchoolAdmin, PlatformAdmin)',
  })
  @ApiResponse({ status: 200, description: 'Rubric evaluation found' })
  @ApiResponse({ status: 404, description: 'Evaluation not found' })
  getRubricEvaluation(@Param('submissionId') submissionId: string) {
    return this.rubricEvaluationService.getRubricEvaluation(submissionId);
  }

  @Get('submissions/:submissionId/rubric')
  @Roles('Teacher', 'SchoolAdmin', 'PlatformAdmin')
  @ApiOperation({
    summary: 'Get rubric template and evaluation for submission (Teacher, SchoolAdmin, PlatformAdmin)',
    description: 'Returns the rubric template from project template and any existing evaluation',
  })
  @ApiResponse({ status: 200, description: 'Rubric and evaluation found' })
  @ApiResponse({ status: 404, description: 'Submission not found or no rubric defined' })
  getRubricForSubmission(@Param('submissionId') submissionId: string) {
    return this.rubricEvaluationService.getRubricForSubmission(submissionId);
  }

  @Get('submissions/:submissionId/calculate-score')
  @Roles('Teacher', 'SchoolAdmin', 'PlatformAdmin')
  @ApiOperation({
    summary: 'Calculate overall score from rubric criteria (Teacher, SchoolAdmin, PlatformAdmin)',
    description: 'Automatically calculates overall score based on criterion scores and maxPoints',
  })
  @ApiResponse({ status: 200, description: 'Overall score calculated' })
  @ApiResponse({ status: 404, description: 'Evaluation not found' })
  calculateOverallScore(@Param('submissionId') submissionId: string) {
    return this.rubricEvaluationService.calculateOverallScore(submissionId);
  }
}

