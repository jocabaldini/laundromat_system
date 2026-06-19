import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { ConsoleTransport } from './transports/console.transport';
import { LOG_TRANSPORTS } from './logger.interface';

// Global module — LoggerService is available in every module without explicit import.
//
// To add a new transport (e.g. DatadogTransport):
//   1. Create the transport class implementing ILogTransport
//   2. Add it to the providers array below using the LOG_TRANSPORTS token
@Global()
@Module({
  providers: [
    ConsoleTransport,
    {
      // Multi-provider: all transports registered under this token are injected
      // as an array into LoggerService. Add new transports here.
      provide: LOG_TRANSPORTS,
      useFactory: (console: ConsoleTransport) => [console],
      inject: [ConsoleTransport],
    },
    LoggerService,
  ],
  exports: [LoggerService],
})
export class LoggerModule {}
