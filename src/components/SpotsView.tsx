import React, { useEffect, useMemo, useState } from 'react';
import { EntityActions } from './EntityActions';
import { Member, ParkingSpot, Site, SpotStatus, Tariff, User, Vehicle } from '../types';
import {
  SPOT_STATUS_LABELS,
  SPOT_TYPE_LABELS,
  SPOT_TYPE_ICONS,
  ZoneGroup,
  elapsedSince,
  formatEntryTime,
  groupByZone,
  nextSpotCodes,
  tariffForSpot
} from '../services/spots';
import { roleCan } from '../services/permissions';
import { addSpotRecords } from '../services/storage';
import { notify } from '../services/notify';

interface SpotsViewProps {
  spots: ParkingSpot[];
  sites: Site[];
  tariffs: Tariff[];
  vehicles: Vehicle[];
  members: Member[];
  currentUser: User;
  selectedSiteId: string;
  onUpdateSpotStatus: (spotId: string, status: SpotStatus, details?: Partial<ParkingSpot>) => void;
  onOpenNewPayment: () => void;
}

const STATUS_STYLE: Record<SpotStatus, { card: string; dot: string; badge: string; text: string; icon: string }> = {
  libre: { card: 'bg-emerald-50/50 hover:bg-emerald-50', dot: 'bg-[#16A34A]', badge: 'bg-emerald-100 text-[#16A34A]', text: 'text-[#16A34A]', icon: 'bg-emerald-100 text-[#16A34A]' },
  occupe: { card: 'bg-[#F8FAFC] hover:bg-slate-100', dot: 'bg-[#0F172A]', badge: 'bg-[#0F172A] text-white', text: 'text-[#0F172A]', icon: 'bg-[#0F172A] text-white' },
  reserve: { card: 'bg-sky-50/60 hover:bg-sky-50', dot: 'bg-[#0284C7]', badge: 'bg-sky-100 text-[#0284C7]', text: 'text-[#0284C7]', icon: 'bg-sky-100 text-[#0284C7]' },
  maintenance: { card: 'bg-red-50/60 hover:bg-red-50', dot: 'bg-[#DC2626]', badge: 'bg-red-100 text-[#DC2626]', text: 'text-[#DC2626]', icon: 'bg-red-100 text-[#DC2626]' }
};

/** Icon of the spot type, coloured by the spot status. */
const SpotTypeIcon: React.FC<{ type: ParkingSpot['type']; status: SpotStatus; size?: number }> = ({ type, status, size = 16 }) => (
  <span
    title={`${SPOT_TYPE_LABELS[type]} — ${SPOT_STATUS_LABELS[status]}`}
    className={`inline-flex items-center justify-center rounded-md ${STATUS_STYLE[status].icon}`}
    style={{ width: size + 10, height: size + 10 }}
  >
    <span className="material-symbols-outlined" style={{ fontSize: size }}>{SPOT_TYPE_ICONS[type]}</span>
  </span>
);

const ZONE_COLORS = ['bg-[#0F172A]', 'bg-[#F59E0B]', 'bg-[#06B6D4]', 'bg-[#8B5CF6]', 'bg-[#16A34A]', 'bg-[#DC2626]'];

const formatAr = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/ |,/g, ' ');
const PERIOD: Record<Tariff['duration'], string> = { jour: 'jour', semaine: 'semaine', mois: 'mois', an: 'an' };

/** Re-renders every minute so that parking durations stay current. */
function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export const SpotsView: React.FC<SpotsViewProps> = ({
  spots,
  sites,
  tariffs,
  vehicles,
  members,
  currentUser,
  selectedSiteId,
  onUpdateSpotStatus,
  onOpenNewPayment
}) => {
  const now = useNow();
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSpotId, setSelectedSpotId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [newPlate, setNewPlate] = useState<string>('');
  const [newDriver, setNewDriver] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);

  const siteName = (id: string) => sites.find((s) => s.id === id)?.name || id;
  const canCreate = roleCan(currentUser.role, 'spots');

  const siteSpots = spots.filter((s) => selectedSiteId === 'all' || s.siteId === selectedSiteId);
  const allGroups = useMemo(() => groupByZone(siteSpots), [siteSpots]);
  const zoneNames = useMemo(() => [...new Set(allGroups.map((g) => g.zone))], [allGroups]);

  const visibleGroups: ZoneGroup[] = allGroups
    .filter((g) => selectedZone === 'all' || g.zone === selectedZone)
    .map((g) => ({ ...g, spots: g.spots.filter((s) => statusFilter === 'all' || s.status === statusFilter) }))
    .filter((g) => g.spots.length > 0);

  const selectedSpot = siteSpots.find((s) => s.id === selectedSpotId) || visibleGroups[0]?.spots[0] || siteSpots[0];

  const count = (status: SpotStatus) => siteSpots.filter((s) => s.status === status).length;
  const total = siteSpots.length;
  const occupiedCount = count('occupe');
  const occupancyRate = total > 0 ? Math.round((occupiedCount / total) * 100) : 0;
  const pct = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)} %` : '—');
  // Capacity declared on the site file(s), to compare with the spots actually configured
  const declaredCapacity = (selectedSiteId === 'all' ? sites : sites.filter((s) => s.id === selectedSiteId)).reduce(
    (sum, s) => sum + (Number(s.totalCapacity) || 0),
    0
  );
  const currentSite = selectedSiteId === 'all' ? undefined : sites.find((s) => s.id === selectedSiteId);

  // Registered vehicles of the site, to fill in the model and the owner from the plate
  const siteVehicles = vehicles.filter((v) => !selectedSpot || v.siteId === selectedSpot.siteId);
  const findVehicle = (plate: string) => {
    const p = plate.replace(/\s+/g, '').toUpperCase();
    return p ? vehicles.find((v) => v.licensePlate.replace(/\s+/g, '').toUpperCase() === p) : undefined;
  };
  const matchedVehicle = findVehicle(newPlate);
  const matchedOwner = matchedVehicle ? members.find((m) => m.id === matchedVehicle.memberId) : undefined;

  const handleReleaseSpot = (spotId: string) => {
    onUpdateSpotStatus(spotId, 'libre', {
      currentVehiclePlate: undefined,
      currentVehicleModel: undefined,
      currentDriverName: undefined,
      entryTime: undefined
    });
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpot || !newPlate.trim()) return;
    const vehicle = findVehicle(newPlate);
    const owner = vehicle ? members.find((m) => m.id === vehicle.memberId) : undefined;
    onUpdateSpotStatus(selectedSpot.id, 'occupe', {
      currentVehiclePlate: (vehicle?.licensePlate || newPlate).toUpperCase().trim(),
      currentVehicleModel: vehicle ? `${vehicle.brand} ${vehicle.model}`.trim() : '',
      currentDriverName: newDriver.trim() || owner?.fullName || '',
      entryTime: formatEntryTime(now)
    });
    setNewPlate('');
    setNewDriver('');
    setIsAssigning(false);
  };

  const tariffLabel = (type: ParkingSpot['type'], siteId: string) => {
    const t = tariffForSpot(tariffs, type, siteId);
    return t ? `${formatAr(t.amountAr)} Ar/${PERIOD[t.duration]}` : null;
  };

  const renderSpotCard = (spot: ParkingSpot) => {
    const style = STATUS_STYLE[spot.status];
    const isSelected = selectedSpot?.id === spot.id;
    const elapsed = spot.status === 'occupe' ? elapsedSince(spot.entryTime, now) : null;
    return (
      <button
        key={spot.id}
        onClick={() => {
          setSelectedSpotId(spot.id);
          setIsAssigning(false);
        }}
        type="button"
        className={`text-left p-3 rounded-xl transition-all flex flex-col justify-between h-28 relative border ${
          isSelected ? 'ring-2 ring-[#06B6D4] shadow-md border-[#06B6D4]' : 'border-[#E2E8F0] hover:border-slate-300'
        } ${style.card}`}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono-metric text-base font-bold text-[#0F172A]">{spot.code}</span>
          <SpotTypeIcon type={spot.type} status={spot.status} />
        </div>

        {spot.status === 'occupe' ? (
          <div className="flex flex-col min-w-0">
            <span className="font-mono-plate text-xs font-bold text-[#0F172A] tracking-wider bg-white px-1.5 py-0.5 rounded shadow-sm w-fit border border-[#E2E8F0]">
              {spot.currentVehiclePlate || 'Plaque ?'}
            </span>
            <span className="text-[11px] text-slate-500 truncate mt-1">
              {spot.currentDriverName || spot.currentVehicleModel || '—'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col min-w-0">
            <span className={`font-headline text-xs font-bold uppercase ${style.text}`}>{SPOT_STATUS_LABELS[spot.status]}</span>
            <span className="text-[10px] text-slate-500 truncate">
              {spot.status === 'reserve' ? spot.assignedAbonnement || 'Réservation' : SPOT_TYPE_LABELS[spot.type]}
            </span>
          </div>
        )}

        <div className="font-mono-data text-[10px] text-slate-400 truncate">
          {spot.status === 'occupe' ? (elapsed ? `Depuis ${elapsed}` : 'Heure d’arrivée inconnue') : tariffLabel(spot.type, spot.siteId) || ' '}
        </div>
      </button>
    );
  };

  const kpi = (label: string, value: React.ReactNode, sub: string, accent: string, icon: React.ReactNode, dark = false) => (
    <div className={`${dark ? 'bg-[#0F172A] text-white' : 'bg-white border border-[#E2E8F0]'} p-3.5 rounded-xl shadow-sm flex flex-col justify-between`}>
      <div className={`flex items-center justify-between text-xs font-semibold uppercase ${dark ? 'text-slate-300' : 'text-slate-500'}`}>
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-2">
        <span className={`font-headline text-2xl font-bold ${accent}`}>{value}</span>
      </div>
      <div className={`text-[11px] mt-1 ${dark ? 'text-slate-400' : 'text-slate-400'}`}>{sub}</div>
    </div>
  );

  return (
    <div className="flex flex-col w-full gap-6">
      {/* En-tête & filtres */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="font-mono-data text-xs text-slate-500 uppercase tracking-wider">Emplacements &amp; occupation</div>
          <h1 className="font-headline text-2xl font-bold text-[#0F172A] tracking-tight">Plan interactif &amp; occupation des places</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-[#F1F5F9] px-3 py-1.5 rounded-lg border border-[#E2E8F0]">
            <span className="material-symbols-outlined text-[18px] text-slate-500 mr-1.5">layers</span>
            <select
              value={zoneNames.includes(selectedZone) ? selectedZone : 'all'}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-transparent text-xs font-medium text-[#0F172A] focus:outline-none cursor-pointer"
            >
              <option value="all">Toutes les zones</option>
              {zoneNames.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0] max-w-full">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'libre', label: 'Libres' },
              { id: 'occupe', label: 'Occupés' },
              { id: 'reserve', label: 'Réservés' },
              { id: 'maintenance', label: 'Travaux' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                type="button"
                className={`px-3 py-1 rounded text-xs transition-all ${
                  statusFilter === tab.id ? 'bg-[#0F172A] text-white font-bold shadow-sm' : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {canCreate && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="bg-[#06B6D4] text-[#0F172A] font-headline text-xs font-bold px-3.5 py-2 rounded-lg hover:bg-[#0891B2] hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
              Nouvel emplacement
            </button>
          )}
        </div>
      </div>

      {/* Indicateurs calculés sur les places enregistrées */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpi(
          'Places',
          total,
          declaredCapacity && declaredCapacity !== total ? `Capacité déclarée : ${declaredCapacity}` : 'Emplacements configurés',
          'text-[#0F172A]',
          <span className="material-symbols-outlined text-[16px]">grid_view</span>
        )}
        {kpi('Libres', count('libre'), pct(count('libre')), 'text-[#16A34A]', <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span>)}
        {kpi('Occupées', occupiedCount, pct(occupiedCount), 'text-white', <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">directions_car</span>, true)}
        {kpi('Réservées', count('reserve'), pct(count('reserve')), 'text-[#0284C7]', <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]"></span>)}
        {kpi('En travaux', count('maintenance'), pct(count('maintenance')), 'text-[#DC2626]', <span className="material-symbols-outlined text-[16px] text-[#DC2626]">build</span>)}

        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Occupation</span>
            <span className="font-mono-data text-xs font-bold text-[#F59E0B]">{total ? `${occupancyRate} %` : '—'}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 mt-2 overflow-hidden flex">
            <div className="h-full bg-[#F59E0B] rounded-full transition-all" style={{ width: `${occupancyRate}%` }}></div>
          </div>
          <div className="flex flex-wrap gap-x-2 text-[10px] font-mono-data text-slate-400 mt-1">
            {allGroups.slice(0, 3).map((g) => (
              <span key={g.key} title={g.zone} className="truncate max-w-[7rem]">
                {g.zone.replace(/^Zone\s+/i, '').split(/[\s:–-]/)[0] || g.zone} : {g.rate} %
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Plan par zone */}
        <div className="xl:col-span-8 flex flex-col gap-5">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-headline text-sm font-bold text-[#0F172A]">
                {currentSite ? currentSite.name : `Tous les sites (${sites.length})`}
              </span>
              {currentSite?.address && (
                <span className="px-2 py-0.5 rounded font-mono-data text-xs bg-[#EEF2FF] text-[#4338CA] font-semibold">
                  {currentSite.address}
                  {currentSite.city ? `, ${currentSite.city}` : ''}
                </span>
              )}
            </div>
            <span className="font-mono-data text-xs text-slate-500">
              {allGroups.length} zone{allGroups.length > 1 ? 's' : ''} · {total} place{total > 1 ? 's' : ''}
            </span>
          </div>

          {total > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500 px-1">
              {(Object.keys(SPOT_TYPE_LABELS) as ParkingSpot['type'][]).map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-slate-500">{SPOT_TYPE_ICONS[t]}</span>
                  {SPOT_TYPE_LABELS[t]}
                </span>
              ))}
              <span className="text-slate-300">|</span>
              {(Object.keys(SPOT_STATUS_LABELS) as SpotStatus[]).map((st) => (
                <span key={st} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${STATUS_STYLE[st].dot}`}></span>
                  {SPOT_STATUS_LABELS[st]}
                </span>
              ))}
            </div>
          )}

          {total === 0 && (
            <div className="bg-white p-8 rounded-xl border border-dashed border-[#CBD5E1] text-center text-sm text-slate-500">
              <span className="material-symbols-outlined text-[36px] text-slate-300 block mb-1">local_parking</span>
              Aucun emplacement n’est encore configuré {currentSite ? `sur le ${currentSite.name}` : ''}.
              {canCreate && (
                <button type="button" onClick={() => setShowCreate(true)} className="block mx-auto mt-3 text-[#06B6D4] font-semibold hover:underline">
                  Créer les premiers emplacements
                </button>
              )}
            </div>
          )}
          {total > 0 && visibleGroups.length === 0 && (
            <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] text-center text-sm text-slate-500">
              Aucune place ne correspond à ces filtres.
            </div>
          )}

          {visibleGroups.map((g, i) => {
            const full = allGroups.find((x) => x.key === g.key)!;
            const types = [...new Set(full.spots.map((s) => s.type))];
            const zoneTariffs = types.map((t) => tariffLabel(t, g.siteId)).filter(Boolean);
            return (
              <div key={g.key} className="bg-white p-5 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-6 rounded-full shrink-0 ${ZONE_COLORS[i % ZONE_COLORS.length]}`}></span>
                    <div className="min-w-0">
                      <h2 className="font-headline text-sm font-bold text-[#0F172A]">{g.zone}</h2>
                      <span className="text-xs text-slate-500">
                        {selectedSiteId === 'all' ? `${siteName(g.siteId)} • ` : ''}
                        {types.map((t) => SPOT_TYPE_LABELS[t]).join(', ')}
                        {zoneTariffs.length ? ` • Tarif ${zoneTariffs.join(' / ')}` : ' • Aucun tarif actif'}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono-data text-xs px-2.5 py-1 bg-slate-100 rounded text-slate-700 font-semibold self-start sm:self-center whitespace-nowrap">
                    {full.occupied} / {full.spots.length} occupées · {full.rate} %
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{g.spots.map(renderSpotCard)}</div>
              </div>
            );
          })}
        </div>

        {/* Fiche de l'emplacement sélectionné */}
        <div className="xl:col-span-4 bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-5 flex flex-col gap-4 sticky top-20">
          {!selectedSpot ? (
            <p className="text-sm text-slate-500 text-center py-6">Sélectionnez un emplacement pour voir sa fiche.</p>
          ) : (
            <>
              <div className="flex items-start justify-between pb-3 border-b border-[#E2E8F0]">
                <div>
                  <div className="font-mono-data text-xs text-[#06B6D4] font-semibold uppercase">Fiche d'emplacement</div>
                  <h3 className="font-headline text-xl font-bold text-[#0F172A]">{selectedSpot.code}</h3>
                  <span className="text-xs text-slate-500 block">{selectedSpot.zone}</span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1">
                    <SpotTypeIcon type={selectedSpot.type} status={selectedSpot.status} size={14} />
                    {SPOT_TYPE_LABELS[selectedSpot.type]} • {siteName(selectedSpot.siteId)}
                  </span>
                  <div className="mt-2">
                    <EntityActions collection="spots" record={selectedSpot} label={`Emplacement ${selectedSpot.code}`} />
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full font-mono-data text-xs font-bold uppercase ${STATUS_STYLE[selectedSpot.status].badge}`}>
                  {SPOT_STATUS_LABELS[selectedSpot.status]}
                </span>
              </div>

              {selectedSpot.status === 'occupe' && (
                <div className="space-y-4">
                  <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 uppercase font-semibold">Véhicule présent</span>
                      <span className="font-mono-plate text-xs font-bold text-[#0F172A] bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
                        {selectedSpot.currentVehiclePlate || '—'}
                      </span>
                    </div>
                    <div className="font-headline text-xs font-bold text-[#0F172A]">{selectedSpot.currentVehicleModel || 'Modèle non renseigné'}</div>
                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
                      <span>{selectedSpot.currentDriverName || 'Conducteur non renseigné'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase">Arrivée</span>
                      <span className="font-mono-data font-bold text-[#0F172A]">{selectedSpot.entryTime || 'Non renseignée'}</span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase">Durée écoulée</span>
                      <span className="font-mono-data font-bold text-[#06B6D4]">{elapsedSince(selectedSpot.entryTime, now) || '—'}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase">Formule</span>
                    <span className="font-semibold text-[#0F172A]">
                      {selectedSpot.assignedAbonnement ||
                        tariffForSpot(tariffs, selectedSpot.type, selectedSpot.siteId)?.name ||
                        SPOT_TYPE_LABELS[selectedSpot.type]}
                    </span>
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => handleReleaseSpot(selectedSpot.id)}
                      type="button"
                      className="w-full py-2.5 px-3 rounded-lg bg-[#16A34A] text-white hover:bg-[#15803D] transition-colors font-headline text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      <span>Libérer la place (sortie)</span>
                    </button>
                    <button
                      onClick={onOpenNewPayment}
                      type="button"
                      className="w-full py-2 px-3 rounded-lg bg-[#F1F5F9] text-[#0F172A] hover:bg-slate-200 transition-colors text-xs font-medium flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">receipt</span>
                      <span>Encaisser un ticket / dépassement</span>
                    </button>
                  </div>
                </div>
              )}

              {selectedSpot.status === 'maintenance' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-center space-y-1">
                    <span className="material-symbols-outlined text-3xl text-[#DC2626]">build</span>
                    <div className="font-headline text-sm font-bold text-red-900">Emplacement en travaux</div>
                    <p className="text-xs text-red-700">Cette place ne peut pas accueillir de véhicule.</p>
                  </div>
                  <button
                    onClick={() => onUpdateSpotStatus(selectedSpot.id, 'libre')}
                    type="button"
                    className="w-full py-2.5 px-3 rounded-lg bg-[#16A34A] text-white hover:bg-[#15803D] transition-colors font-headline text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Remettre en service
                  </button>
                </div>
              )}

              {(selectedSpot.status === 'libre' || selectedSpot.status === 'reserve') && (
                <div className="space-y-4">
                  {selectedSpot.status === 'libre' ? (
                    <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center space-y-1">
                      <span className="material-symbols-outlined text-3xl text-[#16A34A]">check_circle</span>
                      <div className="font-headline text-sm font-bold text-emerald-900">Emplacement libre</div>
                      <p className="text-xs text-emerald-700">Cette place est prête à accueillir un véhicule.</p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-sky-50 border border-sky-200 text-center space-y-1">
                      <span className="material-symbols-outlined text-3xl text-[#0284C7]">event_available</span>
                      <div className="font-headline text-sm font-bold text-sky-900">Emplacement réservé</div>
                      <p className="text-xs text-sky-700">{selectedSpot.assignedAbonnement || 'Réservation sans précision'}</p>
                    </div>
                  )}

                  {!isAssigning ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => setIsAssigning(true)}
                        type="button"
                        className="w-full py-2.5 px-3 rounded-lg bg-[#0F172A] text-white hover:bg-slate-800 transition-colors font-headline text-xs font-bold flex items-center justify-center gap-2 shadow-md"
                      >
                        <span className="material-symbols-outlined text-[18px]">directions_car</span>
                        <span>Enregistrer l’arrivée d’un véhicule</span>
                      </button>
                      {selectedSpot.status === 'reserve' && (
                        <button
                          onClick={() => onUpdateSpotStatus(selectedSpot.id, 'libre')}
                          type="button"
                          className="w-full py-2 px-3 rounded-lg bg-[#F1F5F9] text-slate-700 hover:bg-slate-200 transition-colors text-xs font-medium flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">event_busy</span>
                          Annuler la réservation
                        </button>
                      )}
                      <button
                        onClick={() => onUpdateSpotStatus(selectedSpot.id, 'maintenance')}
                        type="button"
                        className="w-full py-2 px-3 rounded-lg bg-[#F1F5F9] text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors text-xs font-medium flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">build</span>
                        <span>Mettre en travaux</span>
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleAssignSubmit} className="space-y-3 bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                      <div className="text-xs font-bold text-[#0F172A]">Arrivée d’un véhicule</div>
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Immatriculation *</label>
                        <input
                          type="text"
                          required
                          list="spot-vehicle-plates"
                          placeholder="ex : 1234 TBA"
                          value={newPlate}
                          onChange={(e) => setNewPlate(e.target.value)}
                          className="w-full p-2 bg-white rounded border border-[#E2E8F0] font-mono-plate text-xs font-bold uppercase focus:ring-1 focus:ring-[#06B6D4]"
                        />
                        <datalist id="spot-vehicle-plates">
                          {siteVehicles.map((v) => (
                            <option key={v.id} value={v.licensePlate}>{`${v.brand} ${v.model}`}</option>
                          ))}
                        </datalist>
                        <p className="text-[10px] mt-1 text-slate-500">
                          {matchedVehicle
                            ? `Véhicule enregistré : ${matchedVehicle.brand} ${matchedVehicle.model}${matchedOwner ? ` — ${matchedOwner.fullName}` : ''}`
                            : newPlate.trim()
                            ? 'Véhicule visiteur (non enregistré).'
                            : ' '}
                        </p>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Conducteur / société</label>
                        <input
                          type="text"
                          placeholder={matchedOwner?.fullName || 'Nom complet'}
                          value={newDriver}
                          onChange={(e) => setNewDriver(e.target.value)}
                          className="w-full p-2 bg-white rounded border border-[#E2E8F0] text-xs focus:ring-1 focus:ring-[#06B6D4]"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">Heure d’arrivée enregistrée : maintenant ({formatEntryTime(now)}).</p>
                      <div className="flex gap-2 pt-1">
                        <button type="submit" className="flex-1 py-1.5 rounded bg-[#06B6D4] text-[#0F172A] font-bold text-xs hover:bg-[#0891b2] hover:text-white transition-colors">
                          Confirmer
                        </button>
                        <button type="button" onClick={() => setIsAssigning(false)} className="px-3 py-1.5 rounded bg-slate-200 text-slate-700 text-xs hover:bg-slate-300">
                          Annuler
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCreate && (
        <NewSpotsModal
          sites={sites}
          spots={spots}
          defaultSiteId={selectedSiteId !== 'all' ? selectedSiteId : sites[0]?.id || ''}
          lockSite={sites.length === 1}
          onClose={() => setShowCreate(false)}
          onCreated={(created) => {
            setShowCreate(false);
            setSelectedZone('all');
            setStatusFilter('all');
            if (created[0]) setSelectedSpotId(created[0].id);
          }}
        />
      )}
    </div>
  );
};

/** Prefix and type to continue an existing zone (e.g. "A-" after "A-08"). */
function zoneDefaults(spots: ParkingSpot[], siteId: string, zone: string): { prefix?: string; type?: ParkingSpot['type'] } {
  const inZone = spots.filter((s) => s.siteId === siteId && s.zone === zone);
  if (!inZone.length) return {};
  const last = [...inZone].sort((a, b) => a.code.localeCompare(b.code, 'fr', { numeric: true })).pop()!;
  const m = /^(.*?)(\d+)$/.exec(last.code);
  return { prefix: m ? m[1] : undefined, type: last.type };
}

/** Form to create one or several spots in a zone of a site. */
export const NewSpotsModal: React.FC<{
  sites: Site[];
  spots: ParkingSpot[];
  defaultSiteId: string;
  lockSite: boolean;
  /** Zone pre-filled (adding spots to an existing zone) */
  defaultZone?: string;
  onClose: () => void;
  onCreated: (created: ParkingSpot[]) => void;
}> = ({ sites, spots, defaultSiteId, lockSite, defaultZone, onClose, onCreated }) => {
  const initial = defaultZone ? zoneDefaults(spots, defaultSiteId, defaultZone) : {};
  const [siteId, setSiteId] = useState(defaultSiteId);
  const [zone, setZone] = useState(defaultZone || '');
  const [type, setType] = useState<ParkingSpot['type']>(initial.type || 'placement_libre_interieur');
  const [prefix, setPrefix] = useState(initial.prefix ?? 'A-');
  const [quantity, setQuantity] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const siteZones = [...new Set(spots.filter((s) => s.siteId === siteId).map((s) => s.zone))];
  const qty = Math.min(200, Math.max(0, Math.floor(Number(quantity) || 0)));
  const codes = nextSpotCodes(spots, siteId, prefix, qty);

  const pickZone = (value: string) => {
    setZone(value);
    // Existing zone: continue its numbering and keep its type
    const d = zoneDefaults(spots, siteId, value);
    if (d.prefix !== undefined) setPrefix(d.prefix);
    if (d.type) setType(d.type);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zone.trim() || codes.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const created = await addSpotRecords({ siteId, zone: zone.trim(), type, codes });
      notify(`${created.length} emplacement(s) créé(s) : ${codes.length > 4 ? `${codes[0]} … ${codes[codes.length - 1]}` : codes.join(', ')}.`, 'success');
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.');
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs';
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-3 max-h-[90vh] overflow-y-auto text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <h3 className="font-headline text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#06B6D4]">add_location_alt</span>
            Nouveaux emplacements
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-[#0F172A]" aria-label="Fermer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <label className="block">
          <span className="block text-[11px] font-semibold text-slate-500 mb-1">Site *</span>
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)} disabled={lockSite} className={field} required>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-[11px] font-semibold text-slate-500 mb-1">Zone *</span>
          <input
            list="new-spot-zones"
            required
            value={zone}
            onChange={(e) => pickZone(e.target.value)}
            placeholder="ex : Zone A : Couverte Intérieure"
            className={field}
          />
          <datalist id="new-spot-zones">
            {siteZones.map((z) => <option key={z} value={z} />)}
          </datalist>
          <span className="text-[10px] text-slate-400">Choisissez une zone existante ou tapez le nom d’une nouvelle zone.</span>
        </label>

        <label className="block">
          <span className="block text-[11px] font-semibold text-slate-500 mb-1">Type de place *</span>
          <select value={type} onChange={(e) => setType(e.target.value as ParkingSpot['type'])} className={field}>
            {(Object.keys(SPOT_TYPE_LABELS) as ParkingSpot['type'][]).map((t) => (
              <option key={t} value={t}>{SPOT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-[11px] font-semibold text-slate-500 mb-1">Préfixe des codes</span>
            <input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} maxLength={20} className={`${field} font-mono-data`} />
          </label>
          <label className="block">
            <span className="block text-[11px] font-semibold text-slate-500 mb-1">Nombre de places *</span>
            <input type="number" min={1} max={200} required value={quantity} onChange={(e) => setQuantity(e.target.value)} className={field} />
          </label>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
          {codes.length === 0
            ? 'Indiquez au moins une place.'
            : `Codes créés : ${codes.length > 6 ? `${codes.slice(0, 3).join(', ')} … ${codes[codes.length - 1]}` : codes.join(', ')} (statut : libre)`}
        </div>

        {error && <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || codes.length === 0 || !zone.trim()}
            className="px-5 py-2 rounded-lg bg-[#06B6D4] text-[#0F172A] font-headline font-bold hover:bg-[#0891B2] hover:text-white transition-colors disabled:opacity-50"
          >
            {saving ? 'Création…' : `Créer ${codes.length || ''} place${codes.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </div>
  );
};
