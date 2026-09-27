import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  // Default Express JSON limit (100kb) is too small for base64 signature images
  // from the cash-control signature pad.
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));

  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('CakeERP API')
    .setDescription('Full-stack ERP for cake production operations')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth')
    .addTag('inventory')
    .addTag('recipes')
    .addTag('products')
    .addTag('production')
    .addTag('storage')
    .addTag('dashboard')
    .addTag('cash-control')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 4000);
  console.log(`CakeERP Backend running on port ${process.env.PORT || 4000}`);
  console.log(`Swagger docs: http://localhost:${process.env.PORT || 4000}/api/docs`);
}

bootstrap();
