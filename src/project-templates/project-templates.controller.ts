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
import { ProjectTemplatesService } from './project-templates.service';
import { CreateProjectTemplateDto } from './dto/create-project-template.dto';
import { UpdateProjectTemplateDto } from './dto/update-project-template.dto';
import { CreateProjectFromTemplateDto } from './dto/create-project-from-template.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestWithRole } from '../common/interfaces/request-with-role.interface';

@ApiTags('project-templates')
@ApiBearerAuth('JWT-auth')
@Controller('project-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectTemplatesController {
  constructor(private readonly templatesService: ProjectTemplatesService) {}

  @Post()
  @Roles('PlatformAdmin', 'SchoolAdmin', 'Teacher')
  @ApiOperation({ summary: 'Create a new project template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid skill IDs' })
  create(@Body() createTemplateDto: CreateProjectTemplateDto) {
    return this.templatesService.create(createTemplateDto);
  }

  @Get()
  @Roles('PlatformAdmin', 'SchoolAdmin', 'Teacher')
  @ApiOperation({ summary: 'Get all project templates' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  findAll(
    @Query('category') category?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.templatesService.findAll(
      category,
      includeInactive === 'true',
    );
  }

  @Get(':id')
  @Roles('PlatformAdmin', 'SchoolAdmin', 'Teacher')
  @ApiOperation({ summary: 'Get project template by ID' })
  @ApiResponse({ status: 200, description: 'Template found' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Patch(':id')
  @Roles('PlatformAdmin', 'SchoolAdmin', 'Teacher')
  @ApiOperation({ summary: 'Update project template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  update(@Param('id') id: string, @Body() updateTemplateDto: UpdateProjectTemplateDto) {
    return this.templatesService.update(id, updateTemplateDto);
  }

  @Delete(':id')
  @Roles('PlatformAdmin', 'SchoolAdmin')
  @ApiOperation({ summary: 'Delete project template (soft delete)' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 409, description: 'Template is in use' })
  remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }

  // ==================== Assignment APIs ====================

  @Post('create-project')
  @Roles('PlatformAdmin', 'SchoolAdmin', 'Teacher')
  @ApiOperation({ summary: 'Create a project from template and optionally assign to students' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid template or student IDs' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  createProjectFromTemplate(
    @Body() createDto: CreateProjectFromTemplateDto,
    @Request() req: RequestWithRole,
  ) {
    return this.templatesService.createProjectFromTemplate(createDto, req.user.id);
  }

  @Get(':id/usage-stats')
  @Roles('PlatformAdmin', 'SchoolAdmin', 'Teacher')
  @ApiOperation({ summary: 'Get usage statistics for a template' })
  @ApiResponse({ status: 200, description: 'Usage statistics' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  getUsageStats(@Param('id') id: string) {
    return this.templatesService.getTemplateUsageStats(id);
  }
}

