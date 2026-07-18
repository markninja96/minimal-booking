import { JwtService } from '@nestjs/jwt';
import { config } from 'dotenv';
import { io, Socket } from 'socket.io-client';

import { JwtPayload } from '../src/auth/auth.types';
import { BookingCreatedEvent } from '../src/bookings/events/booking-created.event';

config({ quiet: true });

const baseUrl = process.env.WS_SMOKE_BASE_URL ?? 'http://localhost:3000';
const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret';
const providerId = '499c1465-884f-4438-ab54-11e565a90c48';
const otherProviderId = 'e1cf3eb2-3702-4296-9436-aea369a1feca';
const adminId = '9cddf29f-9b5e-47ed-9bd6-8c334075067f';
const eventName = 'booking.created';
const adminsRoom = 'admins';
const providerRoom = (id: string): string => `provider:${id}`;

const jwtService = new JwtService({ secret: jwtSecret });

async function main(): Promise<void> {
  const providerToken = signToken({ sub: providerId, role: 'provider' });
  const otherProviderToken = signToken({
    sub: otherProviderId,
    role: 'provider',
  });
  const adminToken = signToken({ sub: adminId, role: 'admin' });

  const providerSocket = await connectSocket('provider', providerToken);
  const otherProviderSocket = await connectSocket(
    'other provider',
    otherProviderToken,
  );
  const adminSocket = await connectSocket('admin', adminToken);

  try {
    logLiveEvents(providerSocket, 'provider', providerRoom(providerId));
    logLiveEvents(
      otherProviderSocket,
      'other provider',
      providerRoom(otherProviderId),
    );
    logLiveEvents(adminSocket, 'admin', adminsRoom);

    process.stdout.write(
      [
        'Connected provider, other provider, and admin sockets',
        '',
        'Expected server rooms:',
        `provider socket -> ${providerRoom(providerId)}`,
        `other provider socket -> ${providerRoom(otherProviderId)}`,
        `admin socket -> ${adminsRoom}`,
        '',
        'Provider IDs for Bruno or Swagger:',
        `providerId: ${providerId}`,
        `otherProviderId: ${otherProviderId}`,
        '',
        'Create bookings through Bruno or Swagger to observe live events.',
        'REST auth errors stay in the REST client because rejected requests do not publish WebSocket events.',
        'Press Ctrl+C to stop.',
      ].join('\n') + '\n',
    );
    await waitForShutdown();
  } finally {
    providerSocket.disconnect();
    otherProviderSocket.disconnect();
    adminSocket.disconnect();
  }
}

function signToken(payload: JwtPayload): string {
  return jwtService.sign(payload);
}

function connectSocket(label: string, token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(baseUrl, {
      auth: { token },
      reconnection: false,
      timeout: 2_000,
    });
    const timer = setTimeout(() => {
      cleanup();
      socket.disconnect();
      reject(new Error(`${label} socket did not connect`));
    }, 3_000);

    const cleanup = (): void => {
      clearTimeout(timer);
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
    };
    const onConnect = (): void => {
      cleanup();
      resolve(socket);
    };
    const onConnectError = (error: Error): void => {
      cleanup();
      socket.disconnect();
      reject(new Error(`${label} socket failed to connect: ${error.message}`));
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
  });
}

function logLiveEvents(socket: Socket, label: string, room: string): void {
  socket.on(eventName, (payload: BookingCreatedEvent) => {
    process.stdout.write(
      `[${label} | room ${room}] received ${eventName}: ${JSON.stringify(payload)}\n`,
    );
  });
}

function waitForShutdown(): Promise<void> {
  return new Promise((resolve) => {
    const shutdown = (): void => {
      process.stdout.write('Stopping WebSocket smoke test\n');
      process.off('SIGINT', shutdown);
      process.off('SIGTERM', shutdown);
      resolve();
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'WebSocket smoke test failed'}\n`,
  );
  process.exit(1);
});
