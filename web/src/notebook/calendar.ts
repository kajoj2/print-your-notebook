// The same rules as lib/calendar.typ: Monday-first weeks, ISO 8601 weeks.

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function monthName(m: number): string {
  return MONTHS[(((m - 1) % 12) + 12) % 12]!;
}

export function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

// 1 = Monday … 7 = Sunday
function isoWeekday(y: number, m: number, d: number): number {
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export function isoWeeksInYear(y: number): number {
  const jan1 = isoWeekday(y, 1, 1);
  return jan1 === 4 || (jan1 === 3 && isLeap(y)) ? 53 : 52;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// (year, month) for the i-th month counting from startMonth of the given year
export function monthAt(year: number, startMonth: number, i: number): [number, number] {
  const m0 = startMonth - 1 + i;
  return [year + Math.floor(m0 / 12), (((m0 % 12) + 12) % 12) + 1];
}

export function parseIsoDate(s: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
  return [y, mo, d];
}
