import { ConfigService } from '@nestjs/config';
import { Booking, BookingStatus } from '@prisma/client';

import { REMINDER_JOB_NAME } from './reminder-jobs.constants';
import {
  calculateReminderDelay,
  ReminderJobsService,
} from './reminder-jobs.service';

describe('calculateReminderDelay', () => {
  it('returns the delay until 10 minutes before booking start', () => {
    const now = new Date('2027-06-22T10:00:00.000Z');
    const startTime = new Date('2027-06-22T10:30:00.000Z');

    expect(calculateReminderDelay(startTime, now)).toBe(20 * 60 * 1000);
  });

  it('returns zero when the booking starts in less than 10 minutes', () => {
    const now = new Date('2027-06-22T10:00:00.000Z');
    const startTime = new Date('2027-06-22T10:05:00.000Z');

    expect(calculateReminderDelay(startTime, now)).toBe(0);
  });
});

describe('ReminderJobsService', () => {
  const booking: Booking = {
    id: 'e30dea06-d465-4a91-ae8a-438a5b1eef35',
    providerId: '499c1465-884f-4438-ab54-11e565a90c48',
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    startTime: new Date('2027-06-22T10:30:00.000Z'),
    endTime: new Date('2027-06-22T11:00:00.000Z'),
    status: BookingStatus.confirmed,
    createdAt: new Date('2027-06-01T10:00:00.000Z'),
    updatedAt: new Date('2027-06-01T10:00:00.000Z'),
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2027-06-22T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('enqueues reminder jobs with payload, retry options, and calculated delay', async () => {
    const service = new ReminderJobsService({
      get: jest.fn().mockReturnValue('false'),
    } as unknown as ConfigService);
    const queue = { add: jest.fn() };

    Object.defineProperty(service, 'queue', { value: queue });

    await service.scheduleBookingReminder(booking);

    expect(queue.add).toHaveBeenCalledWith(
      REMINDER_JOB_NAME,
      {
        bookingId: booking.id,
        providerId: booking.providerId,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        delay: 20 * 60 * 1000,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  });
});
