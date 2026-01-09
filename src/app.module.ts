import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { SchoolsModule } from './schools/schools.module';
import { ClassesModule } from './classes/classes.module';
import { CurriculumModule } from './curriculum/curriculum.module';
import { ProjectsModule } from './projects/projects.module';
import { SkillsModule } from './skills/skills.module';
import { ParentModule } from './parent/parent.module';
import { AdminModule } from './admin/admin.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { ConsentModule } from './consent/consent.module';
import { StudentDashboardModule } from './student-dashboard/student-dashboard.module';
import { SkillWalletModule } from './skill-wallet/skill-wallet.module';
import { ProjectTemplatesModule } from './project-templates/project-templates.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { TeacherDashboardModule } from './teacher-dashboard/teacher-dashboard.module';
import { RubricEvaluationModule } from './rubric-evaluation/rubric-evaluation.module';
import { ParentDashboardModule } from './parent-dashboard/parent-dashboard.module';
import { SchoolAdminModule } from './school-admin/school-admin.module';
import { RazorpayModule } from './razorpay/razorpay.module';
import { TwilioModule } from './twilio/twilio.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RbacGuard } from './common/guards/rbac.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RoleContextMiddleware } from './common/middleware/role-context.middleware';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    SchoolsModule,
    ClassesModule,
    CurriculumModule,
    ProjectsModule,
    SkillsModule,
    ParentModule,
    AdminModule,
    PaymentsModule,
    NotificationsModule,
    AuditModule,
    ConsentModule,
        StudentDashboardModule,
        SkillWalletModule,
        ProjectTemplatesModule,
        SubmissionsModule,
        ReviewsModule,
        PortfolioModule,
        TeacherDashboardModule,
        RubricEvaluationModule,
        ParentDashboardModule,
        SchoolAdminModule,
        RazorpayModule,
        TwilioModule,
      ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RoleContextMiddleware).forRoutes('*');
  }
}

