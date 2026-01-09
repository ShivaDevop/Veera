import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ConsentService } from './consent.service';
import { InviteParentDto } from './dto/invite-parent.dto';
import { AcceptConsentDto } from './dto/accept-consent.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('consent')
@ApiBearerAuth('JWT-auth')
@ApiHeader({ name: 'X-Active-Role', description: 'Active role for this request' })
@Controller('consent')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @UseGuards(JwtAuthGuard)
  @Post('student/:studentId/invite-parent')
  @Roles('SchoolAdmin', 'PlatformAdmin')
  @RequirePermissions('consent:create')
  @ApiOperation({ summary: 'Invite parent to provide consent for student' })
  @ApiResponse({ status: 201, description: 'Parent invitation sent successfully' })
  @ApiResponse({ status: 400, description: 'Student does not require consent or invalid data' })
  @ApiResponse({ status: 404, description: 'Student or parent not found' })
  async inviteParent(
    @Param('studentId') studentId: string,
    @Body() inviteParentDto: InviteParentDto,
    @Request() req: any,
  ) {
    return this.consentService.inviteParent(
      studentId,
      inviteParentDto,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('accept')
  @Roles('Parent')
  @ApiOperation({ summary: 'Accept parent consent invitation' })
  @ApiResponse({ status: 200, description: 'Consent accepted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid token or consent already approved' })
  @ApiResponse({ status: 403, description: 'Not authorized to accept this consent' })
  async acceptConsent(
    @Body() acceptConsentDto: AcceptConsentDto,
    @Request() req: any,
  ) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.consentService.acceptConsent(
      acceptConsentDto,
      req.user.id,
      ipAddress,
      userAgent,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('revoke/:consentId')
  @Roles('Parent')
  @ApiOperation({ summary: 'Revoke parent consent' })
  @ApiResponse({ status: 200, description: 'Consent revoked successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to revoke this consent' })
  async revokeConsent(
    @Param('consentId') consentId: string,
    @Request() req: any,
  ) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.consentService.revokeConsent(
      consentId,
      req.user.id,
      ipAddress,
      userAgent,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('student/:studentId/status')
  @Roles('Student', 'Teacher', 'Parent', 'SchoolAdmin', 'PlatformAdmin')
  @RequirePermissions('consent:read')
  @ApiOperation({ summary: 'Get consent status for a student' })
  @ApiResponse({ status: 200, description: 'Consent status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getConsentStatus(@Param('studentId') studentId: string) {
    return this.consentService.getConsentStatus(studentId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('parent/my-consents')
  @Roles('Parent')
  @ApiOperation({ summary: 'Get all consent requests for the authenticated parent' })
  @ApiResponse({ status: 200, description: 'Consents retrieved successfully' })
  async getParentConsents(@Request() req: any) {
    return this.consentService.getParentConsents(req.user.id);
  }
}

