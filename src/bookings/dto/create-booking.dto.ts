import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsISO8601,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    example: '499c1465-884f-4438-ab54-11e565a90c48',
    format: 'uuid',
  })
  @IsUUID()
  providerId!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(1)
  @Matches(/\S/, {
    message: 'customerName must contain at least one non-whitespace character',
  })
  customerName!: string;

  @ApiProperty({ example: 'jane@example.com', format: 'email' })
  @IsEmail()
  customerEmail!: string;

  @ApiProperty({
    example: '2027-06-22T10:00:00.000Z',
    format: 'date-time',
  })
  @IsISO8601({ strict: true })
  startTime!: string;

  @ApiProperty({
    example: '2027-06-22T10:30:00.000Z',
    format: 'date-time',
  })
  @IsISO8601({ strict: true })
  endTime!: string;
}
