import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors();

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