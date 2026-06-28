import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Booking, BookingStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { PaginatedBookings } from './types/paginated-bookings.type';

const OVERLAP_ERROR_MESSAGE = 'A booking overlaps with this time range';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBookingDto: CreateBookingDto): Promise<Booking> {
    const startTime = this.parseUtcDate(
      createBookingDto.startTime,
      'startTime',
    );
    const endTime = this.parseUtcDate(createBookingDto.endTime, 'endTime');

    this.validateTimeRange(startTime, endTime);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const overlappingBooking = await tx.booking.findFirst({
            where: {
              providerId: createBookingDto.providerId,
              status: BookingStatus.confirmed,
              startTime: { lt: endTime },
              endTime: { gt: startTime },
            },
          });

          if (overlappingBooking) {
            throw new BadRequestException(OVERLAP_ERROR_MESSAGE);
          }

          return tx.booking.create({
            data: {
              providerId: createBookingDto.providerId,
              customerName: createBookingDto.customerName,
              customerEmail: createBookingDto.customerEmail,
              startTime,
              endTime,
              status: BookingStatus.confirmed,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (this.isOverlapConstraintError(error)) {
        throw new BadRequestException(OVERLAP_ERROR_MESSAGE);
      }

      throw error;
    }
  }

  async findById(id: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async list(query: ListBookingsQueryDto): Promise<PaginatedBookings> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const now = new Date();
    const where =
      query.type === 'past'
        ? { endTime: { lt: now } }
        : { endTime: { gte: now } };

    const [total, bookings] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        orderBy: { startTime: query.type === 'past' ? 'desc' : 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: bookings,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  private parseUtcDate(value: string, fieldName: string): Date {
    if (!value.endsWith('Z')) {
      throw new BadRequestException(
        `${fieldName} must be a UTC ISO 8601 date string`,
      );
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        `${fieldName} must be a valid ISO 8601 date string`,
      );
    }

    return date;
  }

  private validateTimeRange(startTime: Date, endTime: Date): void {
    if (startTime <= new Date()) {
      throw new BadRequestException('Start time must be in the future');
    }

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }
  }

  private isOverlapConstraintError(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    return (
      error.code === 'P2034' ||
      (error.code === 'P2004' &&
        String(error.meta?.database_error ?? '').includes(
          'Booking_no_provider_overlap_excl',
        ))
    );
  }
}
