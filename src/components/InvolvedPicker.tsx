import React, { useMemo, useState } from 'react';
import { Member, Vehicle } from '../types';
import { Avatar } from './PhotoInput';

interface InvolvedPickerProps {
  members: Member[];
  vehicles: Vehicle[];
  memberIds: string[];
  vehicleIds: string[];
  onChange: (memberIds: string[], vehicleIds: string[]) => void;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');

/**
 * Lets the user pick the members and vehicles involved in an incident.
 * Search matches member name / number / phone and vehicle plate; picking a vehicle also adds its owner.
 */
export const InvolvedPicker: React.FC<InvolvedPickerProps> = ({ members, vehicles, memberIds, vehicleIds, onChange }) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = norm(query);
    if (q.length < 2) return { members: [] as Member[], vehicles: [] as Vehicle[] };
    return {
      members: members
        .filter((m) => !memberIds.includes(m.id))
        .filter((m) => norm(m.fullName).includes(q) || norm(m.memberNumber).includes(q) || norm(m.phone).includes(q))
        .slice(0, 6),
      vehicles: vehicles
        .filter((v) => !vehicleIds.includes(v.id))
        .filter((v) => norm(v.licensePlate).includes(q) || norm(`${v.brand}${v.model}`).includes(q))
        .slice(0, 6)
    };
  }, [query, members, vehicles, memberIds, vehicleIds]);

  const addMember = (id: string) => {
    onChange([...memberIds, id], vehicleIds);
    setQuery('');
  };

  const addVehicle = (v: Vehicle) => {
    const nextMembers = memberIds.includes(v.memberId) || !v.memberId ? memberIds : [...memberIds, v.memberId];
    onChange(nextMembers, [...vehicleIds, v.id]);
    setQuery('');
  };

  const removeMember = (id: string) => {
    // Also drop that member's vehicles from the selection
    const ownVehicleIds = vehicles.filter((v) => v.memberId === id).map((v) => v.id);
    onChange(
      memberIds.filter((m) => m !== id),
      vehicleIds.filter((v) => !ownVehicleIds.includes(v))
    );
  };

  const toggleVehicle = (id: string) =>
    onChange(memberIds, vehicleIds.includes(id) ? vehicleIds.filter((v) => v !== id) : [...vehicleIds, id]);

  const selectedMembers = memberIds.map((id) => members.find((m) => m.id === id)).filter(Boolean) as Member[];
  // Vehicles picked whose owner is not in the list (owner deleted, or no owner)
  const orphanVehicles = vehicles.filter((v) => vehicleIds.includes(v.id) && !memberIds.includes(v.memberId));
  const hasResults = results.members.length > 0 || results.vehicles.length > 0;

  return (
    <div className="space-y-2">
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-[18px] pointer-events-none">search</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un membre (nom, n°, téléphone) ou une plaque…"
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        {query.trim().length >= 2 && (
          <div className="absolute z-10 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg max-h-64 overflow-y-auto">
            {!hasResults && <p className="px-3 py-2 text-xs text-slate-400">Aucun résultat</p>}
            {results.members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => addMember(m.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-cyan-50"
              >
                <Avatar src={m.avatarUrl} name={m.fullName} size={28} />
                <span className="text-xs">
                  <span className="font-semibold text-slate-900">{m.fullName}</span>
                  <span className="text-slate-400 font-mono"> · {m.memberNumber}</span>
                </span>
              </button>
            ))}
            {results.vehicles.map((v) => {
              const owner = members.find((m) => m.id === v.memberId);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => addVehicle(v)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-cyan-50"
                >
                  <span className="material-symbols-outlined text-[20px] text-slate-400">directions_car</span>
                  <span className="text-xs">
                    <span className="font-mono font-bold text-slate-900">{v.licensePlate}</span>
                    <span className="text-slate-500"> · {v.brand} {v.model}</span>
                    {owner && <span className="text-slate-400"> — {owner.fullName}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedMembers.length === 0 && orphanVehicles.length === 0 ? (
        <p className="text-[11px] text-slate-400">Aucun membre ni véhicule sélectionné.</p>
      ) : (
        <div className="space-y-1.5">
          {selectedMembers.map((m) => {
            const own = vehicles.filter((v) => v.memberId === m.id);
            return (
              <div key={m.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar src={m.avatarUrl} name={m.fullName} size={28} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">{m.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{m.memberNumber} · {m.phone}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMember(m.id)}
                    title="Retirer"
                    className="p-1 rounded hover:bg-rose-50 text-rose-600"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
                {own.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-2 pl-9">
                    {own.map((v) => {
                      const on = vehicleIds.includes(v.id);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => toggleVehicle(v.id)}
                          className={`px-2 py-1 rounded-lg border text-[11px] flex items-center gap-1 ${
                            on ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">{on ? 'check_box' : 'check_box_outline_blank'}</span>
                          <span className="font-mono font-bold">{v.licensePlate}</span>
                          <span className="opacity-80">{v.brand} {v.model}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1 pl-9">Aucun véhicule enregistré pour ce membre</p>
                )}
              </div>
            );
          })}
          {orphanVehicles.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-2 text-xs">
              <span>
                <span className="font-mono font-bold">{v.licensePlate}</span> · {v.brand} {v.model}
              </span>
              <button type="button" onClick={() => toggleVehicle(v.id)} className="p-1 rounded hover:bg-rose-50 text-rose-600">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Compact read-only summary used in tables: "RAKOTO Jean (1234 TBA), +1". */
export const InvolvedSummary: React.FC<{ members: Member[]; vehicles: Vehicle[]; memberIds?: string[]; vehicleIds?: string[] }> = ({
  members,
  vehicles,
  memberIds = [],
  vehicleIds = []
}) => {
  if (memberIds.length === 0 && vehicleIds.length === 0) return <span className="text-slate-300 text-xs">—</span>;
  const picked = vehicles.filter((v) => vehicleIds.includes(v.id));
  return (
    <div className="space-y-0.5">
      {memberIds.slice(0, 2).map((id) => {
        const m = members.find((x) => x.id === id);
        const plates = picked.filter((v) => v.memberId === id).map((v) => v.licensePlate);
        return (
          <div key={id} className="text-xs text-slate-700 whitespace-nowrap">
            {m?.fullName || 'Membre supprimé'}
            {plates.length > 0 && <span className="font-mono text-[10px] text-slate-500"> ({plates.join(', ')})</span>}
          </div>
        );
      })}
      {memberIds.length > 2 && <div className="text-[10px] text-slate-400">+{memberIds.length - 2} autre(s)</div>}
      {memberIds.length === 0 && (
        <div className="font-mono text-[10px] text-slate-500">{picked.map((v) => v.licensePlate).join(', ')}</div>
      )}
    </div>
  );
};
