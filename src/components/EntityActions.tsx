import React, { useMemo, useState } from 'react';
import { TARIFF_DURATION_LABELS, TARIFF_FORMULA_LABELS } from '../services/pricing';
import { COMMITTEE_ROLE_LABELS } from '../services/committee';
import { notify } from '../services/notify';
import { can } from '../services/access';
import { collectionAction } from '../services/permissions';
import { deleteEntity, loadState, updateEntity, EntityCollection } from '../services/storage';
import { PhotoInput } from './PhotoInput';
import { VEHICLE_CATEGORIES } from '../types';
import { SPOT_TYPE_LABELS } from '../services/spots';
import { EQUIPMENT_CATEGORIES, EQUIPMENT_STATUS_LABELS } from '../services/equipment';

type Option = { value: string; label: string };
const opts = (...values: string[]): Option[] =>
  values.map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) }));

/** Allowed values for enum-like fields. Key "collection.field" wins over plain "field". */
const FIELD_OPTIONS: Record<string, Option[]> = {
  'sites.status': opts('actif', 'maintenance', 'inactif'),
  'members.status': opts('actif', 'en_retard', 'suspendu', 'radie'),
  'members.category': opts('privilege', 'standard', 'resident', 'corporate'),
  mobileMoneyProvider: opts('MVola', 'Orange Money', 'Airtel Money'),
  'vehicles.status': opts('actif', 'suspendu', 'radie'),
  // Vehicle type: always picked from the list
  'vehicles.category': VEHICLE_CATEGORIES.map((c) => ({ value: c, label: c })),
  'tariffs.category': VEHICLE_CATEGORIES.map((c) => ({ value: c, label: c })),
  assignedSpotType: Object.entries(SPOT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  'spots.status': opts('libre', 'occupe', 'reserve', 'maintenance'),
  'spots.type': Object.entries(SPOT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  'receipts.paymentMethod': opts('Espèces', 'MVola', 'Orange Money', 'Airtel Money', 'Virement BNI', 'Virement BMOI', 'Chèque'),
  'receipts.status': opts('confirme', 'en_attente', 'annule', 'rembourse'),
  'subscriptions.status': opts('a_jour', 'proche_echeance', 'en_retard', 'expire'),
  typeFormula: Object.entries(TARIFF_FORMULA_LABELS).map(([value, label]) => ({ value, label })),
  duration: Object.entries(TARIFF_DURATION_LABELS).map(([value, label]) => ({ value, label })),
  'cards.status': opts('actif', 'a_renouveler', 'bloquee_perdue', 'revoquee'),
  shiftName: opts('Matin', 'Après-midi', 'Nuit', 'Repos'),
  'guards.status': opts('en_poste', 'de_repos', 'en_conge', 'absent'),
  'equipments.category': EQUIPMENT_CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
  'equipments.status': Object.entries(EQUIPMENT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  'cash-registers.status': opts('ouverte', 'cloturee'),
  'expenses.category': opts('Carburant Groupe', 'Entretien & Nettoyage', 'Fournitures Caisse', 'Pièces Barrières', 'Prime Gardiennage', 'Autre'),
  'expenses.status': opts('en_attente', 'approuve', 'rejete'),
  'incidents.type': opts('materiel', 'stationnement_illicite', 'impaye_force', 'securite', 'autre'),
  severity: opts('faible', 'moyen', 'eleve', 'critique'),
  resolutionStatus: opts('ouvert', 'en_cours', 'resolu', 'classe'),
  'committee.role': opts('President General', 'Vice President', 'President Site', 'Tresorier General', 'Tresorier Site', 'Secretaire General', 'Controleur de Gestion'),
  'committee.status': opts('actif', 'honoraire'),
  beneficiaryType: opts('personnel', 'bureau'),
  'payrolls.paymentMethod': opts('Virement BNI', 'Virement BMOI', 'Virement BOA', 'MVola', 'Orange Money', 'Espèces'),
  'payrolls.status': opts('en_attente', 'valide_tresorier', 'paye')
};

/** French labels for common field names; anything else is humanized from camelCase. */
const FIELD_LABELS: Record<string, string> = {
  fullName: 'Nom complet', name: 'Nom', code: 'Code', phone: 'Téléphone', address: 'Adresse', city: 'Ville',
  cin: 'CIN', cinIssuedDate: 'CIN délivrée le', cinIssuedLocation: 'CIN délivrée à', category: 'Catégorie',
  status: 'Statut', primarySiteId: 'Site principal', siteId: 'Site', memberNumber: 'N° membre',
  joinedDate: "Date d'adhésion", approvedByPresident: "Adhésion acceptée par (Président)", currentBalanceAr: 'Solde (Ar)', notes: 'Notes', avatarUrl: 'Photo',
  mobileMoneyProvider: 'Mobile Money', emergencyContactName: "Contact d'urgence", emergencyContactPhone: "Tél. contact d'urgence",
  designation: 'Désignation', modelSpecs: 'Marque / modèle', quantity: 'Quantité', responsibleName: 'Responsable',
  commissioningDate: 'Mise en service', estimatedValueAr: 'Valeur estimée (Ar)', totalCycles: 'Cycles totaux', photoUrl: 'Photo',
  plateNumber: 'Immatriculation', licensePlate: 'Immatriculation', assignedSpotType: 'Type de place attribué', brand: 'Marque', model: 'Modèle', color: 'Couleur', type: 'Type',
  title: 'Titre', description: 'Description', date: 'Date', amountAr: 'Montant (Ar)', role: 'Fonction',
  email: 'E-mail', location: 'Lieu', agenda: 'Ordre du jour', summaryPV: 'Résumé du PV', severity: 'Gravité',
  resolutionStatus: 'Statut de résolution', resolutionNotes: 'Notes de résolution', shiftName: 'Équipe / quart',
  paymentMethod: 'Mode de paiement', beneficiaryName: 'Bénéficiaire', beneficiaryType: 'Type de bénéficiaire',
  totalCapacity: 'Capacité totale', presidentName: 'Président', presidentPhone: 'Tél. président',
  spotNumber: 'N° emplacement', zone: 'Zone', label: 'Libellé', duration: 'Durée', price: 'Prix'
};

const TEXTAREA_FIELDS = new Set(['notes', 'description', 'agenda', 'summaryPV', 'resolutionNotes', 'details', 'address']);
const PHOTO_FIELDS = new Set(['avatarUrl', 'photoUrl']);
const HIDDEN_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'qrCodeData', 'qrCodeUrl']);

const humanize = (key: string) =>
  FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).replace(/ Ar$/, ' (Ar)');

const isSiteField = (key: string) => key === 'siteId' || key === 'primarySiteId';

/** Photo field of each kind of record: always offered, even when the record has no photo yet. */
const PHOTO_FIELD_OF: Partial<Record<EntityCollection, string>> = {
  vehicles: 'photoUrl',
  equipments: 'photoUrl',
  members: 'avatarUrl',
  guards: 'avatarUrl',
  committee: 'avatarUrl'
};

/** Which fields of a record should appear in the edit form. */
function editableKeys(collection: EntityCollection, record: Record<string, unknown>, fields?: string[]): string[] {
  const photo = PHOTO_FIELD_OF[collection];
  const withPhoto = (keys: string[]) => (photo && !keys.includes(photo) ? [photo, ...keys] : keys);
  if (fields) return withPhoto(fields);
  return withPhoto(Object.keys(record).filter((k) => {
    if (HIDDEN_FIELDS.has(k)) return false;
    // Links to other records (memberId, teamId…) are kept read-only, except the site
    if (/Id$/.test(k) && !isSiteField(k)) return false;
    const v = record[k];
    return v === null || v === undefined || ['string', 'number', 'boolean'].includes(typeof v);
  }));
}

interface EditModalProps {
  collection: EntityCollection;
  record: Record<string, unknown>;
  title: string;
  fields?: string[];
  onClose: () => void;
}

export const EntityEditModal: React.FC<EditModalProps> = ({ collection, record, title, fields, onClose }) => {
  const keys = useMemo(() => editableKeys(collection, record, fields), [collection, record, fields]);
  const sites = useMemo(() => loadState().sites, []);
  // Site president: chosen among the committee members already registered
  const committee = useMemo(() => loadState().committeeMembers || [], []);
  const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...record }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, value: unknown) =>
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // Choosing a committee member as site president also fills in their phone
      if (collection === 'sites' && key === 'presidentName' && 'presidentPhone' in prev) {
        const c = committee.find((m) => m.fullName === value);
        if (c) next.presidentPhone = c.phone || '';
      }
      return next;
    });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const patch: Record<string, unknown> = {};
    for (const key of keys) {
      let v = values[key];
      if (typeof record[key] === 'number' || key.endsWith('Ar')) {
        v = v === '' || v === undefined || v === null ? 0 : Number(v);
        if (Number.isNaN(v)) {
          setError(`« ${humanize(key)} » doit être un nombre.`);
          return;
        }
      }
      if (v !== record[key]) patch[key] = v ?? null;
    }
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateEntity(collection, String(record.id), patch);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full bg-[#F8FAFC] text-sm text-[#0F172A] px-3 py-2 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#06B6D4]';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
      <form onSubmit={save} className="bg-white rounded-2xl max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h3 className="font-headline font-bold text-[#0F172A]">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="px-6 py-4 space-y-3 overflow-y-auto">
          {keys.map((key) => {
            const value = values[key];
            const options =
              collection === 'sites' && key === 'presidentName'
                ? [
                    { value: 'À désigner', label: '— À désigner —' },
                    ...committee.map((c) => ({ value: c.fullName, label: `${c.fullName} — ${COMMITTEE_ROLE_LABELS[c.role] || c.role}` }))
                  ]
                : FIELD_OPTIONS[`${collection}.${key}`] || FIELD_OPTIONS[key];
            return (
              <label key={key} className="block space-y-1">
                <span className="text-xs font-bold text-slate-600">{humanize(key)}</span>
                {PHOTO_FIELDS.has(key) ? (
                  <PhotoInput
                    value={(value as string) || undefined}
                    onChange={(v) => set(key, v)}
                    fileNameHint={String(values.fullName || values.name || values.licensePlate || values.designation || record.id)}
                    {...(collection === 'vehicles' || collection === 'equipments'
                      ? { facingMode: 'environment' as const, emptyIcon: collection === 'vehicles' ? 'directions_car' : 'inventory_2', maxSize: 900 }
                      : {})}
                  />
                ) : isSiteField(key) ? (
                  <select className={inputCls} value={String(value ?? '')} onChange={(e) => set(key, e.target.value)}>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : options ? (
                  <select className={inputCls} value={String(value ?? '')} onChange={(e) => set(key, e.target.value)}>
                    {!options.some((o) => o.value === value) && <option value={String(value ?? '')}>{String(value ?? '—')}</option>}
                    {options.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : typeof record[key] === 'boolean' ? (
                  <input type="checkbox" checked={Boolean(value)} onChange={(e) => set(key, e.target.checked)} />
                ) : TEXTAREA_FIELDS.has(key) ? (
                  <textarea className={inputCls} rows={3} value={String(value ?? '')} onChange={(e) => set(key, e.target.value)} />
                ) : (
                  <input
                    className={inputCls}
                    type={typeof record[key] === 'number' ? 'number' : 'text'}
                    value={value === null || value === undefined ? '' : String(value)}
                    onChange={(e) => set(key, e.target.value)}
                  />
                )}
              </label>
            );
          })}
          {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#E2E8F0]">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold rounded-lg border border-[#E2E8F0]">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0F172A] text-white disabled:opacity-60">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
};

interface EntityActionsProps {
  collection: EntityCollection;
  record: { id: string } & Record<string, any>;
  /** Human name of the record, used in the dialogs (e.g. the member's name) */
  label: string;
  /** Restrict / order the fields shown in the edit form */
  fields?: string[];
  /** Called after a successful delete */
  onDeleted?: () => void;
  compact?: boolean;
}

/** Edit + delete buttons for one record. Drop it into any row or card. */
export const EntityActions: React.FC<EntityActionsProps> = ({ collection, record, label, fields, onDeleted, compact }) => {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const remove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Supprimer définitivement « ${label} » ?\nCette action est irréversible.`)) return;
    setBusy(true);
    try {
      await deleteEntity(collection, record.id);
      onDeleted?.();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Suppression impossible', 'error');
    } finally {
      setBusy(false);
    }
  };

  // Only the actions the signed-in role allows (the server checks them anyway)
  const stateKey = collection === 'committee' ? 'committeeMembers' : collection === 'cash-registers' ? 'cashRegisters' : collection;
  const need = collectionAction(stateKey);
  const canEdit = can(need);
  const canDelete = can('delete') && (need === 'write' || can(need));
  if (!canEdit && !canDelete) return null;

  const btn = compact
    ? 'p-1 rounded-md hover:bg-slate-100 transition-colors'
    : 'px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-bold flex items-center gap-1';

  return (
    <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {canEdit && (
        <button type="button" title="Modifier" className={btn} onClick={() => setEditing(true)}>
          <span className="material-symbols-outlined text-[18px] text-[#0891b2]">edit</span>
          {!compact && <span>Modifier</span>}
        </button>
      )}
      {canDelete && (
        <button type="button" title="Supprimer" className={btn} onClick={remove} disabled={busy}>
          <span className="material-symbols-outlined text-[18px] text-rose-600">delete</span>
          {!compact && <span className="text-rose-600">Supprimer</span>}
        </button>
      )}
      {editing && (
        <EntityEditModal
          collection={collection}
          record={record}
          title={`Modifier — ${label}`}
          fields={fields}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
};
