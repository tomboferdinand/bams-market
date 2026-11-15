import 'dotenv/config';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { assertProductionConfig, parseCorsOrigins } from './common/production-checks';

async function bootstrap() {
  assertProductionConfig(); // en production : refuse de démarrer avec un réglage dangereux
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api', { exclude: ['health'] }); // /health reste à la racine pour l'hébergeur
  app.use(cookieParser());
  // En production CORS_ORIGIN est obligatoire (voir production-checks) ; en local, sans liste, tout est accepté.
  const origins = parseCorsOrigins(process.env.CORS_ORIGIN);
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: true, // indispensable pour que le cookie soit envoyé/reçu cross-origin
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle("Bam'S Market API")
    .setDescription("API de la marketplace multi-vendeurs Bam'S Market (MVP)")
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();