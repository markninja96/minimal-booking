import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    DatabaseModule,
    HealthModule,
    BookingsModule,
    WebsocketModule,
  ],
})
export class AppModule {}
