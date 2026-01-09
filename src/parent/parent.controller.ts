import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ParentService } from './parent.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('parents')
@ApiBearerAuth('JWT-auth')
@Controller('parents')
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  @Post()
  @RequirePermissions('parents:create')
  @ApiOperation({ summary: 'Create a new parent profile' })
  @ApiResponse({ status: 201, description: 'Parent profile created successfully' })
  create(@Body() createParentDto: CreateParentDto) {
    return this.parentService.create(createParentDto);
  }

  @Get()
  @RequirePermissions('parents:read')
  @ApiOperation({ summary: 'Get all parent profiles' })
  @ApiResponse({ status: 200, description: 'List of parent profiles' })
  findAll() {
    return this.parentService.findAll();
  }

  @Get('user/:userId')
  @RequirePermissions('parents:read')
  @ApiOperation({ summary: 'Get parent profile by user ID' })
  @ApiResponse({ status: 200, description: 'Parent profile found' })
  findByUserId(@Param('userId') userId: string) {
    return this.parentService.findByUserId(userId);
  }

  @Get(':id')
  @RequirePermissions('parents:read')
  @ApiOperation({ summary: 'Get parent profile by ID' })
  @ApiResponse({ status: 200, description: 'Parent profile found' })
  findOne(@Param('id') id: string) {
    return this.parentService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('parents:update')
  @ApiOperation({ summary: 'Update parent profile' })
  @ApiResponse({ status: 200, description: 'Parent profile updated successfully' })
  update(@Param('id') id: string, @Body() updateParentDto: UpdateParentDto) {
    return this.parentService.update(id, updateParentDto);
  }

  @Delete(':id')
  @RequirePermissions('parents:delete')
  @ApiOperation({ summary: 'Delete parent profile (soft delete)' })
  @ApiResponse({ status: 200, description: 'Parent profile deleted successfully' })
  remove(@Param('id') id: string) {
    return this.parentService.remove(id);
  }
}

