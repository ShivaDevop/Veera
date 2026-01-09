import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { PrismaModule } from '../database/prisma.module';
import { SkillWalletModule } from '../skill-wallet/skill-wallet.module';
import { AuditModule } from '../audit/audit.module';
import { TwilioModule } from '../twilio/twilio.module';

@Module({
  imports: [PrismaModule, SkillWalletModule, AuditModule, TwilioModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}

