import {
  IsEmail,
  IsISO8601,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  providerId!: string;

  @IsString()
  @MinLength(1)
  @Matches(/\S/, {
    message: 'customerName must contain at least one non-whitespace character',
  })
  customerName!: string;

  @IsEmail()
  customerEmail!: string;

  @IsISO8601({ strict: true })
  startTime!: string;

  @IsISO8601({ strict: true })
  endTime!: string;
}
