import React, { useState } from 'react';
import { EntityActions } from './EntityActions';
import { Vehicle, Member, Site, VehicleCategory } from '../types';

interface VehiclesViewProps {
  vehicles: Vehicle[];
  members: Member[];
  sites: Site[];
  selectedSiteId: string;
  onAddVehicle: (vehData: Partial<Vehicle>) => void;
  /** Text pre-filled in the search field (from the header search) */
  initialSearch?: string;
  /** Opens the file of the vehicle's owner */
  onOpenMember?: (memberId: string) => void;
}

export const VehiclesView: React.FC<VehiclesViewProps> = ({
  vehicles,
  members,
  sites,
  selectedSiteId,
  onAddVehicle,
  initialSearch,
  onOpenMember
}) => {
  const [search, setSearch] = useState<string>(initialSearch || '');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form states
  const [plate, setPlate] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [color, setColor] = useState<string>('Noir');
  const [category, setCategory] = useState<VehicleCategory>('Voiture Légère (VL)');
  const [memberId, setMemberId] = useState<string>(members[0]?.id || '');
  const [siteId, setSiteId] = useState<string>('S1');

  const filtered = vehicles.filter(v => {
    const matchesSite = selectedSiteId === 'all' || v.siteId === selectedSiteId;
    const matchesCat = categoryFilter === 'all' || v.category === categoryFilter;
    const matchesSearch =
      v.licensePlate.toLowerCase().includes(search.toLowerCase()) ||
      v.brand.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase()) ||
      (v.rfidTag && v.rfidTag.toLowerCase().includes(search.toLowerCase()));
    return matchesSite && matchesCat && matchesSearch;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim() || !brand.trim() || !model.trim()) return;

    onAddVehicle({
      licensePlate: plate.toUpperCase().trim(),
      brand,
      model,
      color,
      category,
      memberId,
      siteId,
      assignedSpotType: category.includes('Deux-Roues') ? 'deux_roues' : 'placement_libre_interieur'
    });

    setPlate('');
    setBrand('');
    setModel('');
    setShowAddModal(false);
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-5 rounded-xl shadow-sm border border-[#E2E8F0]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono-data text-xs text-slate-500 uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">directions_car</span>
            Gestion Opérationnelle
          </div>
          <h1 className="font-headline text-2xl font-bold text-[#0F172A] tracking-tight">
            Parc des Véhicules Enregistrés
          </h1>
          <p className="text-xs text-slate-500">
            Immatriculations malgaches, droits de franchissement automatisé par barrière et historique des affectations.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          type="button"
          className="bg-[#0F172A] text-white font-headline text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-colors shadow-md flex items-center gap-1.5 self-start xl:self-auto"
        >
          <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">add_circle</span>
          <span>+ Ajouter Véhicule</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher immatriculation (ex: 6543 TBD), marque, tag..."
            className="w-full bg-[#F8FAFC] text-xs rounded-lg py-2 pl-9 pr-3 border border-[#E2E8F0] focus:ring-1 focus:ring-[#06B6D4]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 uppercase font-semibold text-[10px]">Catégorie :</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#F8FAFC] text-xs font-medium text-[#0F172A] py-1.5 px-3 rounded-lg border border-[#E2E8F0]"
          >
            <option value="all">Toutes ({vehicles.length})</option>
            <option value="Voiture Légère (VL)">Voiture Légère (VL)</option>
            <option value="Deux-Roues (2R)">Deux-Roues (2R)</option>
            <option value="SUV / 4x4">SUV / 4x4</option>
            <option value="Utilitaire / Fourgon">Utilitaire</option>
          </select>
        </div>
      </div>

      {/* Grid of Vehicles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((veh) => {
          const owner = members.find(m => m.id === veh.memberId);
          return (
            <div key={veh.id} className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-[#0F172A] border border-[#E2E8F0]">
                    {veh.category}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono-data text-[10px] text-[#16A34A] bg-emerald-100 px-2 py-0.5 rounded font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>ACTIF
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {veh.photoUrl ? (
                    <img src={veh.photoUrl} alt={veh.model} className="w-20 h-14 rounded-lg object-cover border border-[#E2E8F0]" />
                  ) : (
                    <div className="w-20 h-14 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-[#E2E8F0]">
                      <span className="material-symbols-outlined text-2xl">directions_car</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-headline text-sm font-bold text-[#0F172A] truncate">{veh.brand} {veh.model}</h3>
                    <span className="text-[11px] text-slate-400 block">{veh.color}</span>
                    {owner && onOpenMember ? (
                      <button
                        type="button"
                        onClick={() => onOpenMember(owner.id)}
                        title={`Ouvrir la fiche de ${owner.fullName}`}
                        className="max-w-full text-left text-xs font-semibold text-[#06B6D4] truncate block mt-0.5 hover:underline hover:text-[#0891B2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4] rounded"
                      >
                        {owner.fullName}
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 truncate block mt-0.5">
                        {owner?.fullName || 'Propriétaire inconnu'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Malagasy Plate Badge */}
                <div className="mt-4 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400">Plaque d'Immatriculation</span>
                    <span className="font-mono-plate text-sm font-bold text-[#0F172A] tracking-wider mt-0.5">
                      {veh.licensePlate}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-mono-data text-slate-400 block">MDG • TANA</span>
                    <span className="font-mono-data text-[10px] text-[#06B6D4] font-bold">{veh.rfidTag}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono-data text-[11px]">Inscrit le {veh.registeredAt}</span>
                <EntityActions compact collection="vehicles" record={veh} label={`${veh.brand} ${veh.model} (${veh.licensePlate})`} />
                <span className="text-[#06B6D4] font-semibold">
                  {veh.assignedSpotType === 'deux_roues' ? 'Zone Moto' : 'Placement Libre'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add Vehicle */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#06B6D4] text-[22px]">directions_car</span>
                <h3 className="font-headline text-lg font-bold text-[#0F172A]">Ajouter un Véhicule</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} type="button" className="text-slate-400 hover:text-[#0F172A]">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Immatriculation Malgache * (ex: 6543 TBD)
                </label>
                <input
                  type="text"
                  required
                  placeholder="6543 TBD"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] font-mono-plate text-sm font-bold uppercase focus:ring-2 focus:ring-[#06B6D4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Marque *</label>
                  <input
                    type="text"
                    required
                    placeholder="Toyota, Peugeot..."
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Modèle *</label>
                  <input
                    type="text"
                    required
                    placeholder="Rav4, 3008, Hilux..."
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Catégorie</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                  >
                    <option value="Voiture Légère (VL)">Voiture Légère (VL)</option>
                    <option value="Deux-Roues (2R)">Deux-Roues (2R)</option>
                    <option value="SUV / 4x4">SUV / 4x4</option>
                    <option value="Utilitaire / Fourgon">Utilitaire</option>
                    <option value="Taxi-Ville / Minibus">Taxi / Minibus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Couleur</label>
                  <input
                    type="text"
                    placeholder="Gris métallisé"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Propriétaire Membre *</label>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.memberNumber} - {m.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Site Principal</label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                >
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#06B6D4] text-[#0F172A] font-headline font-bold hover:bg-[#0891B2] hover:text-white transition-colors"
                >
                  Enregistrer Véhicule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
