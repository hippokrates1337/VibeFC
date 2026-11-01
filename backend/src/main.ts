import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  // Browsers may only call the API from the app's own origins (CORS_ORIGINS, comma-separated).
  // Without it every origin is allowed, as before; set it in every deployed environment.
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (corsOrigins.length > 0) {
    app.enableCors({ origin: corsOrigins, exposedHeaders: ['x-request-id'] });
    logger.log(`CORS allowed origins: ${corsOrigins.join(', ')}`);
  } else {
    app.enableCors({ exposedHeaders: ['x-request-id'] });
    logger.warn('CORS_ORIGINS is not set: requests from any origin are allowed');
  }

  app.use((req: Request & { requestId?: string }, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id']?.toString() || randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });
  
  // Enable validation pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  // Get port from environment or use default
  const port = process.env.PORT || 3001;
  
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap(); 