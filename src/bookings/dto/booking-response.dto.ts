import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';

export class BookingResponseDto {
  @ApiProperty({ example: 'e30dea06-d465-4a91-ae8a-438a5b1eef35' })
  id!: string;

  @ApiProperty({ example: '499c1465-884f-4438-ab54-11e565a90c48' })
  providerId!: string;

  @ApiProperty({ example: 'Jane Doe' })
  customerName!: string;

  @ApiProperty({ example: 'jane@example.com' })
  customerEmail!: string;

  @ApiProperty({ example: '2027-06-22T10:00:00.000Z', format: 'date-time' })
  startTime!: Date;

  @ApiProperty({ example: '2027-06-22T10:30:00.000Z', format: 'date-time' })
  endTime!: Date;

  @ApiProperty({ enum: BookingStatus, example: BookingStatus.confirmed })
  status!: BookingStatus;

  @ApiProperty({ example: '2026-07-04T10:00:00.000Z', format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-07-04T10:00:00.000Z', format: 'date-time' })
  updatedAt!: Date;
}
