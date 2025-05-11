import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('test-auth')
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