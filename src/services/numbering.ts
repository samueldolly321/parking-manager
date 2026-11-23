/**
 * Yearly record numbers (MBR-2026-0001, REC-2026-0001, INC-2026-0001…), shared by the server and the interface.
 *
 * The next number is one more than the highest number already used for that prefix and year,
 * so it never repeats an existing one, even after a deletion.
 */

/** Current year in Madagascar (the app's reference time zone). */
export function currentYear(date: Date = new Date()): number {
  return Number(date.toLocaleString('en-CA', { timeZone: 'Indian/Antananarivo', year: 'numeric' }));
}

export function nextYearlyNumber(existing: Iterable<string | undefined | null>, prefix: string, year = currentYear(), pad = 4): string {
  const head = `${prefix}-${year}-`;
  let max = 0;
  for (const value of existing) {
    if (!value || !value.startsWith(head)) continue;
    const n = Number(value.slice(head.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${head}${String(max + 1).padStart(pad, '0')}`;
}

/** Keeps the requested number when it is well-formed and unused, otherwise gives the next free one. */
export function pickYearlyNumber(
  requested: unknown,
  existing: (string | undefined | null)[],
  prefix: string,
  year = currentYear(),
  pad = 4
): string {
  if (typeof requested === 'string') {
    const wanted = requested.trim();
    const wellFormed = new RegExp(`^${prefix}-\\d{4}-\\d{${pad},}$`).test(wanted);
    if (wellFormed && !existing.includes(wanted)) return wanted;
  }
  return nextYearlyNumber(existing, prefix, year, pad);
}
