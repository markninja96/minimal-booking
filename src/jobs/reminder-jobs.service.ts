import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Booking } from '@prisma/client';
import { Job, Queue, Worker } from 'bullmq';

import {
  REMINDER_JOB_NAME,
  REMINDER_LEAD_TIME_MS,
  REMINDER_QUEUE_NAME,
} from './reminder-jobs.constants';

export type ReminderJobData = {
  bookingId: string;
  providerId: string;
  customerName: string;
  customerEmail: string;
  startTime: string;
  endTime: string;
};

export const calculateReminderDelay = (
  startTime: Date,
  now = new Date(),
): number =>
  Math.max(startTime.getTime() - REMINDER_LEAD_TIME_MS - now.getTime(), 0);

@Injectable()
export class ReminderJobsService implements OnModuleDestroy {
  private readonly logger = new Logger(ReminderJobsService.name);
  private readonly queue?: Queue<ReminderJobData>;
  private readonly worker?: Worker<ReminderJobData>;

  constructor(configService: ConfigService) {
    const enabled = configService.get<string>('REDIS_ENABLED') !== 'false';

    if (!enabled) {
      return;
    }

    const connection = {
      host: configService.get<string>('REDIS_HOST') ?? 'localhost',
      maxRetriesPerRequest: null,
      port: Number(configService.get<string>('REDIS_PORT') ?? 6379),
    };

    this.queue = new Queue<ReminderJobData>(REMINDER_QUEUE_NAME, {
      connection,
    });
    this.worker = new Worker<ReminderJobData>(
      REMINDER_QUEUE_NAME,
      (job) => this.processReminder(job),
      { connection },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Reminder job ${job?.id ?? 'unknown'} failed`,
        error.stack,
      );
    });
    this.worker.on('error', (error) => {
      this.logger.error('Reminder worker error', error.stack);
    });
    this.queue.on('error', (error) => {
      this.logger.error('Reminder queue error', error.stack);
    });
  }

  async scheduleBookingReminder(booking: Booking): Promise<void> {
    if (!this.queue) {
      return;
    }

    await this.queue.add(REMINDER_JOB_NAME, this.toReminderJobData(booking), {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      delay: calculateReminderDelay(booking.startTime),
      removeOnComplete: true,
      removeOnFail: 100,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.worker?.close().catch(() => undefined),
      this.queue?.close().catch(() => undefined),
    ]);
  }

  private async processReminder(job: Job<ReminderJobData>): Promise<void> {
    this.logger.log(
      JSON.stringify({
        event: REMINDER_JOB_NAME,
        ...job.data,
      }),
    );
  }

  private toReminderJobData(booking: Booking): ReminderJobData {
    return {
      bookingId: booking.id,
      providerId: booking.providerId,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
    };
  }
}
