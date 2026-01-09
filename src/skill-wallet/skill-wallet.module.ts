import { Module } from '@nestjs/common';
import { SkillWalletService } from './skill-wallet.service';
import { SkillWalletController } from './skill-wallet.controller';
import { PrismaModule } from '../database/prisma.module';
import { UsersModule } from '../users/users.module';
import { ProjectsModule } from '../projects/projects.module';
import { AuditModule } from '../audit/audit.module';
import { TwilioModule } from '../twilio/twilio.module';

@Module({
  imports: [PrismaModule, UsersModule, ProjectsModule, AuditModule, TwilioModule],
  controllers: [SkillWalletController],
  providers: [SkillWalletService],
  exports: [SkillWalletService],
})
export class SkillWalletModule {}
