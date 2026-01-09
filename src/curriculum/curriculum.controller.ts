import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurriculumService } from './curriculum.service';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { CreateConceptDto } from './dto/create-concept.dto';
import { UpdateConceptDto } from './dto/update-concept.dto';
import { CreateSchoolCurriculumSelectionDto } from './dto/create-school-curriculum-selection.dto';
import { UpdateSchoolCurriculumSelectionDto } from './dto/update-school-curriculum-selection.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestWithRole } from '../common/interfaces/request-with-role.interface';

@ApiTags('curriculum')
@ApiBearerAuth('JWT-auth')
@Controller('curriculum')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  // ==================== Curriculum Endpoints ====================

  @Post()
  @Roles('PlatformAdmin')
  @ApiOperation({ summary: 'Create a new curriculum (PlatformAdmin only)' })
  @ApiResponse({ status: 201, description: 'Curriculum created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - PlatformAdmin access required' })
  create(@Body() createCurriculumDto: CreateCurriculumDto) {
    return this.curriculumService.create(createCurriculumDto);
  }

  @Get()
  @Roles('PlatformAdmin', 'Teacher')
  @ApiOperation({ summary: 'Get all curricula (PlatformAdmin, Teacher)' })
  @ApiResponse({ status: 200, description: 'List of curricula' })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.curriculumService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @Roles('PlatformAdmin', 'Teacher')
  @ApiOperation({ summary: 'Get curriculum by ID with full hierarchy (PlatformAdmin, Teacher)' })
  @ApiResponse({ status: 200, description: 'Curriculum found' })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  findOne(@Param('id') id: string, @Query('includeHierarchy') includeHierarchy?: string) {
    return this.curriculumService.findOne(id, includeHierarchy !== 'false');
  }

  @Patch(':id')
  @Roles('PlatformAdmin')
  @ApiOperation({ summary: 'Update curriculum (PlatformAdmin only)' })
  @ApiResponse({ status: 200, description: 'Curriculum updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - PlatformAdmin access required' })
  update(@Param('id') id: string, @Body() updateCurriculumDto: UpdateCurriculumDto) {
    return this.curriculumService.update(id, updateCurriculumDto);
  }

  @Delete(':id')
  @Roles('PlatformAdmin')
  @ApiOperation({ summary: 'Delete curriculum (soft delete) (PlatformAdmin only)' })
  @ApiResponse({ status: 200, description: 'Curriculum deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - PlatformAdmin access required' })
  remove(@Param('id') id: string) {
    return this.curriculumService.remove(id);
  }

  // ==================== Grade Endpoints ====================

  @Post('grades')
  @Roles('PlatformAdmin')
  @ApiOperation({ summary: 'Create a new grade (PlatformAdmin only)' })
  @ApiResponse({ status: 201, description: 'Grade created successfully' })
  createGrade(@Body() createGradeDto: CreateGradeDto) {
    return this.curriculumService.createGrade(createGradeDto);
  }

  @Get('curricula/:curriculumId/grades')
  @Roles('PlatformAdmin', 'Teacher')
  @ApiOperation({ summary: 'Get all grades for a curriculum (PlatformAdmin, Teacher)' })
  @ApiResponse({ status: 200, description: 'List of grades' })
  findAllGrades(@Param('curriculumId') curriculumId: string) {
    return this.curriculumService.findAllGrades(curriculumId);
  }

  @Get('grades/:id')
  @Roles('PlatformAdmin', 'Teacher')
  @ApiOperation({ summary: 'Get grade by ID (PlatformAdmin, Teacher)' })
  @ApiResponse({ status: 200, description: 'Grade found' })
  findOneGrade(@Param('id') id: string) {
    return this.curriculumService.findOneGrade(id);
  }

  @Patch('grades/:id')
  @Roles('PlatformAdmin')
  @ApiOperation({ summary: 'Update grade (PlatformAdmin only)' })
  @ApiResponse({ status: 200, description: 'Grade updated successfully' })
  updateGrade(@Param('id') id: string, @Body() updateGradeDto: UpdateGradeDto) {
    return this.curriculumService.updateGrade(id, updateGradeDto);
  }

  @Delete('grades/:id')
  @Roles('PlatformAdmin')
  @ApiOperation({ summary: 'Delete grade (soft delete) (PlatformAdmin only)' })
  @ApiResponse({ status: 200, description: 'Grade deleted successfully' })
  removeGrade(@Param('id') id: string) {
    return this.curriculumService.removeGrade(id);
  }

  // ==================== Subject Endpoints ====================

  @Post('subjects')
  @Roles('PlatformAdmin')
  @ApiOperation({ summary: 'Create a new subject (PlatformAdmin only)' })
  @ApiResponse({ status: 201, description: 'Subject created successfully' })
  createSubject(@Body() createSubjectDto: CreateSubjectDto) {
    return this.curriculumService.createSubject(createSubjectDto);
  }

  @Get('grades/:gradeId/subjects')
  @Roles('PlatformAdmin', 'Teacher')
  @ApiOperation({ summary: 'Get all subjects for a grade (PlatformAdmin, Teacher)' })
  @ApiResponse({ status: 200, description: 'List of subjects' })
  findAllSubjects(@Param('gradeId') gradeId: string) {
    return this.curriculumService.findAllSubjects(gradeId);
  }

  @Get('subjects/:id')
  @Roles('PlatformAdmin', 'Teacher')
  @ApiOperation({ summary: 'Get subject by ID (PlatformAdmin, Teacher)' })
  @ApiResponse({ status: 200, description: 'Subject found' })
  findOneSubject(@Param('id') id: string) {
    return this.curriculumService.findOneSubject(id);
  }

  @Patch('subjects/:id')
  @Roles('PlatformAdmin')
  @ApiOperation({ summary: 'Update subject (PlatformAdmin only)' })
  @ApiResponse({ status: 200, description: 'Subject updated successfully' })
  updateSubject(@Param('id') id: string, @Body() updateSubjectDto: UpdateSubjectDto) {
    return this.curriculumService.updateSubject(id, updateSubjectDto);
  }

  @Delete('subjects/:id')
  @Roles('PlatformAdmin')
  @ApiOperation({ summary: 'Delete subject (soft delete) (PlatformAdmin only)' })
  @ApiResponse({ status: 200, description: 'Subject deleted successfully' })
  removeSubject(@Param('id') id: string) {
    return this.curriculumService.removeSubject(id);
  }

  // ==================== Chapter Endpoints ====================

  @Post('chapters')
  @Roles('PlatformAdmin')
  @ApiOperation({ summary: 'Create a new chapter (PlatformAdmin only)' })
  @ApiResponse({ status: 201, description: 'Chapter created successfully' })
  createChapter(@Body() createChapterDto: CreateChapterDto) {
    return this.curriculumService.createChapter(createChapterDto);
  }

  @Get('subjects/:subjectId/chapters')
  @Roles('PlatformAdmin', 'Teacher')
  @ApiOperation({ summary: 'Get all chapters for a subject (PlatformAdmin, Teacher)' })
  @ApiResponse({ status: 200, description: 'List of chapters' })
  findAllChapters(@Param('subjectId') subjectId: string) {
    return this.curriculumService.findAllChapters(subjectId);
  }

  @Get('chapters/:id')
  @Roles('PlatformAdmin', 'Teacher')
  @ApiOperation({ summary: 'Get chapter by ID (PlatformAdmin, Teacher)' })
  @ApiResponse({ status: 200, description: 'Chapter found' })
  findOneChapter(@Param('id') id: string) {
    return this.curriculumService.findOneChapter(id);
  }

  @Patch('chapters/:id')
  @Roles('PlatformAdmin')
  @ApiOperation({ summary: 'Update chapter (PlatformAdmin only)' })
  @ApiResponse({ status: 200, description: 'Chapter updated successfully' })
  updateChapter(@Param('id') id: string, @Body() updateChapterDto: UpdateChapterDto) {
    return this.curriculumService.updateChapter(id, updateChapterDto);
  }

  @Delete('chapters/:id')
  @Roles('PlatformAdmin')
  @ApiOperation({ summary: 'Delete chapter (soft delete) (PlatformAdmin only)' })
  @ApiResponse({ status: 200, description: 'Chapter deleted successfully' })
  removeChapter(@Param('id') id: string) {
    return this.curriculumService.removeChapter(id);
  }

  // ==================== Concept Endpoints ====================

  @Post('concepts')
  @Roles('PlatformAdmin')
  @ApiOperation({ summary: 'Create a new concept (PlatformAdmin only)' })
  @ApiResponse({ status: 201, description: 'Concept created successfully' })
  createConcept(@Body() createConceptDto: CreateConceptDto) {
    return this.curriculumService.createConcept(createConceptDto);
  }

  @Get('chapters/:chapterId/concepts')
  @Roles('PlatformAdmin', 'Teacher')
  @ApiOperation({ summary: 'Get all concepts for a chapter (PlatformAdmin, Teacher)' })
  @ApiResponse({ status: 200, description: 'List of concepts' })
  findAllConcepts(@Param('chapterId') chapterId: string) {
    return this.curriculumService.findAllConcepts(chapterId);
  }

  @Get('concepts/:id')
  @Roles('PlatformAdmin', 'Teacher')
  @ApiOperation({ summary: 'Get concept by ID (PlatformAdmin, Teacher)' })
  @ApiResponse({ status: 200, description: 'Concept found' })
  findOneConcept(@Param('id') id: string) {
    return this.curriculumService.findOneConcept(id);
  }

  @Patch('concepts/:id')
  @Roles('PlatformAdmin')
  @ApiOperation({ summary: 'Update concept (PlatformAdmin only)' })
  @ApiResponse({ status: 200, description: 'Concept updated successfully' })
  updateConcept(@Param('id') id: string, @Body() updateConceptDto: UpdateConceptDto) {
    return this.curriculumService.updateConcept(id, updateConceptDto);
  }

  @Delete('concepts/:id')
  @Roles('PlatformAdmin')
  @ApiOperation({ summary: 'Delete concept (soft delete) (PlatformAdmin only)' })
  @ApiResponse({ status: 200, description: 'Concept deleted successfully' })
  removeConcept(@Param('id') id: string) {
    return this.curriculumService.removeConcept(id);
  }

  // ==================== School Curriculum Selection Endpoints ====================

  @Post('school-selections')
  @Roles('PlatformAdmin')
  @ApiOperation({ summary: 'Select curriculum for a school (PlatformAdmin only)' })
  @ApiResponse({ status: 201, description: 'Curriculum selected successfully' })
  createSchoolSelection(
    @Body() createSelectionDto: CreateSchoolCurriculumSelectionDto,
    @Request() req: RequestWithRole,
  ) {
    return this.curriculumService.createSchoolSelection(
      createSelectionDto,
      req.user.id,
    );
  }

  @Get('school-selections')
  @Roles('PlatformAdmin', 'Teacher')
  @ApiOperation({ summary: 'Get all school curriculum selections (PlatformAdmin, Teacher)' })
  @ApiResponse({ status: 200, description: 'List of selections' })
  findAllSchoolSelections(@Query('schoolId') schoolId?: string) {
    return this.curriculumService.findAllSchoolSelections(schoolId);
  }

  @Get('school-selections/:id')
  @Roles('PlatformAdmin', 'Teacher')
  @ApiOperation({ summary: 'Get school curriculum selection by ID (PlatformAdmin, Teacher)' })
  @ApiResponse({ status: 200, description: 'Selection found' })
  findOneSchoolSelection(@Param('id') id: string) {
    return this.curriculumService.findOneSchoolSelection(id);
  }

  @Get('schools/:schoolId/active-curriculum')
  @Roles('PlatformAdmin', 'Teacher')
  @ApiOperation({
    summary: 'Get active curriculum for a school (PlatformAdmin, Teacher)',
  })
  @ApiResponse({ status: 200, description: 'Active curriculum found' })
  getSchoolActiveCurriculum(@Param('schoolId') schoolId: string) {
    return this.curriculumService.getSchoolActiveCurriculum(schoolId);
  }

  @Patch('school-selections/:id')
  @Roles('PlatformAdmin')
  @ApiOperation({ summary: 'Update school curriculum selection (PlatformAdmin only)' })
  @ApiResponse({ status: 200, description: 'Selection updated successfully' })
  updateSchoolSelection(
    @Param('id') id: string,
    @Body() updateSelectionDto: UpdateSchoolCurriculumSelectionDto,
  ) {
    return this.curriculumService.updateSchoolSelection(id, updateSelectionDto);
  }

  @Delete('school-selections/:id')
  @Roles('PlatformAdmin')
  @ApiOperation({ summary: 'Remove school curriculum selection (PlatformAdmin only)' })
  @ApiResponse({ status: 200, description: 'Selection removed successfully' })
  removeSchoolSelection(@Param('id') id: string) {
    return this.curriculumService.removeSchoolSelection(id);
  }
}
