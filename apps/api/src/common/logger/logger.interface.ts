// Defines the contract for all log transports.
// Any new transport (Datadog, Loki, etc) must implement this interface.

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'verbose';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string; // propagated via AsyncLocalStorage from RequestContextMiddleware
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string; // only in development
  };
}

export interface ILogTransport {
  log(entry: LogEntry): void;
}

// DI injection token for transports — allows multiple transports to be registered
export const LOG_TRANSPORTS = Symbol('LOG_TRANSPORTS');
