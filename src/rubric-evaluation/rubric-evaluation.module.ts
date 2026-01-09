import { Module } from '@nestjs/common';
import { RubricEvaluationService } from './rubric-evaluation.service';
import { RubricEvaluationController } from './rubric-evaluation.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RubricEvaluationController],
  providers: [RubricEvaluationService],
  exports: [RubricEvaluationService],
})
export class RubricEvaluationModule {}

