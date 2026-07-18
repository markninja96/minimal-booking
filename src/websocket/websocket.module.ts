import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../redis/redis.module';
import { BookingsGateway } from './bookings.gateway';

@Module({
  imports: [AuthModule, RedisModule],
  providers: [BookingsGateway],
})
export class WebsocketModule {}
