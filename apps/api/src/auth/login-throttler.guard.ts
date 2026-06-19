import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    // Respeita X-Forwarded-For (Fly.io, proxies, etc.)
    const forwarded = req.headers as Record<string, string | string[] | undefined>;
    const xForwardedFor = forwarded['x-forwarded-for'];

    const ip = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : (xForwardedFor?.split(',')[0] ?? (req.ip as string | undefined) ?? 'unknown');

    return Promise.resolve(ip.trim());
  }

  protected getErrorMessage(): Promise<string> {
    return Promise.resolve('Muitas tentativas de login. Tente novamente em 1 minuto.');
  }
}
