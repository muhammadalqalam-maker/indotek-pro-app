import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatDateIndo, formatPersen, formatPercent, formatRupiah, formatTanggal, parseRupiah } from './format.ts';
import { getMessages } from '../i18n/index.ts';

describe('formatRupiah', () => {
  it('formats positive, negative, and fractional amounts using Indonesian separators', () => {
    assert.equal(formatRupiah(1250000), 'Rp 1.250.000');
    assert.equal(formatRupiah(-1250.5), 'Rp -1.250');
    assert.equal(formatRupiah(1250000, false), '1.250.000');
  });

  it('uses zero for nullish and non-finite amounts', () => {
    assert.equal(formatRupiah(null), 'Rp 0');
    assert.equal(formatRupiah(undefined, false), '0');
    assert.equal(formatRupiah(Number.NaN), 'Rp 0');
    assert.equal(formatRupiah(Number.POSITIVE_INFINITY), 'Rp 0');
  });
});

describe('parseRupiah', () => {
  it('parses Indonesian-formatted values and leading negatives', () => {
    assert.equal(parseRupiah('Rp 1.250.000'), 1250000);
    assert.equal(parseRupiah('-Rp 1.250'), -1250);
    assert.equal(parseRupiah(''), 0);
    assert.equal(parseRupiah('Rp'), 0);
  });
});

describe('formatPersen', () => {
  it('formats percentages with decimal comma and configurable precision', () => {
    assert.equal(formatPersen(42.5), '42,5%');
    assert.equal(formatPersen(42.56, 2), '42,56%');
    assert.equal(formatPersen(42.56, 0), '43%');
    assert.equal(formatPercent(42.5), '42,5%');
  });

  it('uses a zero fallback for nullish and non-finite values', () => {
    assert.equal(formatPersen(null), '0%');
    assert.equal(formatPersen(Number.NaN), '0%');
    assert.equal(formatPersen(Number.NEGATIVE_INFINITY), '0%');
  });

  it('rejects an invalid decimal precision', () => {
    assert.throws(() => formatPersen(42.5, -1), RangeError);
    assert.throws(() => formatPersen(42.5, 1.5), RangeError);
    assert.throws(() => formatPersen(42.5, 21), RangeError);
  });
});

describe('formatTanggal', () => {
  it('formats calendar dates consistently and supports the long form', () => {
    assert.equal(formatTanggal('2026-10-19'), '19 Okt 2026');
    assert.equal(formatTanggal('2026-10-19', { long: true }), 'Senin, 19 Oktober 2026');
    assert.equal(formatTanggal('2026-02-30'), '-');
  });

  it('formats timestamps in the requested Indonesian time zone', () => {
    const timestamp = '2026-10-18T07:30:00.000Z';
    assert.equal(formatTanggal(timestamp, { withTime: true }), '18 Okt 2026, 14:30 WIB');
    assert.equal(formatTanggal(timestamp, { withTime: true, timezone: 'WITA' }), '18 Okt 2026, 15:30 WITA');
    assert.equal(formatTanggal(timestamp, { withTime: true, timezone: 'WIT' }), '18 Okt 2026, 16:30 WIT');
  });

  it('retains the legacy date formatter signature', () => {
    assert.equal(formatDateIndo('2026-10-19'), '19 Okt 2026');
    assert.equal(formatDateIndo('2026-10-18T07:30:00.000Z', true), '18 Okt 2026, 14:30 WIB');
    assert.equal(formatTanggal(null), '-');
  });
});

describe('locale dictionaries', () => {
  it('provides Indonesian messages and an English-ready catalog', () => {
    assert.equal(getMessages('id').shell.home, 'Beranda');
    assert.equal(getMessages('id').shell.allProjects(3), 'Semua Proyek (3)');
    assert.match(getMessages('id').dashboard.scopeNotice, /Tugas dan approval/);
    assert.equal(getMessages('en').common.retry, 'Try again');
    assert.equal(getMessages('en').shell.allProjects(3), 'All Projects (3)');
    assert.match(getMessages('en').dashboard.scopeNotice, /Tasks and approvals/);
    assert.equal(getMessages().common.save, 'Simpan');
  });
});
