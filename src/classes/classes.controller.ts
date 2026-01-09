import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('classes')
@ApiBearerAuth('JWT-auth')
@ApiHeader({ name: 'X-Active-Role', description: 'Active role for this request (Student, Teacher, Parent, SchoolAdmin, PlatformAdmin)' })
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles('Teacher', 'SchoolAdmin', 'PlatformAdmin')
  @RequirePermissions('classes:create')
  @ApiOperation({ summary: 'Create a new class' })
  @ApiResponse({ status: 201, description: 'Class created successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient role or permissions' })
  create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Get()
  @Roles('Student', 'Teacher', 'Parent', 'SchoolAdmin', 'PlatformAdmin')
  @RequirePermissions('classes:read')
  @ApiOperation({ summary: 'Get all classes' })
  @ApiQuery({ name: 'schoolId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of classes' })
  findAll(@Query('schoolId') schoolId?: string) {
    return this.classesService.findAll(schoolId);
  }

  @Get(':id')
  @Roles('Student', 'Teacher', 'Parent', 'SchoolAdmin', 'PlatformAdmin')
  @RequirePermissions('classes:read')
  @ApiOperation({ summary: 'Get class by ID' })
  @ApiResponse({ status: 200, description: 'Class found' })
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Patch(':id')
  @Roles('Teacher', 'SchoolAdmin', 'PlatformAdmin')
  @RequirePermissions('classes:update')
  @ApiOperation({ summary: 'Update class' })
  @ApiResponse({ status: 200, description: 'Class updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient role or permissions' })
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto) {
    return this.classesService.update(id, updateClassDto);
  }

  @Delete(':id')
  @Roles('SchoolAdmin', 'PlatformAdmin')
  @RequirePermissions('classes:delete')
  @ApiOperation({ summary: 'Delete class (soft delete)' })
  @ApiResponse({ status: 200, description: 'Class deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient role or permissions' })
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }
}

