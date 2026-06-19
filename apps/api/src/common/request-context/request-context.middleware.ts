import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { requestContextStorage } from './request-context';

// Generates or forwards a unique ID for each incoming request.
// The ID is stored in AsyncLocalStorage so it's automatically available
// to any code running within the same async context (services, filters, etc).
//
// Clients and proxies may send X-Request-ID — if present, it is reused.
// The final ID is always echoed back in the response header.
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id'];
    const requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();

    res.setHeader('x-request-id', requestId);

    // Run the rest of the request pipeline inside the AsyncLocalStorage context
    requestContextStorage.run({ requestId }, next);
  }
}
