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
        app.setGlobalPrefix('api', { exclude: ['health'] }); // comme dans main.ts
        await app.init();
    });

    it('/health (GET) répond sans aucune donnée', async () => {
        const res = await request(app.getHttpServer()).get('/health').expect(200);
        expect(res.body).toEqual({ status: 'ok' });
    });

    it("l'ancienne route /api/db-test n'existe plus", () => {
        return request(app.getHttpServer()).get('/api/db-test').expect(404);
    });

    afterAll(async () => {
        await app.close();
    });
});
