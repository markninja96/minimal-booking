import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

type RedisMessageHandler = (message: string) => void | Promise<void>;

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly enabled: boolean;
  private readonly publisher?: Redis;
  private readonly subscriber?: Redis;

  constructor(configService: ConfigService) {
    this.enabled = configService.get<string>('REDIS_ENABLED') !== 'false';

    if (!this.enabled) {
      return;
    }

    const host = configService.get<string>('REDIS_HOST') ?? 'localhost';
    const port = Number(configService.get<string>('REDIS_PORT') ?? 6379);

    this.publisher = new Redis({ host, port, lazyConnect: true });
    this.subscriber = new Redis({ host, port, lazyConnect: true });
  }

  async publish(channel: string, payload: unknown): Promise<void> {
    if (!this.publisher) {
      return;
    }

    await this.publisher.publish(channel, JSON.stringify(payload));
  }

  async subscribe(
    channel: string,
    handler: RedisMessageHandler,
  ): Promise<void> {
    if (!this.subscriber) {
      return;
    }

    this.subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        void handler(message);
      }
    });

    await this.subscriber.subscribe(channel);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.publisher?.quit().catch(() => undefined),
      this.subscriber?.quit().catch(() => undefined),
    ]);
  }
}
