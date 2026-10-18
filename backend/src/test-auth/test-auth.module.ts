import { Module } from '@nestjs/common';
import { TestAuthController } from './test-auth.controller';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Module({
  controllers: [TestAuthController],
  providers: [JwtAuthGuard],
})
export class TestAuthModule {} 