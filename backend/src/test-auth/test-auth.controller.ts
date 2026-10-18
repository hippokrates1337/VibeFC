import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('test-auth')
@UseGuards(JwtAuthGuard)
export class TestAuthController {
  @Get()
  testAuth(@Req() req: Request) {
    // Use type assertion to access user property that's added by middleware
    const user = (req as any).user;
    return {
      user,
      authHeader: req.headers.authorization,
    };
  }
} 