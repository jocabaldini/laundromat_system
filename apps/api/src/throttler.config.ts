import { ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ConfigService } from '@nestjs/config';
import type { Redis as RedisType } from 'ioredis';
import Redis from 'ioredis';

export function throttlerConfig(config: ConfigService): ThrottlerModuleOptions {
  const redisUrl = config.get<string>('REDIS_URL');

  let storage: ThrottlerStorage | undefined;

  if (redisUrl) {
    const client: RedisType = new Redis(redisUrl);

    storage = new ThrottlerStorageRedisService(client) as unknown as ThrottlerStorage;
  }

  const options: ThrottlerModuleOptions = {
    throttlers: [
      {
        name: 'global',
        ttl: 60_000,
        limit: 60,
      },
    ],
    ...(storage && { storage }),
  };

  return options;
}
