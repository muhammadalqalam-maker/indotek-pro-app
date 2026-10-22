export type ReportPeriodType = 'weekly' | 'monthly';

export type ReportPeriodRange = {
  startDate: string;
  endDate: string;
};

function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError('Tanggal harus menggunakan format YYYY-MM-DD.');

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new RangeError('Tanggal periode tidak valid.');
  }

  return date;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getReportPeriodRange(
  period: ReportPeriodType,
  selectedDate: string,
): ReportPeriodRange {
  const date = parseDateOnly(selectedDate);

  if (period === 'monthly') {
    const startDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    const endDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
    return { startDate: toDateOnly(startDate), endDate: toDateOnly(endDate) };
  }

  const dayOfWeek = date.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const startDate = new Date(date);
  startDate.setUTCDate(date.getUTCDate() - daysSinceMonday);
  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + 6);

  return { startDate: toDateOnly(startDate), endDate: toDateOnly(endDate) };
}

export function getCurrentDateOnly(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}
