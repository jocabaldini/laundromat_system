import { Injectable } from '@nestjs/common';
import { ILogTransport, LogEntry } from '../logger.interface';

// Writes structured JSON log entries to stdout.
// Fly.io, Datadog, Grafana Loki and similar platforms capture stdout automatically.
@Injectable()
export class ConsoleTransport implements ILogTransport {
  log(entry: LogEntry): void {
    const output = JSON.stringify(entry);

    if (entry.level === 'error') {
      console.error(output);
    } else if (entry.level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }
}
