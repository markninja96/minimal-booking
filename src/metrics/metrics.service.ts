import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

export type MetricsSnapshot = {
  bookingsCreated: number;
  uptimeSeconds: number;
};

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(): Promise<MetricsSnapshot> {
    return {
      bookingsCreated: await this.prisma.booking.count(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
