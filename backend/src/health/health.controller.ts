import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  constructor() {}

  @Get()
  async check() {
    // Basic health check remains
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

} 