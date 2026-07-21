import { Module } from '@nestjs/common';

import { JobsModule } from '../jobs/jobs.module';
import { RedisModule } from '../redis/redis.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingEventsPublisher } from './events/booking-events.publisher';

@Module({
  imports: [JobsModule, RedisModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingEventsPublisher],
})
export class BookingsModule {}
