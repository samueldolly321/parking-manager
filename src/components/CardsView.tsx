import React, { useRef, useState } from 'react';
import { QrCodeSvg } from './QrCodeSvg';
import { initialsAvatar } from '../services/avatar';
import { useBranding, BrandLogo } from '../services/branding';
import { flushSync } from 'react-dom';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { SquareParking, Car, Bike, MapPin, ShieldCheck, BadgeCheck, Home, Phone } from 'lucide-react';
import { EntityActions } from './EntityActions';
import { MembershipCard, Member, Site, Vehicle } from '../types';
import { issueMembershipCard } from '../services/storage';
import { notify } from '../services/notify';
import { can } from '../services/access';

/** CR80 card width, used to size the BAT pages. */
const CARD_WIDTH_MM = 85.6;
/** Width of the on-screen specimen, in CSS pixels. */
const SPECIMEN_WIDTH_PX = 540;
/** 85.6 mm at 300 DPI = 1011 px. */
const BAT_DPI = 300;
const BAT_PIXEL_RATIO = (CARD_WIDTH_MM / 25.4) * BAT_DPI / SPECIMEN_WIDTH_PX;
/** Used instead of an image that cannot be embedded (e.g. blocked remote photo). */
const BLANK_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

interface CardsViewProps {
  cards: MembershipCard[];
  members: Member[];
  vehicles: Vehicle[];
  sites: Site[];
  onToggleCardBlock: (cardId: string) => void;
  onOpenScanner: () => void;
  /** Record selected on arrival (from the header search) */
  initialSelectedId?: string;
}

export const CardsView: React.FC<CardsViewProps> = ({
  cards,
  members,
  vehicles,
  sites,
  onToggleCardBlock,
  onOpenScanner,
  initialSelectedId
}) => {
  const { appName } = useBranding();
  const [showIssue, setShowIssue] = useState(false);
  const canWrite = can('write');
  const [selectedCardId, setSelectedCardId] = useState<string>(initialSelectedId || cards[0]?.id || '');
  const [currentSide, setCurrentSide] = useState<'recto' | 'verso'>('recto');
  const [filterType, setFilterType] = useState<'all' | 'actif' | 'a_renouveler' | 'bloquee_perdue'>('all');

  const currentCard = cards.find(c => c.id === selectedCardId) || cards[0];
  const currentMember = members.find(m => m.id === currentCard?.memberId);
  const cardSite = sites.find((x) => x.id === currentCard?.siteId);

  const activeCardsCount = cards.filter(c => c.status === 'actif').length;
  const toRenewCount = cards.filter(c => c.status === 'a_renouveler').length;
  const blockedCount = cards.filter(c => c.status === 'bloquee_perdue' || c.status === 'revoquee').length;

  const filteredCards = cards.filter(c => {
    if (filterType === 'all') return true;
    return c.status === filterType;
  });

  const issueModal = showIssue && (
    <IssueCardModal
      members={members}
      vehicles={vehicles}
      cards={cards}
      onClose={() => setShowIssue(false)}
      onIssued={(card) => {
        setShowIssue(false);
        setFilterType('all');
        setSelectedCardId(card.id);
      }}
    />
  );

  // BAT (bon à tirer): both faces are rendered off-screen only while the PDF is built
  const [batBusy, setBatBusy] = useState(false);
  const [batError, setBatError] = useState<string | null>(null);
  const batRectoRef = useRef<HTMLDivElement>(null);
  const batVersoRef = useRef<HTMLDivElement>(null);

  /** Downloads a PDF with only the card: page 1 = recto, page 2 = verso, at 300 DPI. */
  const downloadBat = async () => {
    if (!currentCard || batBusy) return;
    setBatError(null);
    flushSync(() => setBatBusy(true));
    try {
      await document.fonts.ready;
      await nextFrame();
      await nextFrame();
      const faces = [batRectoRef.current, batVersoRef.current];
      if (faces.some((f) => !f)) throw new Error('Carte introuvable');

      let pdf: jsPDF | null = null;
      for (const face of faces as HTMLDivElement[]) {
        const dataUrl = await toPng(face, {
          pixelRatio: BAT_PIXEL_RATIO,
          backgroundColor: '#ffffff',
          cacheBust: true,
          imagePlaceholder: BLANK_PIXEL
        });
        // Page size from the real image size, so the face is never stretched
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        const heightMm = (img.naturalHeight / img.naturalWidth) * CARD_WIDTH_MM;
        const orientation = CARD_WIDTH_MM >= heightMm ? 'landscape' : 'portrait';
        if (!pdf) {
          pdf = new jsPDF({ unit: 'mm', format: [CARD_WIDTH_MM, heightMm], orientation });
        } else {
          pdf.addPage([CARD_WIDTH_MM, heightMm], orientation);
        }
        pdf.addImage(dataUrl, 'PNG', 0, 0, CARD_WIDTH_MM, heightMm);
      }
      const safe = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '_');
      pdf!.save(`BAT_${safe(currentCard.cardNumber)}_${safe(currentCard.memberName)}.pdf`);
    } catch (e) {
      setBatError(`Le BAT n'a pas pu être généré : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBatBusy(false);
    }
  };

  /** Recto of the card (shown on screen and used for the BAT). */
  const renderRecto = () => (
    <div className="relative h-full bg-white text-black flex flex-col justify-between gap-3 p-5 rounded-2xl overflow-hidden">
      {/* Subtle Guilloche SVG background */}
      <div className="absolute inset-0 opacity-25 pointer-events-none">
        <svg fill="none" height="100%" viewBox="0 0 500 315" width="100%" xmlns="http://www.w3.org/2000/svg">
          <circle cx="480" cy="40" r="140" stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth="1.5" />
          <circle cx="480" cy="40" r="180" stroke="#CBD5E1" strokeWidth="1" />
          <circle cx="480" cy="40" r="220" stroke="#00E5FF" strokeWidth="0.8" />
          <path d="M-50 280 C 150 160, 280 340, 550 200" fill="none" stroke="#F59E0B" strokeWidth="1.2" />
          <path d="M-30 300 C 170 180, 300 360, 570 220" fill="none" stroke="#00E5FF" strokeWidth="1.2" />
          <rect height="275" rx="16" stroke="#CBD5E1" strokeOpacity="0.3" strokeWidth="0.5" width="460" x="20" y="20" />
        </svg>
      </div>

      {/* Header: Logo, Title & Madagascar Flag */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <BrandLogo size={32} />
          <div className="flex flex-col">
            <span className="font-headline text-xs tracking-wide text-black uppercase font-bold">{appName}</span>
            <span className="font-label-md text-[9px] tracking-widest text-black uppercase">
              Gestion Centrale · {currentCard.siteName.split('-')[1]?.trim() || currentCard.siteName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="font-mono-data text-[8px] font-bold tracking-widest text-[#06B6D4] uppercase bg-white px-2 py-0.5 rounded border border-black">
              Membre Résident Permanent
            </span>
            <span className="font-mono-data text-[8px] text-black mt-0.5">ACCÈS 24H/7J ILLIMITÉ</span>
          </div>
          {/* Flag of Madagascar */}
          <div className="w-5 h-3.5 rounded-sm overflow-hidden flex shadow-sm border border-slate-300">
            <div className="w-1/3 bg-white h-full"></div>
            <div className="w-2/3 h-full flex flex-col">
              <div className="h-1/2 bg-[#FC3D32]"></div>
              <div className="h-1/2 bg-[#007E3A]"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Body: Photo + Chip + Credentials */}
      <div className="relative z-10 grid grid-cols-12 gap-3 items-center my-auto">
        <div className="col-span-4 flex items-center gap-2.5">
          <div className="relative w-16 h-20 rounded-lg overflow-hidden border-2 border-black shadow-md bg-slate-100 shrink-0">
            <img
              src={currentMember?.avatarUrl || initialsAvatar(currentMember?.fullName)}
              data-zoom={currentMember?.avatarUrl ? 'true' : undefined}
              alt={currentCard.memberName}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 inset-x-0 bg-white/90 py-0.5 text-center">
              <span className="font-mono-data text-[7.5px] text-black">VALIDÉ</span>
            </div>
          </div>
        </div>

        <div className="col-span-8 flex flex-col justify-center space-y-1">
          <div>
            <div className="text-[8px] font-mono-data text-black uppercase tracking-wider">Titulaire de la carte</div>
            <div className="font-headline text-sm font-bold text-black tracking-tight leading-tight truncate">
              {currentCard.memberName}
            </div>
            <div className="font-mono-data text-[10px] text-black font-semibold tracking-wider">
              {currentMember?.memberNumber || '—'}
            </div>
          </div>

          {/* Member contact */}
          <div className="space-y-0.5 text-[9px] text-black">
            <div className="flex items-start gap-1">
              <Home size={11} className="mt-[1px] shrink-0" aria-hidden="true" />
              <span className="leading-tight">{currentMember?.address || '—'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Phone size={11} className="shrink-0" aria-hidden="true" />
              <span className="font-mono-data">{currentMember?.phone || '—'}</span>
            </div>
          </div>

          {/* Vehicles Authorized */}
          <div className="bg-white rounded-md p-1.5 border border-slate-300 flex items-center justify-between text-[9.5px]">
            <div className="flex items-center gap-1.5">
              <Car size={14} className="text-black" aria-hidden="true" />
              <span className="text-[9.5px] text-black font-medium">{currentCard.primaryPlate}</span>
              <span className="font-mono-plate text-[10px] bg-white px-1.5 py-0.2 rounded text-black border border-black">
                {currentCard.primaryPlate}
              </span>
            </div>
            {currentCard.secondaryPlate && (
              <div className="flex items-center gap-1 text-black">
                <Bike size={12} aria-hidden="true" />
                <span className="font-mono-plate text-[9px] text-black">{currentCard.secondaryPlate}</span>
              </div>
            )}
          </div>

          {/* Gate & RFID Serial */}
          <div className="flex items-center justify-between text-[9px] text-black pt-0.5">
            <div className="flex items-center gap-1">
              <MapPin size={12} className="text-amber-500" aria-hidden="true" />
              <span>{currentCard.siteName.replace(/^Site \d+\s*-\s*/, '')}</span>
            </div>
            <div className="font-mono-data text-[8.5px] text-black">
              RFID: <span className="text-black font-semibold">{currentCard.rfidTag}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="relative z-10 flex items-end justify-between border-t border-slate-300 pt-2">
        <div className="flex items-center gap-4 text-[9px]">
          <div>
            <span className="text-[7.5px] font-mono-data text-black uppercase tracking-widest block">Émis le</span>
            <span className="font-mono-data text-[9.5px] text-black font-semibold">{currentCard.issuedDate}</span>
          </div>
          <div>
            <span className="text-[7.5px] font-mono-data text-black uppercase tracking-widest block">Expire fin</span>
            <span className="font-mono-data text-[9.5px] text-black font-bold">{currentCard.expirationDate}</span>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 via-amber-300 to-indigo-500 opacity-90 p-[1px] shadow-sm flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-black">
            <ShieldCheck size={14} aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );

  /** Verso of the card (shown on screen and used for the BAT). */
  const renderVerso = () => (
    <div className="relative h-full bg-white text-black flex flex-col justify-between gap-3 p-5 rounded-2xl overflow-hidden">
      {/* Magnetic Stripe */}
      <div className="-mx-5 -mt-5 h-9 bg-black flex items-center px-4 justify-between">
        <span className="font-mono-data text-[7px] text-slate-300 tracking-widest">
          ISO 7811 HI-CO 4000 OE MAGNETIC TRACK 1 &amp; 2
        </span>
        <span className="w-2 h-2 rounded-full bg-cyan-500/50"></span>
      </div>

      {/* Middle: QR Code + Terms */}
      <div className="grid grid-cols-12 gap-3 items-center my-auto">
        <div className="col-span-4 flex flex-col items-center bg-white p-2 rounded-lg border border-slate-300 shrink-0">
          <QrCodeSvg value={currentCard.qrToken} className="w-20 h-20" />
          <span className="font-mono-data text-[7px] text-black mt-1 uppercase">
            TOKEN: {(currentCard.qrToken.split(':')[1] || currentCard.qrToken).slice(0, 9)}
          </span>
        </div>

        <div className="col-span-8 flex flex-col justify-between space-y-1.5 pl-1">
          <p className="text-[8px] leading-[11px] text-black text-justify">
            Cette carte est strictement personnelle et demeure la propriété de {appName}.
            Tout stationnement implique l'acceptation sans réserve du règlement intérieur. En cas de perte, aviser immédiatement le {currentCard.siteName}
            {cardSite?.presidentPhone ? <> au <strong className="text-black">{cardSite.presidentPhone}</strong></> : null}.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="flex flex-col">
              <span className="text-[7px] font-mono-data text-black uppercase">Signature Titulaire</span>
              <div className="h-6 bg-slate-100 rounded flex items-center px-2">
                <span className="italic text-[10px] text-slate-800 font-serif">A. Ramanantsoa</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[7px] font-mono-data text-black uppercase">Visa Direction</span>
              <div className="h-6 bg-slate-100 rounded flex items-center justify-between px-2">
                <span className="font-mono-data text-[8px] text-slate-700 font-bold">PMM-OK</span>
                <BadgeCheck size={13} className="text-[#06B6D4]" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barcode SVG */}
      <div className="flex flex-col items-center border-t border-slate-300 pt-1">
        <span className="font-mono-data text-[8.5px] text-black tracking-widest">
          * {currentCard.cardNumber}-TANA *
        </span>
      </div>
    </div>
  );

  /**
   * One face of the card. Both faces sit in the same grid cell (the other one invisible),
   * so recto and verso always have the same height: that of the taller face.
   */
  const renderFace = (side: 'recto' | 'verso') => (
    <div className="grid">
      <div style={{ gridArea: '1 / 1' }} className={side === 'recto' ? '' : 'invisible'} aria-hidden={side !== 'recto'}>
        {renderRecto()}
      </div>
      <div style={{ gridArea: '1 / 1' }} className={side === 'verso' ? '' : 'invisible'} aria-hidden={side !== 'verso'}>
        {renderVerso()}
      </div>
    </div>
  );

  if (!currentCard) {
    return (
      <div className="bg-white rounded-xl p-10 border border-dashed border-[#CBD5E1] text-center text-sm text-slate-500 space-y-3">
        <span className="material-symbols-outlined text-[40px] text-slate-300 block">credit_card</span>
        <p>Aucune carte de membre n’a encore été émise.</p>
        {canWrite && (
          <button type="button" onClick={() => setShowIssue(true)} className="px-4 py-2 rounded-lg bg-[#0F172A] text-white text-xs font-bold">
            + Émettre une carte
          </button>
        )}
        {issueModal}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full space-y-6">
      {issueModal}
      {/* Section Header */}
      <div className="p-5 bg-white rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-slate-500 font-mono-data text-xs uppercase tracking-wider">
            <span>Production Atelier PVC</span>
            <span className="text-slate-300">/</span>
            <span className="text-[#0F172A] font-semibold">ISO/IEC 7810 ID-1 CR80</span>
          </div>
          <h1 className="font-headline text-2xl font-bold text-[#0F172A] tracking-tight">
            Gestion et Édition des Cartes de Membres
          </h1>
          <p className="text-xs text-slate-500 max-w-4xl">
            Génération, prévisualisation d'impression PVC au format standard 85.60 × 53.98 mm, encodage RFID et contrôle de validité QR code.
          </p>
        </div>

        {/* Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenScanner}
            type="button"
            className="bg-white text-[#0F172A] font-headline text-xs font-bold px-3.5 py-2 rounded-lg border border-[#E2E8F0] shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">qr_code_scanner</span>
            <span>Lecteur Scanner QR</span>
          </button>
          <button
            onClick={() => window.print()}
            type="button"
            className="bg-white text-[#0F172A] font-medium text-xs px-3.5 py-2 rounded-lg border border-[#E2E8F0] shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px] text-slate-500">layers</span>
            <span>Imprimer par Lot (Planche PVC)</span>
          </button>
          {canWrite && <button
            onClick={() => setShowIssue(true)}
            type="button"
            className="bg-[#0F172A] text-white font-headline text-xs font-bold px-4 py-2 rounded-lg shadow-md hover:bg-slate-800 transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">add_card</span>
            <span>+ Émettre une carte</span>
          </button>}
        </div>
      </div>

      {/* KPI Metrics Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Cartes Actives</span>
            <span className="font-mono-data text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-[#16A34A] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
              EN SERVICE
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="font-headline text-3xl font-bold text-[#0F172A] tracking-tight">{activeCardsCount}</div>
              <div className="text-xs text-slate-500 mt-0.5">RFID / NFC 13.56 MHz Mifare</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-[#06B6D4]">
              <span className="material-symbols-outlined text-[24px]">contactless</span>
            </div>
          </div>
          <div className="mt-3 pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-[#E2E8F0]">
            <span>Total cartes émises</span>
            <span className="font-mono-data text-[#06B6D4] font-bold">{cards.length}</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">À Renouveler ce mois</span>
            <span className="font-mono-data text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              ÉCHÉANCE &lt; 30J
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="font-headline text-3xl font-bold text-[#0F172A] tracking-tight">{toRenewCount}</div>
              <div className="text-xs text-slate-500 mt-0.5">Cartes au statut « à renouveler »</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <span className="material-symbols-outlined text-[24px]">event_repeat</span>
            </div>
          </div>
          <div className="mt-3 pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-[#E2E8F0]">
            <span>Échéance proche</span>
            <span className="font-mono-data text-[#0F172A] font-bold">{toRenewCount} carte{toRenewCount > 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-red-200 bg-red-50/20 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-red-600 uppercase tracking-wider font-bold">Bloquées ou Perdues</span>
            <span className="font-mono-data text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-[#DC2626] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
              RESTREINTES
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="font-headline text-3xl font-bold text-[#DC2626] tracking-tight">{blockedCount}</div>
              <div className="text-xs text-slate-500 mt-0.5">Désactivées à distance (Blacklist)</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-[#DC2626]">
              <span className="material-symbols-outlined text-[24px]">block</span>
            </div>
          </div>
          <div className="mt-3 pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-red-200">
            <span>Synchronisation barrières</span>
            <span className="font-mono-data text-[#16A34A] font-bold">Instantanée</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Stock Cartes Vierges</span>
            <span className="font-mono-data text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
              COFFRE ANALAKELY
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="font-headline text-3xl font-bold text-[#0F172A] tracking-tight">250</div>
              <div className="text-xs text-slate-500 mt-0.5">Cartes PVC ISO CR80 NTAG216</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-[#06B6D4]">
              <span className="material-symbols-outlined text-[24px]">inventory_2</span>
            </div>
          </div>
          <div className="mt-3 pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-[#E2E8F0]">
            <span>Seuil alerte : 50 unités</span>
            <span className="font-mono-data text-[#16A34A] font-bold">Stock Optimal</span>
          </div>
        </div>
      </div>

      {/* Main Content Dual-Panel Layout */}
      {!currentCard ? (
        <div className="bg-white rounded-xl p-10 shadow-sm border border-[#E2E8F0] text-center text-sm text-slate-500">
          Aucune carte de membre pour le moment. Les cartes apparaîtront ici une fois créées.
        </div>
      ) : (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: PVC Card Studio & Specimen Preview (7 Cols) */}
        <div className="xl:col-span-7 flex flex-col gap-4">
          {/* Member Selector Bar & Side Switcher */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1 font-semibold">
                Dossier Membre Sélectionné pour Impression :
              </label>
              <div className="relative">
                <select
                  value={currentCard.id}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                  className="w-full bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] rounded-lg py-2.5 pl-3 pr-10 border border-[#E2E8F0] appearance-none cursor-pointer focus:ring-2 focus:ring-[#06B6D4]"
                >
                  {cards.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.memberName} ({c.cardNumber}) - {c.status === 'actif' ? 'Actif' : c.status}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 pointer-events-none text-[20px]">
                  unfold_more
                </span>
              </div>
            </div>

            {/* Specimen Flip Tabs */}
            <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg self-start sm:self-end border border-[#E2E8F0]">
              <button
                onClick={() => setCurrentSide('recto')}
                type="button"
                className={`px-3 py-1.5 rounded text-xs font-headline transition-all flex items-center gap-1.5 ${
                  currentSide === 'recto'
                    ? 'bg-[#0F172A] text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">id_card</span>
                <span>Recto (Face A)</span>
              </button>
              <button
                onClick={() => setCurrentSide('verso')}
                type="button"
                className={`px-3 py-1.5 rounded text-xs font-headline transition-all flex items-center gap-1.5 ${
                  currentSide === 'verso'
                    ? 'bg-[#0F172A] text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                <span>Verso (Face B)</span>
              </button>
            </div>
          </div>

          {/* Visual Specimen Canvas */}
          <div className="bg-[#E2E8F0]/40 rounded-2xl p-6 shadow-inner border border-[#E2E8F0] flex flex-col items-center justify-center relative">
            <div className="w-full flex items-center justify-between text-slate-500 font-mono-data text-[11px] mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
                <span>GABARIT PVC CR80 : 85.60 × 53.98 mm (Épaisseur 0.76 mm)</span>
              </div>
              <span className="hidden sm:inline">ÉCHELLE RÉELLE MATRICIELLE 300 DPI</span>
            </div>

            {/* CR80 Card Specimen Frame */}
            <div className="w-full max-w-[540px] rounded-2xl shadow-2xl relative select-none transition-all duration-300 border border-slate-300 bg-white">
              {renderFace(currentSide)}
            </div>

            {/* Off-screen copies of both faces, only while the BAT PDF is generated */}
            {batBusy && (
              <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, width: SPECIMEN_WIDTH_PX, pointerEvents: 'none' }}>
                <div ref={batRectoRef} className="border border-slate-300 rounded-2xl bg-white" style={{ width: SPECIMEN_WIDTH_PX }}>
                  {renderFace('recto')}
                </div>
                <div ref={batVersoRef} className="border border-slate-300 rounded-2xl bg-white mt-4" style={{ width: SPECIMEN_WIDTH_PX }}>
                  {renderFace('verso')}
                </div>
              </div>
            )}

            {batError && (
              <p role="alert" className="mt-3 text-xs text-[#DC2626]">{batError}</p>
            )}

            {/* Specimen Technical Metadata Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-slate-500 font-mono-data text-xs">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-[#06B6D4]">memory</span>
                Puce : {currentCard.nfcChipType}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-[#06B6D4]">lock</span>
                Clé AES-128bits GCM
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-[#06B6D4]">print</span>
                Transfert Thermique Sublimation 300 DPI
              </span>
            </div>
          </div>

          {/* Direct Commands */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={downloadBat}
              disabled={batBusy}
              type="button"
              className="w-full sm:w-auto bg-[#F8FAFC] text-[#0F172A] font-headline text-xs font-bold py-2.5 px-4 rounded-lg border border-[#E2E8F0] hover:bg-slate-100 flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
            >
              <span className={`material-symbols-outlined text-[18px] text-slate-500 ${batBusy ? 'animate-spin' : ''}`}>
                {batBusy ? 'progress_activity' : 'picture_as_pdf'}
              </span>
              <span>{batBusy ? 'Génération du BAT…' : 'Télécharger BAT (300 DPI)'}</span>
            </button>
            {can('write') && (
              <button
                onClick={() => onToggleCardBlock(currentCard.id)}
                type="button"
                className="w-full sm:w-auto bg-red-50 text-[#DC2626] hover:bg-red-100 font-headline text-xs font-bold py-2.5 px-4 rounded-lg border border-red-200 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">block</span>
                <span>{currentCard.status === 'bloquee_perdue' ? 'Débloquer' : 'Bloquer / Perdue'}</span>
              </button>
            )}
          </div>

        </div>

        {/* RIGHT PANEL: Registry of Recently Issued Cards (5 Cols) */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E2E8F0] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#06B6D4] text-[20px]">history_edu</span>
                <h2 className="font-headline text-base font-bold text-[#0F172A]">Registre des Cartes Émises</h2>
              </div>
              <span className="font-mono-data text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                Total {cards.length} cartes
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-headline">
              {[
                { id: 'all', label: `Toutes (${cards.length})` },
                { id: 'actif', label: `Actives (${cards.filter(c => c.status === 'actif').length})` },
                { id: 'a_renouveler', label: 'À renouveler' },
                { id: 'bloquee_perdue', label: 'Bloquées' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setFilterType(p.id as any)}
                  type="button"
                  className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                    filterType === p.id
                      ? 'bg-[#0F172A] text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards List Table */}
          <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] text-slate-500 uppercase tracking-wider font-semibold border-b border-[#E2E8F0]">
                    <th className="py-2.5 px-3">Titulaire &amp; N° Carte</th>
                    <th className="py-2.5 px-3">Type &amp; Puce</th>
                    <th className="py-2.5 px-3">Statut &amp; Dernier Passage</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredCards.map((card) => {
                    const isSelected = card.id === selectedCardId;
                    return (
                      <tr
                        key={card.id}
                        onClick={() => setSelectedCardId(card.id)}
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                          isSelected ? 'bg-cyan-50/50' : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#0F172A]">{card.memberName}</span>
                            <span className="font-mono-data text-[11px] text-[#06B6D4] font-semibold">{card.cardNumber}</span>
                            <div className="mt-1"><EntityActions compact collection="cards" record={card} label={`Carte ${card.cardNumber}`} /></div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-[#0F172A]">{card.primaryPlate}</span>
                            <span className="font-mono-data text-[10px] text-slate-400">{card.rfidTag}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`inline-flex items-center gap-1 font-mono-data text-[10px] font-bold w-fit ${
                                card.status === 'actif'
                                  ? 'text-[#16A34A]'
                                  : card.status === 'a_renouveler'
                                  ? 'text-amber-600'
                                  : 'text-[#DC2626]'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              {card.status.toUpperCase()}
                            </span>
                            <span className="font-mono-data text-[10px] text-slate-400">
                              {card.lastPassageTimestamp || 'Récent'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCardId(card.id);
                              setCurrentSide('recto');
                              window.print();
                            }}
                            className="p-1 rounded text-slate-400 hover:text-[#0F172A] hover:bg-slate-100"
                            title="Imprimer"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">print</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Last passages recorded on the cards */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E2E8F0] flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#06B6D4] text-[18px]">sensor_door</span>
              <h3 className="font-headline text-xs font-bold text-[#0F172A]">Derniers passages enregistrés</h3>
            </div>
            {(() => {
              const passages = cards.filter((c) => c.lastPassageTimestamp).slice(0, 5);
              if (passages.length === 0) {
                return <p className="text-xs text-slate-400 py-2">Aucun passage enregistré.</p>;
              }
              return (
                <div className="space-y-2 text-xs">
                  {passages.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-[#0F172A] truncate">{c.lastPassageGate || c.siteName}</div>
                        <div className="font-mono-plate text-[10px] text-slate-500 truncate">{c.primaryPlate} • {c.memberName}</div>
                      </div>
                      <span className="font-mono-data text-[10px] text-slate-400 shrink-0">{c.lastPassageTimestamp}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

/** Issuing a card: member, vehicle(s), validity; the member's current active card can be replaced. */
const IssueCardModal: React.FC<{
  members: Member[];
  vehicles: Vehicle[];
  cards: MembershipCard[];
  onClose: () => void;
  onIssued: (card: MembershipCard) => void;
}> = ({ members, vehicles, cards, onClose, onIssued }) => {
  const eligible = members.filter((m) => m.status !== 'radie' && vehicles.some((v) => v.memberId === m.id && v.status !== 'radie'));
  const [memberId, setMemberId] = useState(eligible[0]?.id || '');
  const own = vehicles.filter((v) => v.memberId === memberId && v.status !== 'radie');
  const [primaryPlate, setPrimaryPlate] = useState(own[0]?.licensePlate || '');
  const [secondaryPlate, setSecondaryPlate] = useState('');
  const [validityMonths, setValidityMonths] = useState('12');
  const [replaceActive, setReplaceActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = cards.filter((c) => c.memberId === memberId && c.status === 'actif');

  const pickMember = (id: string) => {
    setMemberId(id);
    setPrimaryPlate(vehicles.find((v) => v.memberId === id && v.status !== 'radie')?.licensePlate || '');
    setSecondaryPlate('');
    setReplaceActive(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const card = await issueMembershipCard({
        memberId,
        primaryPlate,
        secondaryPlate: secondaryPlate || undefined,
        validityMonths: Number(validityMonths),
        replaceActive
      });
      notify(`Carte ${card.cardNumber} émise pour ${card.memberName}.`, 'success');
      onIssued(card);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Émission impossible.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs';
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-left">
      <form onSubmit={submit} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-3 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <h3 className="font-headline text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#06B6D4]">add_card</span>
            Émettre une carte de membre
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-[#0F172A]" aria-label="Fermer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        {eligible.length === 0 ? (
          <p className="text-slate-500 py-4">Aucun membre actif avec véhicule.</p>
        ) : (
          <>
            <label className="block">
              <span className="block text-[11px] font-semibold text-slate-500 mb-1">Membre *</span>
              <select value={memberId} onChange={(e) => pickMember(e.target.value)} className={field} required>
                {eligible.map((m) => (
                  <option key={m.id} value={m.id}>{m.memberNumber} — {m.fullName}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">Véhicule principal *</span>
                <select value={primaryPlate} onChange={(e) => setPrimaryPlate(e.target.value)} className={field} required>
                  {own.map((v) => <option key={v.id} value={v.licensePlate}>{v.licensePlate} — {v.brand} {v.model}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">Second véhicule</span>
                <select value={secondaryPlate} onChange={(e) => setSecondaryPlate(e.target.value)} className={field}>
                  <option value="">— Aucun —</option>
                  {own.filter((v) => v.licensePlate !== primaryPlate).map((v) => <option key={v.id} value={v.licensePlate}>{v.licensePlate}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="block text-[11px] font-semibold text-slate-500 mb-1">Validité</span>
              <select value={validityMonths} onChange={(e) => setValidityMonths(e.target.value)} className={field}>
                {[6, 12, 24, 36].map((n) => <option key={n} value={n}>{n} mois</option>)}
              </select>
            </label>
            {active.length > 0 && (
              <label className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                <input type="checkbox" checked={replaceActive} onChange={(e) => setReplaceActive(e.target.checked)} className="mt-0.5" />
                <span>
                  Ce membre a déjà une carte active ({active.map((c) => c.cardNumber).join(', ')}). Cochez pour la <strong>révoquer</strong> et la remplacer
                  (perte, changement de véhicule…).
                </span>
              </label>
            )}
            <p className="text-[10px] text-slate-400">Le numéro de carte, le badge et le jeton du QR code sont générés automatiquement.</p>
          </>
        )}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">Annuler</button>
          <button
            type="submit"
            disabled={busy || eligible.length === 0 || !primaryPlate || (active.length > 0 && !replaceActive)}
            className="px-5 py-2 rounded-lg bg-[#06B6D4] text-[#0F172A] font-headline font-bold hover:bg-[#0891B2] hover:text-white disabled:opacity-50"
          >
            {busy ? 'Émission…' : 'Émettre la carte'}
          </button>
        </div>
      </form>
    </div>
  );
};
