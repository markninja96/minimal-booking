import { Module } from '@nestjs/common';

import { ReminderJobsService } from './reminder-jobs.service';

@Module({
  providers: [ReminderJobsService],
  exports: [ReminderJobsService],
})
export class JobsModule {}
