export type TimezoneZone = 'WIB' | 'WITA' | 'WIT';

export type FormatTanggalOptions = {
  withTime?: boolean;
  timezone?: TimezoneZone;
  long?: boolean;
};

const TIMEZONE_IDS: Record<TimezoneZone, string> = {
  WIB: 'Asia/Jakarta',
  WITA: 'Asia/Makassar',
  WIT: 'Asia/Jayapura',
};

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseDate(value: string | Date): { date: Date; dateOnly: boolean } | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : { date: value, dateOnly: false };
  }

  const dateOnlyMatch = DATE_ONLY_PATTERN.exec(value);
  if (!dateOnlyMatch) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : { date, dateOnly: false };
  }

  const [, yearText, monthText, dayText] = dateOnlyMatch;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  return { date, dateOnly: true };
}

function formatDateParts(
  date: Date,
  timezone: string,
  long: boolean,
): Map<string, string> {
  const formatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: long ? 'long' : 'short',
    year: 'numeric',
    ...(long ? { weekday: 'long' as const } : {}),
    timeZone: timezone,
  });
  return new Map(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
}

export function formatRupiah(
  amount: number | null | undefined,
  includeSymbol = true,
  maximumFractionDigits = 0,
): string {
  if (!Number.isInteger(maximumFractionDigits) || maximumFractionDigits < 0 || maximumFractionDigits > 20) {
    throw new RangeError('Jumlah desimal Rupiah harus berupa bilangan bulat 0–20.');
  }

  const value = isFiniteNumber(amount)
    ? Math.round(amount * (10 ** maximumFractionDigits)) / (10 ** maximumFractionDigits)
    : 0;
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits,
  }).format(value);

  return includeSymbol ? `Rp ${formatted}` : formatted;
}

export function formatVolume(
  value: number | null | undefined,
  maximumFractionDigits = 4,
): string {
  if (!Number.isInteger(maximumFractionDigits) || maximumFractionDigits < 0 || maximumFractionDigits > 4) {
    throw new RangeError('Jumlah desimal volume harus berupa bilangan bulat 0–4.');
  }

  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(isFiniteNumber(value) ? value : 0);

  return formatted;
}

export function parseRupiah(input: string): number {
  const cleaned = input.replace(/[^\d-]/g, '').replace(/(?!^)-/g, '');
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatPersen(
  value: number | null | undefined,
  decimals = 1,
): string {
  if (!isFiniteNumber(value)) return '0%';
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 20) {
    throw new RangeError('Jumlah desimal persentase harus berupa bilangan bulat 0–20.');
  }

  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return `${formatted}%`;
}

export function formatTanggal(
  value: string | Date | null | undefined,
  options: FormatTanggalOptions = {},
): string {
  if (!value) return '-';

  const parsed = parseDate(value);
  if (!parsed) return '-';

  const { withTime = false, timezone = 'WIB', long = false } = options;
  const dateTimezone = parsed.dateOnly ? 'UTC' : TIMEZONE_IDS[timezone];
  const parts = formatDateParts(parsed.date, dateTimezone, long);
  const dateText = long
    ? `${parts.get('weekday')}, ${parts.get('day')} ${parts.get('month')} ${parts.get('year')}`
    : `${parts.get('day')} ${parts.get('month')} ${parts.get('year')}`;

  if (!withTime) return dateText;

  const timeParts = new Map(new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: TIMEZONE_IDS[timezone],
  }).formatToParts(parsed.date).map(({ type, value: partValue }) => [type, partValue]));

  return `${dateText}, ${timeParts.get('hour')}:${timeParts.get('minute')} ${timezone}`;
}

export function formatPercent(
  value: number | null | undefined,
  decimals = 1,
): string {
  return formatPersen(value, decimals);
}

export function formatDateIndo(
  value: string | Date | null | undefined,
  withTime = false,
): string {
  return formatTanggal(value, { withTime });
}
