import * as Sentry from '@sentry/react';
import type { Breadcrumb, ErrorEvent } from '@sentry/react';

export type ImportantEventName =
  | 'app.startup'
  | 'auth.sign_in'
  | 'auth.sign_up'
  | 'auth.password_reset'
  | 'auth.password_update'
  | 'auth.sign_out'
  | 'app.error_boundary';

export type ImportantEventOutcome = 'started' | 'succeeded' | 'failed';

const sensitiveAssignments = /\b(access[_-]?token|refresh[_-]?token|authorization|password|secret|api[_-]?key|apikey|token)\s*[:=]\s*([^\s&]+)/gi;
const bearerToken = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const jwt = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const emailAddress = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const uuid = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

export function sanitizeObservabilityText(value: string): string {
  return value
    .replace(bearerToken, 'Bearer [REDACTED]')
    .replace(jwt, '[REDACTED]')
    .replace(sensitiveAssignments, '$1=[REDACTED]')
    .replace(emailAddress, '[EMAIL]')
    .replace(uuid, '[ID]');
}

export function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent {
  event.message = undefined;
  event.logentry = undefined;
  if (event.exception?.values) {
    for (const exception of event.exception.values) {
      exception.type = exception.type && /^[A-Za-z][A-Za-z0-9_.]{0,79}$/.test(exception.type)
        ? exception.type
        : 'ApplicationError';
      exception.value = exception.type;
      if (exception.mechanism) exception.mechanism.data = undefined;
    }
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .filter((breadcrumb) => breadcrumb.category === 'app.lifecycle' || breadcrumb.category === 'auth')
      .map((breadcrumb) => ({
        ...breadcrumb,
        message: breadcrumb.message ? sanitizeObservabilityText(breadcrumb.message) : undefined,
        data: undefined,
      }));
  }

  event.request = undefined;
  event.user = undefined;
  event.extra = undefined;
  event.contexts = undefined;
  event.tags = undefined;
  event.transaction = event.transaction ? sanitizeObservabilityText(event.transaction.split(/[?#]/, 1)[0]) : undefined;
  event.server_name = undefined;
  return event;
}

function filterBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category !== 'app.lifecycle' && breadcrumb.category !== 'auth') return null;
  breadcrumb.message = breadcrumb.message ? sanitizeObservabilityText(breadcrumb.message) : undefined;
  breadcrumb.data = undefined;
  return breadcrumb;
}

let initialized = false;

export function initializeObservability(dsn = import.meta.env.VITE_SENTRY_DSN?.trim() ?? ''): boolean {
  if (initialized) return true;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    maxBreadcrumbs: 20,
    maxValueLength: 200,
    beforeSend: sanitizeSentryEvent,
    beforeBreadcrumb: filterBreadcrumb,
  });

  initialized = true;
  recordImportantEvent('app.startup', 'succeeded');
  return true;
}

export function recordImportantEvent(name: ImportantEventName, outcome: ImportantEventOutcome): void {
  Sentry.addBreadcrumb({
    category: name.startsWith('auth.') ? 'auth' : 'app.lifecycle',
    message: `${name}:${outcome}`,
    level: outcome === 'failed' ? 'warning' : 'info',
  });
}

export function captureAppError(error: Error): void {
  Sentry.captureException(error);
}
