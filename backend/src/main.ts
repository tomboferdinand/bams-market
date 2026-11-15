import 'dotenv/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { assertProductionConfig, parseCorsOrigins } from './common/production-checks';

async function bootstrap() {
  assertProductionConfig(); // en production : refuse de démarrer avec un réglage dangereux
  const isProduction = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Derrière le proxy de l'hébergeur, la vraie adresse IP du visiteur est dans X-Forwarded-For :
  // sans ce réglage, la limite de débit compterait tous les visiteurs comme une seule adresse.
  // TRUST_PROXY = nombre de proxys de confiance (1 par défaut en production, 0 en local).
  const trustedProxies = Number(process.env.TRUST_PROXY ?? (isProduction ? 1 : 0));
  if (trustedProxies > 0) app.set('trust proxy', trustedProxies);

  // En-têtes de sécurité. La politique de contenu n'est relâchée qu'en local, pour la page Swagger.
  app.use(helmet({ contentSecurityPolicy: isProduction ? undefined : false }));

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

  // Documentation de l'API : jamais exposée en production.
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle("Bam'S Market API")
      .setDescription("API de la marketplace multi-vendeurs Bam'S Market (MVP)")
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();