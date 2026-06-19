import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';

// Maps Prisma error codes to HTTP status and a generic message
const PRISMA_ERROR_MAP: Record<string, { status: number; message: string }> = {
  P2000: { status: HttpStatus.BAD_REQUEST, message: 'Input value too long' },
  P2002: { status: HttpStatus.CONFLICT, message: 'Resource already exists' },
  P2003: { status: HttpStatus.BAD_REQUEST, message: 'Foreign key constraint failed' },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Resource not found' },
};

interface ErrorBody {
  statusCode: number;
  error: string;
  // A single string for most errors; an array when multiple validation messages are present
  message: string | string[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const body = this.buildErrorBody(exception);

    // Log 5xx errors — these are unexpected and need visibility
    if (body.statusCode >= 500) {
      this.logger.error('Unhandled exception', exception, {
        path: request.url,
        method: request.method,
      });
    }

    response.status(body.statusCode).json(body);
  }

  private buildErrorBody(exception: unknown): ErrorBody {
    // Known HTTP exceptions thrown explicitly in controllers/services
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      let message: string | string[];

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null && 'message' in res) {
        const raw = (res as Record<string, unknown>)['message'];
        if (Array.isArray(raw)) {
          // Return all validation messages instead of only the first
          message = raw.map((item) => (typeof item === 'string' ? item : String(item)));
        } else {
          message = typeof raw === 'string' ? raw : String(raw);
        }
      } else {
        message = exception.message;
      }

      return {
        statusCode: status,
        error: this.statusText(status),
        message,
      };
    }

    // Known Prisma errors (constraint violations, not found, etc)
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = PRISMA_ERROR_MAP[exception.code];

      if (mapped) {
        return {
          statusCode: mapped.status,
          error: this.statusText(mapped.status),
          message: mapped.message,
        };
      }
    }

    // Prisma validation errors (malformed queries — should not reach production)
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Invalid database query',
      };
    }

    // Anything else is an unexpected internal error
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    };
  }

  // Returns the standard HTTP status text for a given status code
  private statusText(status: number): string {
    return (
      HttpStatus[status]
        ?.split('_')
        .map((w) => w[0] + w.slice(1).toLowerCase())
        .join(' ') ?? 'Error'
    );
  }
}
