import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { RoleContextMiddleware } from './role-context.middleware';

@Module({})
export class MiddlewareModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RoleContextMiddleware).forRoutes('*');
  }
}

