import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    exposedHeaders: ['Content-Disposition', 'X-Total-Pages', 'X-Total-Vehicles'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Checklist Multimídia Nissan').setVersion('1.0').addBearerAuth().build(),
  );
  SwaggerModule.setup('docs', app, doc);

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
  console.log(`API em http://localhost:${port}  |  Swagger em http://localhost:${port}/docs`);
}
bootstrap();
