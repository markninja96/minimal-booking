import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Bookings (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const providerId = '499c1465-884f-4438-ab54-11e565a90c48';
  const jwtService = new JwtService({ secret: 'dev-secret' });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await prisma.booking.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.booking.deleteMany();
  });

  it('creates and fetches a booking, then reports metrics', async () => {
    const token = jwtService.sign({ sub: providerId, role: 'provider' });
    const startTime = new Date(Date.now() + 60 * 60 * 1000);
    const endTime = new Date(Date.now() + 90 * 60 * 1000);
    const bookingRequest = {
      providerId,
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };

    const createResponse = await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(bookingRequest)
      .expect(201);

    expect(createResponse.body).toMatchObject({
      providerId,
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      startTime: bookingRequest.startTime,
      endTime: bookingRequest.endTime,
      status: 'confirmed',
    });

    const bookingId = createResponse.body.id as string;

    await request(app.getHttpServer())
      .get(`/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: bookingId,
          providerId,
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
          startTime: bookingRequest.startTime,
          endTime: bookingRequest.endTime,
          status: 'confirmed',
        });
      });

    await request(app.getHttpServer())
      .get('/metrics')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          bookingsCreated: 1,
          uptimeSeconds: expect.any(Number) as number,
        });
        expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
      });
  });
});
