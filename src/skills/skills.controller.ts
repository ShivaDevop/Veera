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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('skills')
@ApiBearerAuth('JWT-auth')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  @RequirePermissions('skills:create')
  @ApiOperation({
    summary: 'Create a new skill definition (Admin only)',
    description:
      'Creates a skill definition. Note: Skills are added to student wallets only through approved projects via skill-wallet endpoint.',
  })
  @ApiResponse({ status: 201, description: 'Skill definition created successfully' })
  create(@Body() createSkillDto: CreateSkillDto) {
    return this.skillsService.create(createSkillDto);
  }

  @Get()
  @RequirePermissions('skills:read')
  @ApiOperation({ summary: 'Get all skills' })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of skills' })
  findAll(@Query('category') category?: string) {
    return this.skillsService.findAll(category);
  }

  @Get(':id')
  @RequirePermissions('skills:read')
  @ApiOperation({ summary: 'Get skill by ID' })
  @ApiResponse({ status: 200, description: 'Skill found' })
  findOne(@Param('id') id: string) {
    return this.skillsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('skills:update')
  @ApiOperation({
    summary: 'Update skill definition (Admin only)',
    description:
      'Updates skill definition. Note: Student skills (in wallets) cannot be edited or deleted.',
  })
  @ApiResponse({ status: 200, description: 'Skill definition updated successfully' })
  update(@Param('id') id: string, @Body() updateSkillDto: UpdateSkillDto) {
    return this.skillsService.update(id, updateSkillDto);
  }

  @Delete(':id')
  @RequirePermissions('skills:delete')
  @ApiOperation({
    summary: 'Delete skill definition (soft delete, Admin only)',
    description:
      'Soft deletes skill definition. Note: Student skills in wallets are immutable and cannot be deleted.',
  })
  @ApiResponse({ status: 200, description: 'Skill definition deleted successfully' })
  remove(@Param('id') id: string) {
    return this.skillsService.remove(id);
  }
}

