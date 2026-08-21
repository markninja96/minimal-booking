import { HttpException, HttpStatus, Controller } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Booking } from '@prisma/client';

import { AuthenticatedUser } from '../auth/auth.types';
import { BookingsService } from '../bookings/bookings.service';
import {
  BookingGrpcResponse,
  CreateBookingGrpcRequest,
} from './bookings-grpc.types';

const INTERNAL_GRPC_USER: AuthenticatedUser = {
  sub: 'grpc-internal',
  role: 'admin',
};

@Controller()
export class BookingsGrpcController {
  constructor(private readonly bookingsService: BookingsService) {}

  @GrpcMethod('BookingsService', 'CreateBooking')
  async createBooking(
    request: CreateBookingGrpcRequest,
  ): Promise<BookingGrpcResponse> {
    try {
      const booking = await this.bookingsService.create(
        request,
        INTERNAL_GRPC_USER,
      );

      return this.toGrpcResponse(booking);
    } catch (error) {
      throw this.toRpcException(error);
    }
  }

  private toGrpcResponse(booking: Booking): BookingGrpcResponse {
    return {
      id: booking.id,
      providerId: booking.providerId,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      status: booking.status,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };
  }

  private toRpcException(error: unknown): RpcException {
    if (!(error instanceof HttpException)) {
      return new RpcException({
        code: status.UNKNOWN,
        message: 'Internal server error',
      });
    }

    return new RpcException({
      code: this.toGrpcStatus(error.getStatus()),
      message: this.toErrorMessage(error),
    });
  }

  private toGrpcStatus(httpStatus: number): status {
    switch (httpStatus) {
      case HttpStatus.BAD_REQUEST:
        return status.INVALID_ARGUMENT;
      case HttpStatus.FORBIDDEN:
        return status.PERMISSION_DENIED;
      case HttpStatus.NOT_FOUND:
        return status.NOT_FOUND;
      default:
        return status.UNKNOWN;
    }
  }

  private toErrorMessage(error: HttpException): string {
    const response = error.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object' && response !== null) {
      const message = (response as { message?: unknown }).message;

      if (Array.isArray(message)) {
        return message.join('; ');
      }

      if (typeof message === 'string') {
        return message;
      }
    }

    return error.message;
  }
}
