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

  it('returns persisted booking metrics', async () => {
    prisma.booking.count.mockResolvedValue(2);

    const metrics = await service.getMetrics();

    expect(metrics).toEqual({
      bookingsCreated: 2,
      uptimeSeconds: expect.any(Number) as number,
    });

    expect(prisma.booking.count).toHaveBeenCalledWith();
    expect(metrics.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
