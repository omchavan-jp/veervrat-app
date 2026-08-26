import { ApiError } from './client';

// The API answers a rejected request with a specific, actionable sentence — "A pending global VM
// invitation already exists. Cancel it before sending a new one." Until 2026-08-27 every toast
// threw that away and said "Couldn't send the invitation", leaving the person with no idea what
// to do. 36 handlers did this; 18 did not. This is the one place that decides.
//
// Only 4xx messages are surfaced. A 4xx is the API telling the caller something about *their*
// request, and every one is authored in `app.exceptions.ts` for a person to read. A 5xx is not:
// an unhandled error already returns a generic string, but an `HttpException` thrown with a 5xx
// status carries whatever text the thrower chose, which is written for a log, not a user.
// Network failures have no server message at all.
const CLIENT_ERROR_FLOOR = 400;
const SERVER_ERROR_FLOOR = 500;

export function errorMessage(err: unknown, fallback: string): string {
  if (
    err instanceof ApiError &&
    err.statusCode >= CLIENT_ERROR_FLOOR &&
    err.statusCode < SERVER_ERROR_FLOOR &&
    err.message.trim().length > 0
  ) {
    return err.message;
  }
  return fallback;
}
