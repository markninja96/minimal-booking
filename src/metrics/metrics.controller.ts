import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { MetricsService, MetricsSnapshot } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOkResponse({
    schema: {
      example: {
        bookingsCreated: 3,
        uptimeSeconds: 120,
      },
    },
  })
  getMetrics(): Promise<MetricsSnapshot> {
    return this.metricsService.getMetrics();
  }
}
