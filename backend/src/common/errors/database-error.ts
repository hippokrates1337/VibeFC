import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

/** What a Supabase/PostgREST call returns as `error`. */
export interface DatabaseError {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

export interface DatabaseErrorContext {
  /** What was being done, for the log and messages: e.g. 'update the forecast'. */
  action: string;
  /** What the request was about, for 400/404 messages: e.g. 'Forecast'. */
  subject: string;
  logger: Logger;
}

const isRowLevelSecurity = (error: DatabaseError) =>
  error.code === '42501' || (error.message ?? '').toLowerCase().includes('row-level security');

/**
 * Maps a Supabase/PostgREST error to an HTTP exception. The response never contains the
 * database message (it can name tables, constraints and values); the log does.
 */
export function toHttpException(error: DatabaseError, { action, subject, logger }: DatabaseErrorContext): HttpException {
  logger.error(`Failed to ${action}: [${error.code ?? 'no code'}] ${error.message ?? ''}`);
  if (isRowLevelSecurity(error)) {
    return new ForbiddenException(`You do not have permission to ${action}`);
  }
  switch (error.code) {
    case 'PGRST116': // .single() found no row
    case 'P0002': // RAISE ... USING ERRCODE = 'no_data_found'
      return new NotFoundException(`${subject} not found`);
    case '23505':
      return new ConflictException(`${subject} already exists`);
    case '23503': // a referenced row does not exist
      return new BadRequestException(`${subject} refers to something that does not exist`);
    case '22P02': // invalid input syntax (e.g. not a UUID)
    case '22007': // invalid date
    case '22008': // date out of range
    case '23502': // missing required value
    case '23514': // check constraint
    case 'P0001': // RAISE EXCEPTION in a function: invalid input
      return new BadRequestException(`Invalid ${subject.toLowerCase()} data`);
    default:
      return new InternalServerErrorException(`Failed to ${action}`);
  }
}

/** Rethrows HTTP exceptions as they are; anything else becomes a generic 500 (logged). */
export function rethrowAsHttp(error: unknown, action: string, logger: Logger): never {
  if (error instanceof HttpException) {
    throw error;
  }
  logger.error(`Failed to ${action}: ${error instanceof Error ? error.message : String(error)}`);
  throw new InternalServerErrorException(`Failed to ${action}`);
}
