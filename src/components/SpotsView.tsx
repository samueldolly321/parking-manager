import React, { useState } from 'react';
import { EntityActions } from './EntityActions';
import { ParkingSpot, SpotStatus, Site } from '../types';

interface SpotsViewProps {
  spots: ParkingSpot[];
  sites: Site[];
  selectedSiteId: string;
  onUpdateSpotStatus: (spotId: string, status: SpotStatus, details?: Partial<ParkingSpot>) => void;
  onOpenNewPayment: () => void;
}

export const SpotsView: React.FC<SpotsViewProps> = ({
  spots,
  sites,
  selectedSiteId,
  onUpdateSpotStatus,
  onOpenNewPayment
}) => {
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSpotId, setSelectedSpotId] = useState<string>(spots[0]?.id || '');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [newPlate, setNewPlate] = useState<string>('');
  const [newDriver, setNewDriver] = useState<string>('');

  // Filter spots based on site, zone and status
  const siteSpots = spots.filter(s => selectedSiteId === 'all' || s.siteId === selectedSiteId);

  const filteredSpots = siteSpots.filter(spot => {
    const matchesZone = selectedZone === 'all' || spot.zone.toLowerCase().includes(selectedZone.toLowerCase());
    const matchesStatus = statusFilter === 'all' || spot.status === statusFilter;
    return matchesZone && matchesStatus;
  });

  const selectedSpot = spots.find(s => s.id === selectedSpotId) || siteSpots[0];

  const totalCapacity = siteSpots.length || 180;
  const occupiedCount = siteSpots.filter(s => s.status === 'occupe').length;
  const freeCount = siteSpots.filter(s => s.status === 'libre').length;
  const reservedCount = siteSpots.filter(s => s.status === 'reserve').length;
  const maintenanceCount = siteSpots.filter(s => s.status === 'maintenance').length;
  const occupancyRate = totalCapacity > 0 ? ((occupiedCount / totalCapacity) * 100).toFixed(1) : '0';

  const handleSpotClick = (spot: ParkingSpot) => {
    setSelectedSpotId(spot.id);
    setIsAssigning(false);
  };

  const handleReleaseSpot = (spotId: string) => {
    onUpdateSpotStatus(spotId, 'libre', {
      currentVehiclePlate: undefined,
      currentVehicleModel: undefined,
      currentDriverName: undefined,
      entryTime: undefined,
      duration: undefined
    });
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpot || !newPlate.trim()) return;

    onUpdateSpotStatus(selectedSpot.id, 'occupe', {
      currentVehiclePlate: newPlate.toUpperCase().trim(),
      currentVehicleModel: 'Véhicule Enregistré',
      currentDriverName: newDriver || 'Conducteur Visiteur',
      entryTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      duration: '0h 01m'
    });
    setNewPlate('');
    setNewDriver('');
    setIsAssigning(false);
  };

  // Group filtered spots by zones
  const zoneASpots = filteredSpots.filter(s => s.code.startsWith('A-'));
  const zoneBSpots = filteredSpots.filter(s => s.code.startsWith('B-'));
  const zoneCSpots = filteredSpots.filter(s => s.code.startsWith('C-'));

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Zone Filtres & Contrôles Supérieurs */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono-data text-xs text-slate-500 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-ping"></span>
            Supervision Cadastrale &amp; Télémétrie Voies
          </div>
          <h1 className="font-headline text-2xl font-bold text-[#0F172A] tracking-tight">
            Plan interactif &amp; occupation des places
          </h1>
        </div>

        {/* Sélecteurs et Filtres d'état */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Zone Selector */}
          <div className="flex items-center bg-[#F1F5F9] px-3 py-1.5 rounded-lg border border-[#E2E8F0]">
            <span className="material-symbols-outlined text-[18px] text-slate-500 mr-1.5">layers</span>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-transparent text-xs font-medium text-[#0F172A] focus:outline-none cursor-pointer"
            >
              <option value="all">Toutes les zones</option>
              <option value="couverte">Zone A : Couverte Intérieure</option>
              <option value="extérieure">Zone B : Extérieure Privative</option>
              <option value="deux-roues">Zone C : Deux-roues Clôturée</option>
            </select>
          </div>

          {/* Statut Tabs */}
          <div className="flex flex-wrap items-center bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0] max-w-full">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'libre', label: 'Libres' },
              { id: 'occupe', label: 'Occupés' },
              { id: 'reserve', label: 'Réservés' },
              { id: 'maintenance', label: 'Travaux' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                type="button"
                className={`px-3 py-1 rounded text-xs transition-all ${
                  statusFilter === tab.id
                    ? 'bg-[#0F172A] text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Télémétrie en Temps Réel (Barre KPI Cadencée) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Capacité Totale */}
        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Capacité</span>
            <span className="material-symbols-outlined text-[16px]">grid_view</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-headline text-2xl font-bold text-[#0F172A]">{totalCapacity}</span>
            <span className="font-mono-data text-xs text-slate-400">places</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Gabarit consolidé</div>
        </div>

        {/* Places Libres */}
        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Libres</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-headline text-2xl font-bold text-[#16A34A]">{freeCount}</span>
            <span className="font-mono-data text-xs text-[#16A34A] font-medium">dispos</span>
          </div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 w-fit">
            Flux entrant actif
          </span>
        </div>

        {/* Places Occupées */}
        <div className="bg-[#0F172A] text-white p-3.5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-300 text-xs font-semibold uppercase">
            <span>Occupées</span>
            <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">directions_car</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-headline text-2xl font-bold text-white">{occupiedCount}</span>
            <span className="font-mono-data text-xs text-slate-400">véhicules</span>
          </div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-[#06B6D4] w-fit">
            Taux stabilisé
          </span>
        </div>

        {/* Réservées */}
        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Réservées</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-headline text-2xl font-bold text-[#0284C7]">{reservedCount}</span>
            <span className="font-mono-data text-xs text-slate-400">VIP / Abo</span>
          </div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 w-fit">
            Attente arrivée
          </span>
        </div>

        {/* Maintenance */}
        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Travaux / Inertes</span>
            <span className="material-symbols-outlined text-[16px] text-[#DC2626]">build</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-headline text-2xl font-bold text-[#DC2626]">{maintenanceCount}</span>
            <span className="font-mono-data text-xs text-[#DC2626]">plots</span>
          </div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 w-fit">
            Pavage &amp; borne
          </span>
        </div>

        {/* Jauge de Charge Globale */}
        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Occupation</span>
            <span className="font-mono-data text-xs font-bold text-[#F59E0B]">{occupancyRate}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 mt-2 overflow-hidden flex">
            <div className="h-full bg-[#F59E0B] rounded-full transition-all" style={{ width: `${occupancyRate}%` }}></div>
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono-data text-slate-400 mt-1">
            <span>Zone A: 87%</span>
            <span>Zone B: 75%</span>
          </div>
        </div>
      </div>

      {/* Main Floor Plan & Detail Drawer Side-by-Side */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Spatial Layout & Spot Grids (8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-5">
          {/* Floor Plan Header */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="font-headline text-sm font-bold text-[#0F172A]">Analakely Central - RDC &amp; Extérieur</span>
              <span className="px-2 py-0.5 rounded font-mono-data text-xs bg-[#EEF2FF] text-[#4338CA] font-semibold">
                Portail Principal Ave. de l'Indépendance
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono-data text-xs text-slate-500">
              <span className="material-symbols-outlined text-[16px] text-[#16A34A]">sensors</span>
              <span>Capteurs sol LoRaWAN : <strong className="text-[#16A34A]">Actifs (99.8%)</strong></span>
            </div>
          </div>

          {/* ZONE A: Couverte VIP (Placement Libre & Banalisé) */}
          {(selectedZone === 'all' || selectedZone.includes('couverte')) && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-6 bg-[#0F172A] rounded-full"></span>
                  <div>
                    <h2 className="font-headline text-sm font-bold text-[#0F172A]">
                      Zone A - Couverte Intérieure (Placement Libre &amp; Banalisé)
                    </h2>
                    <span className="text-xs text-slate-500">
                      Travée A-01 à A-08 • Hauteur max 2.20m • Sans place attitrée fixe (Tarif 120 000 Ar/mois)
                    </span>
                  </div>
                </div>
                <span className="font-mono-data text-xs px-2.5 py-1 bg-slate-100 rounded text-slate-700 font-semibold self-start sm:self-center">
                  {zoneASpots.filter(s => s.status === 'occupe').length} / {zoneASpots.length} occupées
                </span>
              </div>

              {/* Grid A */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {zoneASpots.map((spot) => {
                  const isSelected = selectedSpot?.id === spot.id;
                  return (
                    <button
                      key={spot.id}
                      onClick={() => handleSpotClick(spot)}
                      type="button"
                      className={`text-left p-3 rounded-xl transition-all flex flex-col justify-between h-28 relative border ${
                        isSelected
                          ? 'ring-2 ring-[#06B6D4] shadow-md border-[#06B6D4]'
                          : 'border-[#E2E8F0] hover:border-slate-300'
                      } ${
                        spot.status === 'libre'
                          ? 'bg-emerald-50/50 hover:bg-emerald-50'
                          : spot.status === 'occupe'
                          ? 'bg-[#F8FAFC] hover:bg-slate-100'
                          : spot.status === 'reserve'
                          ? 'bg-sky-50/60 hover:bg-sky-50'
                          : 'bg-red-50/60 hover:bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono-metric text-base font-bold text-[#0F172A]">{spot.code}</span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            spot.status === 'libre'
                              ? 'bg-[#16A34A]'
                              : spot.status === 'occupe'
                              ? 'bg-[#0F172A]'
                              : spot.status === 'reserve'
                              ? 'bg-[#0284C7]'
                              : 'bg-[#DC2626]'
                          }`}
                        ></span>
                      </div>

                      {spot.status === 'occupe' ? (
                        <div className="flex flex-col">
                          <span className="font-mono-plate text-xs font-bold text-[#0F172A] tracking-wider bg-white px-1.5 py-0.5 rounded shadow-sm w-fit border border-[#E2E8F0]">
                            {spot.currentVehiclePlate}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate mt-1">
                            {spot.currentVehicleModel || spot.currentDriverName}
                          </span>
                        </div>
                      ) : spot.status === 'libre' ? (
                        <div className="flex flex-col">
                          <span className="font-headline text-xs font-bold text-[#16A34A]">PLACE LIBRE</span>
                          <span className="text-[10px] text-slate-400">Capteur sol vert</span>
                        </div>
                      ) : spot.status === 'reserve' ? (
                        <div className="flex flex-col">
                          <span className="font-headline text-xs font-bold text-[#0284C7]">RÉSERVÉ</span>
                          <span className="text-[10px] text-slate-500 truncate">{spot.assignedAbonnement}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-headline text-xs font-bold text-[#DC2626]">MAINTENANCE</span>
                          <span className="text-[10px] text-slate-500 truncate">Plot hors service</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between font-mono-data text-[10px] text-slate-400">
                        <span>{spot.status === 'occupe' ? spot.duration || 'En stationnement' : 'Placement libre'}</span>
                        {spot.status === 'occupe' && (
                          <span className="material-symbols-outlined text-[14px] text-[#06B6D4]">verified</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ZONE B: Extérieure Dédiée (Emplacement Privatif) */}
          {(selectedZone === 'all' || selectedZone.includes('extérieure')) && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-6 bg-[#F59E0B] rounded-full"></span>
                  <div>
                    <h2 className="font-headline text-sm font-bold text-[#0F172A]">
                      Zone B - Voirie Extérieure (Emplacements Privatifs Dédiés)
                    </h2>
                    <span className="text-xs text-slate-500">
                      Places numérotées fixes réservées nominativement sur voirie balisée (Tarif 180 000 Ar/mois)
                    </span>
                  </div>
                </div>
                <span className="font-mono-data text-xs px-2.5 py-1 bg-amber-50 rounded text-amber-800 font-semibold border border-amber-200">
                  Formule Privative Externe
                </span>
              </div>

              {/* Grid B */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {zoneBSpots.map((spot) => {
                  const isSelected = selectedSpot?.id === spot.id;
                  return (
                    <button
                      key={spot.id}
                      onClick={() => handleSpotClick(spot)}
                      type="button"
                      className={`text-left p-3 rounded-xl transition-all flex flex-col justify-between h-28 relative border ${
                        isSelected
                          ? 'ring-2 ring-[#06B6D4] shadow-md border-[#06B6D4]'
                          : 'border-[#E2E8F0] hover:border-slate-300'
                      } ${
                        spot.status === 'libre'
                          ? 'bg-emerald-50/50 hover:bg-emerald-50'
                          : 'bg-[#F8FAFC] hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono-metric text-base font-bold text-[#0F172A]">{spot.code}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono-data bg-amber-100 text-amber-800 font-bold">
                          PRIVATIF
                        </span>
                      </div>

                      {spot.status === 'occupe' ? (
                        <div className="flex flex-col">
                          <span className="font-mono-plate text-xs font-bold text-[#0F172A] bg-white px-1.5 py-0.5 rounded shadow-sm w-fit border border-[#E2E8F0]">
                            {spot.currentVehiclePlate}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate mt-1">
                            {spot.currentDriverName || spot.currentVehicleModel}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-headline text-xs font-bold text-[#16A34A]">PLACE DISPONIBLE</span>
                          <span className="text-[10px] text-slate-400">Prêt pour abonné dédié</span>
                        </div>
                      )}

                      <div className="font-mono-data text-[10px] text-slate-400">
                        180 000 Ar/mois • Nominatif
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ZONE C: Deux-Roues (Motos & Scooters) */}
          {(selectedZone === 'all' || selectedZone.includes('deux-roues')) && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-6 bg-[#06B6D4] rounded-full"></span>
                  <div>
                    <h2 className="font-headline text-sm font-bold text-[#0F172A]">
                      Zone C - Deux-roues Clôturée (Motos &amp; Scooters)
                    </h2>
                    <span className="text-xs text-slate-500">
                      Zone sécurisée fermée avec anneaux d'ancrage et antivols sabots (Tarif 40 000 Ar/mois)
                    </span>
                  </div>
                </div>
                <span className="font-mono-data text-xs px-2.5 py-1 bg-cyan-50 text-cyan-800 rounded font-semibold border border-cyan-200">
                  Zone 2R
                </span>
              </div>

              {/* Grid C */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {zoneCSpots.map((spot) => {
                  const isSelected = selectedSpot?.id === spot.id;
                  return (
                    <button
                      key={spot.id}
                      onClick={() => handleSpotClick(spot)}
                      type="button"
                      className={`text-left p-3 rounded-xl transition-all flex flex-col justify-between h-28 relative border ${
                        isSelected
                          ? 'ring-2 ring-[#06B6D4] shadow-md border-[#06B6D4]'
                          : 'border-[#E2E8F0] hover:border-slate-300'
                      } ${
                        spot.status === 'libre'
                          ? 'bg-emerald-50/50 hover:bg-emerald-50'
                          : 'bg-[#F8FAFC] hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono-metric text-base font-bold text-[#0F172A]">{spot.code}</span>
                        <span className="material-symbols-outlined text-[16px] text-slate-400">two_wheeler</span>
                      </div>

                      {spot.status === 'occupe' ? (
                        <div className="flex flex-col">
                          <span className="font-mono-plate text-xs font-bold text-[#0F172A] bg-white px-1.5 py-0.5 rounded shadow-sm w-fit border border-[#E2E8F0]">
                            {spot.currentVehiclePlate}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate mt-1">
                            {spot.currentVehicleModel || spot.currentDriverName}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-headline text-xs font-bold text-[#16A34A]">PLACE MOTO LIBRE</span>
                          <span className="text-[10px] text-slate-400">Sabot disponible</span>
                        </div>
                      )}

                      <div className="font-mono-data text-[10px] text-slate-400">
                        40 000 Ar/m
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Detailed Inspection Drawer (4 cols) */}
        <div className="xl:col-span-4 bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-5 flex flex-col gap-4 sticky top-20">
          <div className="flex items-start justify-between pb-3 border-b border-[#E2E8F0]">
            <div>
              <div className="font-mono-data text-xs text-[#06B6D4] font-semibold uppercase">Fiche d'Emplacement</div>
              <h3 className="font-headline text-xl font-bold text-[#0F172A]">{selectedSpot.code}</h3>
              <span className="text-xs text-slate-500">{selectedSpot.zone}</span>
              <div className="mt-2"><EntityActions collection="spots" record={selectedSpot} label={`Emplacement ${selectedSpot.code}`} /></div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full font-mono-data text-xs font-bold uppercase ${
                selectedSpot.status === 'libre'
                  ? 'bg-emerald-100 text-[#16A34A]'
                  : selectedSpot.status === 'occupe'
                  ? 'bg-[#0F172A] text-white'
                  : selectedSpot.status === 'reserve'
                  ? 'bg-sky-100 text-[#0284C7]'
                  : 'bg-red-100 text-[#DC2626]'
              }`}
            >
              {selectedSpot.status}
            </span>
          </div>

          {selectedSpot.status === 'occupe' ? (
            <div className="space-y-4">
              {/* Vehicle & Member Info */}
              <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 uppercase font-semibold">Véhicule présent</span>
                  <span className="font-mono-plate text-xs font-bold text-[#0F172A] bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
                    {selectedSpot.currentVehiclePlate}
                  </span>
                </div>
                <div className="font-headline text-xs font-bold text-[#0F172A]">
                  {selectedSpot.currentVehicleModel || 'Toyota Hilux'}
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
                  <span>{selectedSpot.currentDriverName || 'Conducteur'}</span>
                </div>
              </div>

              {/* Timing & Formula */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase">Arrivée</span>
                  <span className="font-mono-data font-bold text-[#0F172A]">{selectedSpot.entryTime || '07:42'}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase">Durée écoulée</span>
                  <span className="font-mono-data font-bold text-[#06B6D4]">{selectedSpot.duration || '3h 18min'}</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-400 block text-[10px] uppercase">Formule Appliquée</span>
                <span className="font-semibold text-[#0F172A]">{selectedSpot.assignedAbonnement || 'Placement Libre Banalisé'}</span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => handleReleaseSpot(selectedSpot.id)}
                  type="button"
                  className="w-full py-2.5 px-3 rounded-lg bg-[#16A34A] text-white hover:bg-[#15803D] transition-colors font-headline text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span>Libérer la place (Sortie)</span>
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
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center space-y-1">
                <span className="material-symbols-outlined text-3xl text-[#16A34A]">check_circle</span>
                <div className="font-headline text-sm font-bold text-emerald-900">Emplacement Libre</div>
                <p className="text-xs text-emerald-700">Cette place est prête à accueillir un véhicule.</p>
              </div>

              {!isAssigning ? (
                <div className="space-y-2">
                  <button
                    onClick={() => setIsAssigning(true)}
                    type="button"
                    className="w-full py-2.5 px-3 rounded-lg bg-[#0F172A] text-white hover:bg-slate-800 transition-colors font-headline text-xs font-bold flex items-center justify-center gap-2 shadow-md"
                  >
                    <span className="material-symbols-outlined text-[18px]">directions_car</span>
                    <span>Assigner un véhicule</span>
                  </button>
                  <button
                    onClick={() => onUpdateSpotStatus(selectedSpot.id, 'maintenance')}
                    type="button"
                    className="w-full py-2 px-3 rounded-lg bg-[#F1F5F9] text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors text-xs font-medium flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">build</span>
                    <span>Mettre en maintenance</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAssignSubmit} className="space-y-3 bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                  <div className="text-xs font-bold text-[#0F172A]">Assignation Rapide</div>
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                      Immatriculation (ex: 6543 TBD)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="XXXX TBD"
                      value={newPlate}
                      onChange={(e) => setNewPlate(e.target.value)}
                      className="w-full p-2 bg-white rounded border border-[#E2E8F0] font-mono-plate text-xs font-bold uppercase focus:ring-1 focus:ring-[#06B6D4]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                      Conducteur / Société
                    </label>
                    <input
                      type="text"
                      placeholder="Nom complet"
                      value={newDriver}
                      onChange={(e) => setNewDriver(e.target.value)}
                      className="w-full p-2 bg-white rounded border border-[#E2E8F0] text-xs focus:ring-1 focus:ring-[#06B6D4]"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-1.5 rounded bg-[#06B6D4] text-[#0F172A] font-bold text-xs hover:bg-[#0891b2] hover:text-white transition-colors"
                    >
                      Confirmer
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAssigning(false)}
                      className="px-3 py-1.5 rounded bg-slate-200 text-slate-700 text-xs hover:bg-slate-300"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
