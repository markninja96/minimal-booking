import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Booking, BookingStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { BookingsService } from './bookings.service';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: {
    booking: {
      findFirst: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const providerId = '499c1465-884f-4438-ab54-11e565a90c48';
  const startTime = new Date(Date.now() + 60 * 60 * 1000);
  const endTime = new Date(Date.now() + 90 * 60 * 1000);

  const booking: Booking = {
    id: '33333333-3333-3333-3333-333333333333',
    providerId,
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    startTime,
    endTime,
    status: BookingStatus.confirmed,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      booking: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    service = new BookingsService(prisma as unknown as PrismaService);
  });

  it('creates a booking successfully', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.booking.create.mockResolvedValue(booking);

    await expect(
      service.create({
        providerId,
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    ).resolves.toEqual(booking);

    expect(prisma.booking.findFirst).toHaveBeenCalledWith({
      where: {
        providerId,
        status: BookingStatus.confirmed,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    expect(prisma.booking.create).toHaveBeenCalledWith({
      data: {
        providerId,
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        startTime,
        endTime,
        status: BookingStatus.confirmed,
      },
    });
  });

  it('rejects invalid time ranges', async () => {
    await expect(
      service.create({
        providerId,
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        startTime: endTime.toISOString(),
        endTime: startTime.toISOString(),
      }),
    ).rejects.toThrow(
      new BadRequestException('End time must be after start time'),
    );

    expect(prisma.booking.findFirst).not.toHaveBeenCalled();
  });

  it('rejects overlapping bookings', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);

    await expect(
      service.create({
        providerId,
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Provider already has a booking that overlaps this time range',
      ),
    );

    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it('throws when booking is not found', async () => {
    prisma.booking.findUnique.mockResolvedValue(null);

    await expect(service.findById(booking.id)).rejects.toThrow(
      new NotFoundException('Booking not found'),
    );
  });
});
