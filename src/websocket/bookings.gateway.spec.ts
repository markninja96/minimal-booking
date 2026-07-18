import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

import { BOOKING_CREATED_CHANNEL } from '../redis/redis.constants';
import { RedisService } from '../redis/redis.service';
import { BookingsGateway } from './bookings.gateway';

describe('BookingsGateway', () => {
  let gateway: BookingsGateway;
  let jwtService: { verify: jest.Mock };
  let redis: { subscribe: jest.Mock };
  let server: { to: jest.Mock; emit: jest.Mock };

  const providerId = '499c1465-884f-4438-ab54-11e565a90c48';

  beforeEach(() => {
    jwtService = { verify: jest.fn() };
    redis = { subscribe: jest.fn() };
    server = {
      to: jest.fn(),
      emit: jest.fn(),
    };
    server.to.mockReturnValue(server);

    gateway = new BookingsGateway(
      jwtService as unknown as JwtService,
      redis as unknown as RedisService,
    );
    Object.defineProperty(gateway, 'server', { value: server });
  });

  it('joins provider sockets to their provider room', () => {
    jwtService.verify.mockReturnValue({ sub: providerId, role: 'provider' });
    const client = createSocket('token');

    gateway.handleConnection(client as unknown as Socket);

    expect(client.join).toHaveBeenCalledWith(`provider:${providerId}`);
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('joins admin sockets to the admins room', () => {
    jwtService.verify.mockReturnValue({ sub: providerId, role: 'admin' });
    const client = createSocket('token');

    gateway.handleConnection(client as unknown as Socket);

    expect(client.join).toHaveBeenCalledWith('admins');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('disconnects sockets with invalid tokens', () => {
    jwtService.verify.mockReturnValue({ sub: providerId, role: 'viewer' });
    const client = createSocket('token');

    gateway.handleConnection(client as unknown as Socket);

    expect(client.join).not.toHaveBeenCalled();
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('subscribes to Redis and emits booking.created to provider and admin rooms', async () => {
    let handler: ((message: string) => void) | undefined;
    redis.subscribe.mockImplementation(
      async (
        _channel: string,
        subscribedHandler: (message: string) => void,
      ) => {
        handler = subscribedHandler;
      },
    );

    await gateway.afterInit();

    expect(redis.subscribe).toHaveBeenCalledWith(
      BOOKING_CREATED_CHANNEL,
      expect.any(Function),
    );

    handler?.(
      JSON.stringify({
        id: 'e30dea06-d465-4a91-ae8a-438a5b1eef35',
        providerId,
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        startTime: '2027-06-22T10:00:00.000Z',
        endTime: '2027-06-22T10:30:00.000Z',
      }),
    );

    expect(server.to).toHaveBeenCalledWith(`provider:${providerId}`);
    expect(server.to).toHaveBeenCalledWith('admins');
    expect(server.emit).toHaveBeenCalledWith(
      BOOKING_CREATED_CHANNEL,
      expect.objectContaining({ providerId }),
    );
  });
});

const createSocket = (token?: string) => ({
  handshake: { auth: { token } },
  join: jest.fn(),
  disconnect: jest.fn(),
});
