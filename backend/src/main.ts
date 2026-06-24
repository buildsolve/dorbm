import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 4000);
  console.log(`CakeERP Backend running on port ${process.env.PORT || 4000}`);
  console.log(`Swagger docs: http://localhost:${process.env.PORT || 4000}/api/docs`);
}

bootstrap();
