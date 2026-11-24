/** Issuing a membership card (shared by the server and the tests). */
import type { Member, MembershipCard, Site, Vehicle } from '../types';
import { nextYearlyNumber } from './numbering';

/** "JJ/MM/AAAA" + n months, same day (last day of the month when it does not exist). */
export function addMonthsFr(date: string, months: number): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  if (!m) return date;
  const day = +m[1];
  const target = new Date(Date.UTC(+m[3], +m[2] - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.min(day, lastDay))}/${p(target.getUTCMonth() + 1)}/${target.getUTCFullYear()}`;
}

export interface NewCardInput {
  primaryPlate: string;
  secondaryPlate?: string;
  validityMonths: number;
}

/** Problem preventing the card, or null. */
export function cardProblem(member: Member | undefined, vehicles: Vehicle[], input: NewCardInput): string | null {
  if (!member) return 'Membre introuvable.';
  if (member.status === 'radie') return 'Ce membre est radié : il ne peut pas recevoir de carte.';
  const own = vehicles.filter((v) => v.memberId === member.id && v.status !== 'radie').map((v) => v.licensePlate);
  if (!own.includes(input.primaryPlate)) return 'Le véhicule principal doit appartenir au membre.';
  if (input.secondaryPlate && (!own.includes(input.secondaryPlate) || input.secondaryPlate === input.primaryPlate)) {
    return 'Le second véhicule doit être un autre véhicule du membre.';
  }
  if (!Number.isInteger(input.validityMonths) || input.validityMonths < 1 || input.validityMonths > 60) {
    return 'La validité doit être comprise entre 1 et 60 mois.';
  }
  return null;
}

/** The new card: number CRD-AAAA-NNNN, random QR token, valid from today. */
export function buildCard(
  member: Member,
  site: Site | undefined,
  input: NewCardInput,
  existing: MembershipCard[],
  today: string,
  token: string
): MembershipCard {
  const cardNumber = nextYearlyNumber(existing.map((c) => c.cardNumber), 'CRD');
  return {
    id: `crd-${Date.now().toString(36)}`,
    cardNumber,
    memberId: member.id,
    memberName: member.fullName,
    siteId: member.primarySiteId,
    siteName: site?.name || member.primarySiteId,
    primaryPlate: input.primaryPlate,
    secondaryPlate: input.secondaryPlate || undefined,
    issuedDate: today,
    expirationDate: addMonthsFr(today, input.validityMonths),
    rfidTag: `#TAG-${cardNumber.slice(-4)}-${token.slice(0, 4).toUpperCase()}`,
    nfcChipType: 'NTAG216',
    qrToken: `uuid:${token}`,
    status: 'actif'
  };
}

/** "JJ/MM/AAAA" -> sortable "AAAAMMJJ" ('' when unreadable). */
const sortableFr = (d: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(d || '');
  return m ? `${m[3]}${m[2]}${m[1]}` : '';
};

export interface CardCheck {
  valid: boolean;
  /** Short label shown in big: AUTORISÉ, EXPIRÉE… */
  label: string;
  message: string;
}

/** Is this card accepted at a gate today? (status + expiry date) */
export function checkCard(card: MembershipCard, today: string): CardCheck {
  if (card.status === 'bloquee_perdue') return { valid: false, label: 'CARTE BLOQUÉE', message: 'Carte déclarée perdue ou bloquée.' };
  if (card.status === 'revoquee') return { valid: false, label: 'CARTE RÉVOQUÉE', message: 'Carte remplacée par une nouvelle carte.' };
  const exp = sortableFr(card.expirationDate);
  if (exp && exp < sortableFr(today)) return { valid: false, label: 'CARTE EXPIRÉE', message: `Expirée depuis le ${card.expirationDate}.` };
  if (card.status === 'a_renouveler') {
    return { valid: true, label: 'AUTORISÉ', message: `Carte à renouveler (expire le ${card.expirationDate}).` };
  }
  return { valid: true, label: 'AUTORISÉ', message: `Valable jusqu’au ${card.expirationDate}.` };
}

/** Card matching a scanned or typed code: QR token (with or without "uuid:") or card number. */
export function findCardByCode(cards: MembershipCard[], code: string): MembershipCard | undefined {
  const c = code.trim();
  if (!c) return undefined;
  const upper = c.toUpperCase();
  return cards.find((k) => k.qrToken === c || k.qrToken === `uuid:${c}` || k.cardNumber.toUpperCase() === upper);
}
