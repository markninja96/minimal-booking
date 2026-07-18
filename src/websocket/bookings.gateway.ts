import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { AuthenticatedUser, isUserRole, JwtPayload } from '../auth/auth.types';
import { BookingCreatedEvent } from '../bookings/events/booking-created.event';
import { BOOKING_CREATED_CHANNEL } from '../redis/redis.constants';
import { RedisService } from '../redis/redis.service';

const ADMINS_ROOM = 'admins';
const providerRoom = (providerId: string) => `provider:${providerId}`;

@WebSocketGateway({ cors: { origin: '*' } })
export class BookingsGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
  ) {}

  async afterInit(): Promise<void> {
    await this.redis.subscribe(BOOKING_CREATED_CHANNEL, (message) => {
      this.broadcastBookingCreated(message);
    });
  }

  handleConnection(client: Socket): void {
    const user = this.authenticate(client);

    if (!user) {
      client.disconnect(true);
      return;
    }

    if (user.role === 'admin') {
      void client.join(ADMINS_ROOM);
      return;
    }

    void client.join(providerRoom(user.sub));
  }

  private authenticate(client: Socket): AuthenticatedUser | null {
    const token = client.handshake.auth?.token;

    if (typeof token !== 'string' || !token) {
      return null;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      if (!payload.sub || !isUserRole(payload.role)) {
        return null;
      }

      return { sub: payload.sub, role: payload.role };
    } catch {
      return null;
    }
  }

  private broadcastBookingCreated(message: string): void {
    const event = this.parseBookingCreatedEvent(message);

    if (!event) {
      return;
    }

    this.server
      .to(providerRoom(event.providerId))
      .to(ADMINS_ROOM)
      .emit(BOOKING_CREATED_CHANNEL, event);
  }

  private parseBookingCreatedEvent(
    message: string,
  ): BookingCreatedEvent | null {
    try {
      const event = JSON.parse(message) as Partial<BookingCreatedEvent>;

      if (
        typeof event.id !== 'string' ||
        typeof event.providerId !== 'string' ||
        typeof event.customerName !== 'string' ||
        typeof event.customerEmail !== 'string' ||
        typeof event.startTime !== 'string' ||
        typeof event.endTime !== 'string'
      ) {
        return null;
      }

      return event as BookingCreatedEvent;
    } catch {
      return null;
    }
  }
}
