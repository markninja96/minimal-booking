import { Booking, BookingStatus } from '@prisma/client';

import { BOOKING_CREATED_CHANNEL } from '../../redis/redis.constants';
import { RedisService } from '../../redis/redis.service';
import { BookingEventsPublisher } from './booking-events.publisher';

describe('BookingEventsPublisher', () => {
  it('publishes booking.created payloads to Redis', async () => {
    const redis = {
      publish: jest.fn(),
    };
    const publisher = new BookingEventsPublisher(
      redis as unknown as RedisService,
    );
    const booking: Booking = {
      id: 'e30dea06-d465-4a91-ae8a-438a5b1eef35',
      providerId: '499c1465-884f-4438-ab54-11e565a90c48',
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      startTime: new Date('2027-06-22T10:00:00.000Z'),
      endTime: new Date('2027-06-22T10:30:00.000Z'),
      status: BookingStatus.confirmed,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await publisher.publishCreated(booking);

    expect(redis.publish).toHaveBeenCalledWith(BOOKING_CREATED_CHANNEL, {
      id: booking.id,
      providerId: booking.providerId,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      startTime: '2027-06-22T10:00:00.000Z',
      endTime: '2027-06-22T10:30:00.000Z',
    });
  });
});
