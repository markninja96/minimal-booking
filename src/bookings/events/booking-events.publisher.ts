import { Injectable } from '@nestjs/common';
import { Booking } from '@prisma/client';

import { BOOKING_CREATED_CHANNEL } from '../../redis/redis.constants';
import { RedisService } from '../../redis/redis.service';
import { BookingCreatedEvent } from './booking-created.event';

@Injectable()
export class BookingEventsPublisher {
  constructor(private readonly redis: RedisService) {}

  async publishCreated(booking: Booking): Promise<void> {
    const event: BookingCreatedEvent = {
      id: booking.id,
      providerId: booking.providerId,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
    };

    await this.redis.publish(BOOKING_CREATED_CHANNEL, event);
  }
}
