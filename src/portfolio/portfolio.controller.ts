import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioItemDto } from './dto/create-portfolio-item.dto';
import { UpdatePortfolioItemDto } from './dto/update-portfolio-item.dto';
import { UpdatePortfolioPrivacyDto } from './dto/update-portfolio-privacy.dto';
import { PortfolioFiltersDto } from './dto/portfolio-filters.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestWithRole } from '../common/interfaces/request-with-role.interface';

@ApiTags('portfolio')
@ApiBearerAuth('JWT-auth')
@Controller('portfolio')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Post('items')
  @Roles('Student')
  @ApiOperation({ summary: 'Add approved submission to portfolio (Student only)' })
  @ApiResponse({ status: 201, description: 'Item added to portfolio' })
  @ApiResponse({ status: 400, description: 'Submission not approved or already in portfolio' })
  createPortfolioItem(@Body() createDto: CreatePortfolioItemDto, @Request() req: RequestWithRole) {
    return this.portfolioService.createPortfolioItem(createDto, req.user.id);
  }

  @Get('timeline')
  @Roles('Student', 'Parent', 'Teacher', 'SchoolAdmin', 'PlatformAdmin')
  @ApiOperation({
    summary: 'Get portfolio timeline view (Student, Parent, Teacher, SchoolAdmin, PlatformAdmin)',
    description: 'Returns portfolio items in chronological order with privacy controls applied',
  })
  @ApiResponse({ status: 200, description: 'Portfolio timeline' })
  @ApiResponse({ status: 403, description: 'Forbidden - No permission to view portfolio' })
  getPortfolioTimeline(
    @Query('studentId') studentId: string,
    @Query() filters: PortfolioFiltersDto,
    @Request() req: RequestWithRole,
  ) {
    return this.portfolioService.getPortfolioTimeline(
      studentId || req.user.id,
      filters,
      req.user.id,
      req.activeRole,
    );
  }

  @Get('category/:category')
  @Roles('Student', 'Parent', 'Teacher', 'SchoolAdmin', 'PlatformAdmin')
  @ApiOperation({
    summary: 'Get portfolio items by category (Student, Parent, Teacher, SchoolAdmin, PlatformAdmin)',
  })
  @ApiResponse({ status: 200, description: 'Portfolio items by category' })
  getPortfolioByCategory(
    @Param('category') category: string,
    @Query('studentId') studentId: string,
    @Request() req: RequestWithRole,
  ) {
    return this.portfolioService.getPortfolioByCategory(
      studentId || req.user.id,
      category,
      req.user.id,
      req.activeRole,
    );
  }

  @Patch('items/:id')
  @Roles('Student')
  @ApiOperation({ summary: 'Update portfolio item (Student only)' })
  @ApiResponse({ status: 200, description: 'Portfolio item updated' })
  updatePortfolioItem(
    @Param('id') id: string,
    @Body() updateDto: UpdatePortfolioItemDto,
    @Request() req: RequestWithRole,
  ) {
    return this.portfolioService.updatePortfolioItem(id, updateDto, req.user.id);
  }

  @Patch('items/:id/privacy')
  @Roles('Student', 'Parent')
  @ApiOperation({
    summary: 'Update portfolio item privacy settings (Student, Parent)',
    description: 'Students can update their own items. Parents can update consent for their children.',
  })
  @ApiResponse({ status: 200, description: 'Privacy settings updated' })
  updatePortfolioPrivacy(
    @Param('id') id: string,
    @Body() privacyDto: UpdatePortfolioPrivacyDto,
    @Request() req: RequestWithRole,
  ) {
    return this.portfolioService.updatePortfolioPrivacy(id, privacyDto, req.user.id);
  }

  @Delete('items/:id')
  @Roles('Student')
  @ApiOperation({ summary: 'Remove item from portfolio (Student only)' })
  @ApiResponse({ status: 200, description: 'Item removed from portfolio' })
  removePortfolioItem(@Param('id') id: string, @Request() req: RequestWithRole) {
    return this.portfolioService.removePortfolioItem(id, req.user.id);
  }

  @Get('settings')
  @Roles('Student')
  @ApiOperation({ summary: 'Get portfolio settings (Student only)' })
  @ApiResponse({ status: 200, description: 'Portfolio settings' })
  getPortfolioSettings(@Request() req: RequestWithRole) {
    return this.portfolioService.getPortfolioSettings(req.user.id);
  }

  @Post('auto-add')
  @Roles('Student')
  @ApiOperation({
    summary: 'Auto-add approved projects to portfolio (Student only)',
    description: 'Automatically adds all approved submissions to portfolio based on settings',
  })
  @ApiResponse({ status: 200, description: 'Auto-add completed' })
  autoAddApprovedProjects(@Request() req: RequestWithRole) {
    return this.portfolioService.autoAddApprovedProjects(req.user.id);
  }
}

