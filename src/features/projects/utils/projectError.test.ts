import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getProjectErrorMessage } from './projectError';

describe('getProjectErrorMessage', () => {
  it('returns an Error message', () => {
    assert.equal(getProjectErrorMessage(new Error('Gagal'), 'Fallback'), 'Gagal');
  });

  it('returns a PostgREST-style plain object message', () => {
    assert.equal(getProjectErrorMessage({ code: '42501', message: 'Akses ditolak' }, 'Fallback'), 'Akses ditolak');
  });

  it('uses the fallback when the error has no usable message', () => {
    assert.equal(getProjectErrorMessage({ message: ' ' }, 'Fallback'), 'Fallback');
    assert.equal(getProjectErrorMessage(null, 'Fallback'), 'Fallback');
  });
});
