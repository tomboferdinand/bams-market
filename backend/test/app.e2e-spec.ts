import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api'); // Applique le préfixe global
        await app.init();
    });

    it('/api/db-test (GET)', () => {
        return request(app.getHttpServer())
            .get('/api/db-test') // 👈 On pointe sur la vraie route existante
            .expect(200);
    });

    afterAll(async () => {
        await app.close();
    });
});