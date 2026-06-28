import {
  IsEmail,
  IsISO8601,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  providerId!: string;

  @IsString()
  @MinLength(1)
  customerName!: string;

  @IsEmail()
  customerEmail!: string;

  @IsISO8601({ strict: true })
  startTime!: string;

  @IsISO8601({ strict: true })
  endTime!: string;
}
