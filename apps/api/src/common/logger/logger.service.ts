import { Inject, Injectable, Optional } from '@nestjs/common';
import type { LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILogTransport, LOG_TRANSPORTS, LogEntry, LogLevel } from './logger.interface';
import { ConsoleTransport } from './transports/console.transport';
import { getRequestContext } from '../request-context/request-context';

// Implements NestJS's LoggerService interface so it can replace the framework's
// built-in logger via app.useLogger() — making all NestJS internal logs
// (bootstrap, guards, interceptors, etc) go through this structured logger.
@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly transports: ILogTransport[];
  private readonly isDev: boolean;

  constructor(
    private readonly config: ConfigService,
    // Inject registered transports — falls back to ConsoleTransport if none provided.
    // Use LOG_TRANSPORTS token to register additional transports in LoggerModule.
    @Optional() @Inject(LOG_TRANSPORTS) transports?: ILogTransport[],
  ) {
    this.isDev = this.config.get<string>('NODE_ENV') === 'development';
    this.transports = transports ?? [new ConsoleTransport()];
  }

  // ─── Public API (used in application code) ──────────────────────────────────

  info(message: string, context?: Record<string, unknown>): void {
    this.emit('info', message, undefined, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.emit('warn', message, undefined, context);
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    this.emit('error', message, error, context);
  }

  // ─── NestJS LoggerService interface ─────────────────────────────────────────
  // These methods allow NestJS itself to route its internal logs through here.

  log(message: unknown, _context?: string): void {
    this.emit('info', String(message));
  }

  debug(message: unknown, _context?: string): void {
    this.emit('debug', String(message));
  }

  verbose(message: unknown, _context?: string): void {
    this.emit('verbose', String(message));
  }

  fatal(message: unknown, _context?: string): void {
    this.emit('error', String(message));
  }

  // ─── Internals ───────────────────────────────────────────────────────────────

  // Builds the log entry and dispatches it to all registered transports.
  // Automatically includes the requestId from AsyncLocalStorage when available.
  private emit(
    level: LogLevel,
    message: string,
    error?: unknown,
    context?: Record<string, unknown>,
  ): void {
    const requestId = getRequestContext()?.requestId;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(requestId ? { requestId } : {}),
    };

    if (context) entry.context = context;
    if (error) entry.error = this.serializeError(error);

    for (const transport of this.transports) {
      transport.log(entry);
    }
  }

  // Extracts name, message and stack (dev only) from any thrown value.
  private serializeError(error: unknown): LogEntry['error'] {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        ...(this.isDev && error.stack ? { stack: error.stack } : {}),
      };
    }

    // Handles thrown non-Error values (e.g. throw 'something')
    return {
      name: 'UnknownError',
      message: String(error),
    };
  }
}
