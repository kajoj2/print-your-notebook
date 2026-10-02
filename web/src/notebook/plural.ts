// Polish plural forms: 1 strona, 2–4 strony, 5+ stron (but 22 strony, 12 stron).
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const d = n % 10;
  const t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
}

export const pagesLabel = (n: number) => `${n} ${plural(n, 'strona', 'strony', 'stron')}`;
