import assert from 'node:assert/strict';
import test from 'node:test';
import type { ErrorEvent } from '@sentry/react';
import {
  initializeObservability,
  sanitizeObservabilityText,
  sanitizeSentryEvent,
} from './observability';

test('keeps error reporting disabled when no DSN is configured', () => {
  assert.equal(initializeObservability(''), false);
});

test('redacts credentials, access tokens, JWTs, email addresses, and UUIDs from text', () => {
  const value = [
    'user@example.test',
    'access_token=secret-access-token',
    'password:secret-password',
    'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signature',
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signature',
    '11111111-2222-4333-8444-555555555555',
  ].join(' ');

  const sanitized = sanitizeObservabilityText(value);

  assert.equal(sanitized.includes('user@example.test'), false);
  assert.equal(sanitized.includes('secret-access-token'), false);
  assert.equal(sanitized.includes('secret-password'), false);
  assert.equal(sanitized.includes('eyJ'), false);
  assert.equal(sanitized.includes('11111111-2222-4333-8444-555555555555'), false);
  assert.match(sanitized, /\[EMAIL\]/);
  assert.match(sanitized, /access_token=\[REDACTED\]/);
  assert.match(sanitized, /password=\[REDACTED\]/);
  assert.match(sanitized, /Bearer \[REDACTED\]/);
  assert.match(sanitized, /\[ID\]/);
});

test('removes user, request, payload, and non-app breadcrumbs from Sentry events', () => {
  const event: ErrorEvent = {
    type: undefined,
    message: 'Failed for user@example.test with token=private',
    transaction: '/projects/11111111-2222-4333-8444-555555555555?access_token=private',
    user: { id: '11111111-2222-4333-8444-555555555555', email: 'user@example.test' },
    request: { url: 'https://example.test/path?token=private', headers: { Authorization: 'Bearer private' } },
    extra: { payload: 'sensitive' },
    contexts: { custom: { organization: 'private' } },
    tags: { tenant: 'private' },
    exception: {
      values: [{
        type: 'Error',
        value: 'token=private',
        mechanism: { type: 'generic', handled: true, data: { body: 'sensitive' } },
      }],
    },
    breadcrumbs: [
      { category: 'fetch', data: { body: 'sensitive' }, message: 'request private' },
      { category: 'auth', data: { email: 'user@example.test' }, message: 'auth.sign_in:failed' },
    ],
  };

  const sanitized = sanitizeSentryEvent(event);

  assert.equal(sanitized.message, undefined);
  assert.equal(sanitized.logentry, undefined);
  assert.equal(sanitized.transaction, '/projects/[ID]');
  assert.equal(sanitized.user, undefined);
  assert.equal(sanitized.request, undefined);
  assert.equal(sanitized.extra, undefined);
  assert.equal(sanitized.contexts, undefined);
  assert.equal(sanitized.tags, undefined);
  assert.equal(sanitized.exception?.values?.[0]?.value, 'Error');
  assert.equal(sanitized.exception?.values?.[0]?.mechanism?.data, undefined);
  assert.equal(sanitized.breadcrumbs?.length, 1);
  assert.equal(sanitized.breadcrumbs?.[0]?.data, undefined);
  assert.equal(sanitized.breadcrumbs?.[0]?.message, 'auth.sign_in:failed');
});
