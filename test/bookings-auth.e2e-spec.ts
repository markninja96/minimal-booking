import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Bookings auth (e2e)', () => {
  let app: INestApplication;
  let prisma: {
    booking: {
      findUnique: jest.Mock;
    };
  };

  const providerId = '499c1465-884f-4438-ab54-11e565a90c48';
  const otherProviderId = 'e1cf3eb2-3702-4296-9436-aea369a1feca';
  const bookingId = 'e30dea06-d465-4a91-ae8a-438a5b1eef35';
  const jwtService = new JwtService({ secret: 'dev-secret' });

  beforeAll(async () => {
    prisma = {
      booking: {
        findUnique: jest.fn(),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        booking: prisma.booking,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/bookings (GET) rejects missing JWT', () => {
    return request(app.getHttpServer()).get('/bookings').expect(401);
  });

  it('/bookings (GET) rejects JWTs with unsupported roles', () => {
    const token = jwtService.sign({ sub: providerId, role: 'viewer' });

    return request(app.getHttpServer())
      .get('/bookings')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('/bookings/:id (GET) hides another provider booking', () => {
    const token = jwtService.sign({ sub: providerId, role: 'provider' });

    prisma.booking.findUnique.mockResolvedValue({
      id: bookingId,
      providerId: otherProviderId,
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      startTime: new Date(Date.now() + 60 * 60 * 1000),
      endTime: new Date(Date.now() + 90 * 60 * 1000),
      status: BookingStatus.confirmed,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return request(app.getHttpServer())
      .get(`/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
