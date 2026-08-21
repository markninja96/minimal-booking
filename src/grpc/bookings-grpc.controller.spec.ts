import { BadRequestException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Booking, BookingStatus } from '@prisma/client';

import { BookingsService } from '../bookings/bookings.service';
import { BookingsGrpcController } from './bookings-grpc.controller';
import { CreateBookingGrpcRequest } from './bookings-grpc.types';

describe('BookingsGrpcController', () => {
  let controller: BookingsGrpcController;
  let bookingsService: {
    create: jest.Mock;
  };

  const request: CreateBookingGrpcRequest = {
    providerId: '499c1465-884f-4438-ab54-11e565a90c48',
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    startTime: '2027-06-22T10:00:00.000Z',
    endTime: '2027-06-22T10:30:00.000Z',
  };
  const booking: Booking = {
    id: 'e30dea06-d465-4a91-ae8a-438a5b1eef35',
    providerId: request.providerId,
    customerName: request.customerName,
    customerEmail: request.customerEmail,
    startTime: new Date(request.startTime),
    endTime: new Date(request.endTime),
    status: BookingStatus.confirmed,
    createdAt: new Date('2026-07-04T10:00:00.000Z'),
    updatedAt: new Date('2026-07-04T10:01:00.000Z'),
  };

  beforeEach(() => {
    bookingsService = {
      create: jest.fn(),
    };
    controller = new BookingsGrpcController(
      bookingsService as unknown as BookingsService,
    );
  });

  it('creates bookings through the shared booking service', async () => {
    bookingsService.create.mockResolvedValue(booking);

    await expect(controller.createBooking(request)).resolves.toEqual({
      id: booking.id,
      providerId: booking.providerId,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      startTime: '2027-06-22T10:00:00.000Z',
      endTime: '2027-06-22T10:30:00.000Z',
      status: 'confirmed',
      createdAt: '2026-07-04T10:00:00.000Z',
      updatedAt: '2026-07-04T10:01:00.000Z',
    });

    expect(bookingsService.create).toHaveBeenCalledWith(request, {
      sub: 'grpc-internal',
      role: 'admin',
    });
  });

  it('maps booking validation errors to gRPC invalid argument errors', async () => {
    bookingsService.create.mockRejectedValue(
      new BadRequestException('A booking overlaps with this time range'),
    );

    await expect(controller.createBooking(request)).rejects.toThrow(
      RpcException,
    );

    try {
      await controller.createBooking(request);
    } catch (error) {
      expect((error as RpcException).getError()).toEqual({
        code: status.INVALID_ARGUMENT,
        message: 'A booking overlaps with this time range',
      });
    }
  });
});
