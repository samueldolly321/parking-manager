/** Helpers for the "months paid" field of a receipt. A month is keyed as "YYYY-MM". */

export const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];
export const MONTH_SHORT = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

/** Max length of the `period` column in the database */
const PERIOD_MAX_LENGTH = 100;

export const monthKey = (year: number, monthIndex: number) => `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

export const splitKey = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return { year: y, monthIndex: m - 1 };
};

export const monthLabel = (key: string) => {
  const { year, monthIndex } = splitKey(key);
  return `${MONTH_NAMES[monthIndex]} ${year}`;
};

const nextKey = (key: string) => {
  const { year, monthIndex } = splitKey(key);
  return monthIndex === 11 ? monthKey(year + 1, 0) : monthKey(year, monthIndex + 1);
};

/** Groups sorted month keys into runs of consecutive months. */
function toRuns(keys: string[]): string[][] {
  const sorted = [...new Set(keys)].sort();
  const runs: string[][] = [];
  for (const k of sorted) {
    const last = runs[runs.length - 1];
    if (last && nextKey(last[last.length - 1]) === k) last.push(k);
    else runs.push([k]);
  }
  return runs;
}

function formatRuns(runs: string[][], names: string[]): string {
  return runs
    .map((run) => {
      const a = splitKey(run[0]);
      const b = splitKey(run[run.length - 1]);
      if (run.length === 1) return `${names[a.monthIndex]} ${a.year}`;
      if (a.year === b.year) return `${names[a.monthIndex]}–${names[b.monthIndex]} ${a.year}`;
      return `${names[a.monthIndex]} ${a.year}–${names[b.monthIndex]} ${b.year}`;
    })
    .join(', ');
}

/** Human-readable period that fits in the DB column, e.g. "Janvier–Mars 2026, Mai 2026". */
export function formatMonthsPeriod(keys: string[]): string {
  if (keys.length === 0) return '';
  const runs = toRuns(keys);
  const full = formatRuns(runs, MONTH_NAMES);
  if (full.length <= PERIOD_MAX_LENGTH) return full;
  const short = formatRuns(runs, MONTH_SHORT);
  if (short.length <= PERIOD_MAX_LENGTH) return short;
  const sorted = runs.flat();
  return `${sorted.length} mois : ${monthLabel(sorted[0])} … ${monthLabel(sorted[sorted.length - 1])}`;
}

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\./g, '');
const NAME_TO_INDEX = new Map<string, number>();
MONTH_NAMES.forEach((n, i) => NAME_TO_INDEX.set(normalize(n), i));
MONTH_SHORT.forEach((n, i) => NAME_TO_INDEX.set(normalize(n), i));

function rangeKeys(from: string, to: string): string[] {
  const out: string[] = [];
  let k = from;
  for (let guard = 0; k <= to && guard < 240; guard++) {
    out.push(k);
    k = nextKey(k);
  }
  return out;
}

/**
 * Extracts the months covered by a receipt period. Understands the format written by
 * formatMonthsPeriod as well as older ones ("Mai 2024", "01/05/2024 - 31/05/2024").
 */
export function parseMonthsPeriod(period: string | undefined): string[] {
  if (!period) return [];
  // Date range: 01/05/2024 - 31/05/2024
  const dates = [...period.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)].map((m) => monthKey(Number(m[3]), Number(m[2]) - 1));
  if (dates.length >= 2) return rangeKeys(dates[0], dates[dates.length - 1]);
  if (dates.length === 1) return dates;

  const keys: string[] = [];
  for (const part of period.split(',')) {
    // "Janvier–Mars 2026", "Novembre 2025–Février 2026", "Mai 2026"
    const tokens = [...normalize(part).matchAll(/([a-z]+)\s*(\d{4})?/g)]
      .map((m) => ({ idx: NAME_TO_INDEX.get(m[1]), year: m[2] ? Number(m[2]) : undefined }))
      .filter((t) => t.idx !== undefined) as { idx: number; year?: number }[];
    if (tokens.length === 0) continue;
    const lastYear = tokens[tokens.length - 1].year ?? tokens.find((t) => t.year)?.year;
    if (!lastYear) continue;
    const first = tokens[0];
    const last = tokens[tokens.length - 1];
    const from = monthKey(first.year ?? lastYear, first.idx);
    const to = monthKey(last.year ?? lastYear, last.idx);
    keys.push(...(tokens.length > 1 ? rangeKeys(from, to) : [from]));
  }
  return keys;
}
