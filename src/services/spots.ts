/** Calculations for the "Emplacements & occupation" page (shared with the server and the tests). */
import type { ParkingSpot, Tariff } from '../types';

export const SPOT_TYPE_LABELS: Record<ParkingSpot['type'], string> = {
  placement_libre_interieur: 'Placement libre intérieur',
  emplacement_privatif_dedie: 'Emplacement privatif dédié',
  deux_roues: 'Deux-roues',
  poids_lourd: 'Poids lourd'
};

/** Icon of each spot type (Material Symbols names). */
export const SPOT_TYPE_ICONS: Record<ParkingSpot['type'], string> = {
  placement_libre_interieur: 'directions_car',
  emplacement_privatif_dedie: 'garage',
  deux_roues: 'two_wheeler',
  poids_lourd: 'local_shipping'
};

export const SPOT_STATUS_LABELS: Record<ParkingSpot['status'], string> = {
  libre: 'Libre',
  occupe: 'Occupée',
  reserve: 'Réservée',
  maintenance: 'En travaux'
};

const TANA_OFFSET_MIN = 3 * 60; // Madagascar: GMT+3, no daylight saving

/** Date and time in Madagascar, in the app's format "JJ/MM/AAAA HH:MM". */
export function formatEntryTime(date: Date = new Date()): string {
  const d = new Date(date.getTime() + TANA_OFFSET_MIN * 60_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** Reads "JJ/MM/AAAA HH:MM" (Madagascar time). Returns null for anything else (e.g. an hour without a date). */
export function parseEntryTime(value: string | undefined | null): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2})[:h](\d{2})$/.exec((value || '').trim());
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min] = m.map(Number);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || hh > 23 || min > 59) return null;
  return new Date(Date.UTC(yyyy, mm - 1, dd, hh, min) - TANA_OFFSET_MIN * 60_000);
}

/** Time spent since the entry ("2 h 05 min", "3 j 4 h"), or null when the entry time is unknown. */
export function elapsedSince(entryTime: string | undefined | null, now: Date = new Date()): string | null {
  const start = parseEntryTime(entryTime);
  if (!start) return null;
  const minutes = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${String(minutes % 60).padStart(2, '0')} min`;
  return `${Math.floor(hours / 24)} j ${hours % 24} h`;
}

/** "A-02" < "A-10" < "B-01" (numbers compared as numbers). */
export const compareCodes = (a: string, b: string) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });

export interface ZoneGroup {
  key: string; // siteId + zone
  siteId: string;
  zone: string;
  spots: ParkingSpot[];
  occupied: number;
  rate: number; // 0..100, share of occupied spots
}

/** Spots grouped by site and zone, as they are stored (whatever their codes). */
export function groupByZone(spots: ParkingSpot[]): ZoneGroup[] {
  const groups = new Map<string, ZoneGroup>();
  for (const spot of spots) {
    const zone = spot.zone?.trim() || 'Sans zone';
    const key = `${spot.siteId}::${zone}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, siteId: spot.siteId, zone, spots: [], occupied: 0, rate: 0 };
      groups.set(key, g);
    }
    g.spots.push(spot);
  }
  return [...groups.values()]
    .map((g) => {
      const occupied = g.spots.filter((s) => s.status === 'occupe').length;
      return {
        ...g,
        spots: [...g.spots].sort((a, b) => compareCodes(a.code, b.code)),
        occupied,
        rate: g.spots.length ? Math.round((occupied / g.spots.length) * 100) : 0
      };
    })
    .sort((a, b) => a.siteId.localeCompare(b.siteId, 'fr', { numeric: true }) || compareCodes(a.zone, b.zone));
}

/** Active tariff of a spot type on a site (a site's own tariff first, then the one for all sites). */
export function tariffForSpot(tariffs: Tariff[], type: ParkingSpot['type'], siteId: string): Tariff | undefined {
  const active = tariffs.filter((t) => t.isActive && t.typeFormula === type);
  return active.find((t) => t.siteId === siteId) || active.find((t) => !t.siteId);
}

/**
 * Next free codes for new spots: "A-09", "A-10"… after the highest number already used with that prefix on the site.
 * The prefix is what comes before the last number (e.g. "A-" in "A-08").
 */
export function nextSpotCodes(existing: ParkingSpot[], siteId: string, prefix: string, count: number): string[] {
  const head = prefix.trim();
  let max = 0;
  let width = 2;
  for (const s of existing) {
    if (s.siteId !== siteId || !s.code.startsWith(head)) continue;
    const rest = s.code.slice(head.length);
    if (!/^\d+$/.test(rest)) continue;
    max = Math.max(max, Number(rest));
    width = Math.max(width, rest.length);
  }
  return Array.from({ length: Math.max(0, count) }, (_, i) => `${head}${String(max + 1 + i).padStart(width, '0')}`);
}
