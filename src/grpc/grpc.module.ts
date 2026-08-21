import { Module } from '@nestjs/common';

import { BookingsModule } from '../bookings/bookings.module';
import { BookingsGrpcController } from './bookings-grpc.controller';

@Module({
  imports: [BookingsModule],
  controllers: [BookingsGrpcController],
})
export class GrpcModule {}
