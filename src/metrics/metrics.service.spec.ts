import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let prisma: {
    booking: {
      count: jest.Mock;
    };
  };
  let service: MetricsService;

  beforeEach(() => {
    prisma = {
      booking: {
        count: jest.fn(),
      },
    };
    service = new MetricsService(prisma as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns persisted booking metrics', async () => {
    jest.spyOn(process, 'uptime').mockReturnValue(12.8);
    prisma.booking.count.mockResolvedValue(2);

    const metrics = await service.getMetrics();

    expect(metrics).toEqual({
      bookingsCreated: 2,
      uptimeSeconds: 12,
    });

    expect(prisma.booking.count).toHaveBeenCalledWith();
  });
});
