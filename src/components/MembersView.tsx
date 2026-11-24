import React, { useState } from 'react';
import { can } from '../services/access';
import { notifyNotAvailable } from '../services/notify';
import { MONTH_SHORT, monthKey, monthLabel } from '../services/months';
import { todayInTana } from '../services/dashboardMetrics';
import { BILLING_START_KEY, MONTH_STATE_LABELS, MonthState, dateToMonthKey, subscriptionHealth, yearCalendar } from '../services/subscriptionCalendar';
import { PaymentPrefill, formulaForTariff } from './NewPaymentModal';
import { initialsAvatar } from '../services/avatar';
import { useBranding, BrandLogo } from '../services/branding';
import { Member, Vehicle, Subscription, PaymentReceipt, MembershipCard, Site, CommitteeMember, VehicleCategory, VEHICLE_CATEGORIES } from '../types';
import { PhotoInput, Avatar } from './PhotoInput';
import { EntityActions } from './EntityActions';

const MEMBER_EDIT_FIELDS = [
  'avatarUrl', 'fullName', 'phone', 'cin', 'cinIssuedDate', 'cinIssuedLocation', 'address', 'category',
  'primarySiteId', 'status', 'mobileMoneyProvider', 'emergencyContactName', 'emergencyContactPhone',
  'currentBalanceAr', 'joinedDate', 'approvedByPresident', 'notes'
];

interface MembersViewProps {
  members: Member[];
  vehicles: Vehicle[];
  subscriptions: Subscription[];
  receipts: PaymentReceipt[];
  cards: MembershipCard[];
  sites: Site[];
  /** Committee, used to find the Président Général */
  committeeMembers?: CommitteeMember[];
  selectedSiteId: string;
  onAddMember: (memberData: Partial<Member>) => string;
  /** Opens the payment window (pre-filled when called from a subscription) */
  onOpenNewPayment: (prefill?: PaymentPrefill) => void;
  onSelectReceipt: (receipt: PaymentReceipt) => void;
  onToggleCardBlock: (cardId: string) => void;
  /** When true, the view opens on the list of all members instead of a single member file */
  startWithList?: boolean;
  /** Record selected on arrival (from the header search) */
  initialSelectedId?: string;
}

const STATUS_LABELS: Record<Member['status'], { label: string; className: string }> = {
  actif: { label: 'Actif', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  en_retard: { label: 'En retard', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  suspendu: { label: 'Suspendu', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  radie: { label: 'Radié', className: 'bg-slate-100 text-slate-600 border-slate-200' }
};


export const MembersView: React.FC<MembersViewProps> = ({
  members,
  vehicles,
  subscriptions,
  receipts,
  cards,
  sites,
  committeeMembers = [],
  selectedSiteId,
  onAddMember,
  onOpenNewPayment,
  onSelectReceipt,
  onToggleCardBlock,
  startWithList = false,
  initialSelectedId
}) => {
  const { appName } = useBranding();
  const [viewMode, setViewMode] = useState<'list' | 'detail'>(startWithList && !initialSelectedId ? 'list' : 'detail');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(initialSelectedId || members[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'vehicules' | 'abonnements' | 'historique'>('vehicules');
  const [calendarYear, setCalendarYear] = useState<number>(() => todayInTana().year);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [searchMember, setSearchMember] = useState<string>('');

  // Form state
  const [formName, setFormName] = useState<string>('');
  const [formCin, setFormCin] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formCategory, setFormCategory] = useState<'privilege' | 'standard' | 'resident' | 'corporate'>('standard');
  const [formSiteId, setFormSiteId] = useState<string>('S1');
  const [formPhoto, setFormPhoto] = useState<string | undefined>(undefined);
  const [formPresident, setFormPresident] = useState<string>('');
  const [formEmergencyName, setFormEmergencyName] = useState<string>('');
  const [formEmergencyPhone, setFormEmergencyPhone] = useState<string>('');
  const [formMobileMoney, setFormMobileMoney] = useState<string>('');
  // The member's vehicle (required: only owners of a vehicle are members)
  const [formPlate, setFormPlate] = useState<string>('');
  const [formBrand, setFormBrand] = useState<string>('');
  const [formModel, setFormModel] = useState<string>('');
  const [formVehCategory, setFormVehCategory] = useState<VehicleCategory>('Voiture Légère (VL)');
  const [formColor, setFormColor] = useState<string>('');
  const [formVehPhoto, setFormVehPhoto] = useState<string | undefined>(undefined);
  const plateExists = (plate: string) => {
    const p = plate.replace(/\s+/g, '').toUpperCase();
    return !!p && vehicles.some((v) => v.licensePlate.replace(/\s+/g, '').toUpperCase() === p);
  };

  /** Presidents who can accept a membership: the Président Général and the president of each site */
  const hasPresident = (name?: string) => !!name?.trim() && name.trim() !== 'À désigner';
  const presidentGeneral = committeeMembers.find((c) => c.role === 'President General' && c.status === 'actif')
    || committeeMembers.find((c) => c.role === 'President General');
  const presidentOptions: { value: string; label: string; siteId?: string }[] = [
    ...(presidentGeneral
      ? [{ value: `${presidentGeneral.fullName} (Président Général)`, label: `${presidentGeneral.fullName} — Président Général` }]
      : []),
    ...sites
      .filter((s) => hasPresident(s.presidentName))
      .map((s) => ({
        value: `${s.presidentName.trim()} (Président du site ${s.name})`,
        label: `${s.presidentName.trim()} — Président du site ${s.name}`,
        siteId: s.id
      }))
  ];
  const sitesWithoutPresident = sites.filter((s) => !hasPresident(s.presidentName));
  /** Option of the president of a site (pre-selected when the site is chosen) */
  const sitePresident = (siteId: string) => presidentOptions.find((o) => o.siteId === siteId)?.value || '';
  const openAddModal = () => {
    setFormPresident(sitePresident(formSiteId));
    setShowAddModal(true);
  };

  // Filter members
  const siteMembers = members.filter(m => selectedSiteId === 'all' || m.primarySiteId === selectedSiteId);
  const filteredMembers = siteMembers.filter(m =>
    m.fullName.toLowerCase().includes(searchMember.toLowerCase()) ||
    m.memberNumber.toLowerCase().includes(searchMember.toLowerCase()) ||
    m.phone.includes(searchMember)
  );

  const currentMember = members.find(m => m.id === selectedMemberId) || filteredMembers[0] || members[0];

  const memberVehicles = vehicles.filter(v => v.memberId === currentMember?.id);
  const memberSubs = subscriptions.filter(s => s.memberId === currentMember?.id);
  const memberReceipts = receipts.filter(r => r.memberId === currentMember?.id);

  const formatAr = (val: number) => {
    return new Intl.NumberFormat('fr-MG').format(val).replace(/,/g, ' ');
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim() || !formPresident.trim()) return;
    if (!formPlate.trim() || !formBrand.trim() || !formModel.trim() || plateExists(formPlate)) return;

    const newMemberId = onAddMember({
      fullName: formName,
      cin: formCin.trim(),
      phone: formPhone,
      emergencyContactName: formEmergencyName.trim() || undefined,
      emergencyContactPhone: formEmergencyPhone.trim() || undefined,
      mobileMoneyProvider: (formMobileMoney || undefined) as Member['mobileMoneyProvider'],
      address: formAddress || 'Antananarivo',
      category: formCategory,
      primarySiteId: formSiteId,
      approvedByPresident: formPresident.trim(),
      avatarUrl: formPhoto,
      vehicle: {
        licensePlate: formPlate.trim().replace(/\s+/g, ' ').toUpperCase(),
        brand: formBrand.trim(),
        model: formModel.trim(),
        category: formVehCategory,
        color: formColor.trim(),
        photoUrl: formVehPhoto
      }
    } as Partial<Member> & { vehicle: Partial<Vehicle> });

    // Show the newly created member's file instead of staying on the previous one
    setSelectedMemberId(newMemberId);
    setSearchMember('');
    setActiveTab('vehicules');
    setViewMode('detail');

    setFormName('');
    setFormCin('');
    setFormPhone('');
    setFormAddress('');
    setFormPhoto(undefined);
    setFormPresident('');
    setFormEmergencyName('');
    setFormEmergencyPhone('');
    setFormMobileMoney('');
    setFormPlate('');
    setFormBrand('');
    setFormModel('');
    setFormColor('');
    setFormVehPhoto(undefined);
    setFormVehCategory('Voiture Légère (VL)');
    setShowAddModal(false);
  };

  const openMemberFile = (memberId: string) => {
    setSelectedMemberId(memberId);
    setActiveTab('vehicules');
    setViewMode('detail');
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {viewMode === 'list' && (
        <div className="flex flex-col gap-4 bg-white p-5 rounded-xl shadow-sm border border-[#E2E8F0]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="font-mono-data text-xs text-slate-500">Membres &amp; Propriétaires</div>
              <h1 className="font-headline text-2xl font-bold text-[#0F172A] tracking-tight">
                Liste des membres
                <span className="ml-2 align-middle text-xs font-mono-data font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-[#E2E8F0]">
                  {filteredMembers.length}
                </span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px]">
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 pointer-events-none text-[18px]">
                  search
                </span>
                <input
                  type="search"
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  placeholder="Nom, n° membre ou téléphone"
                  className="w-full bg-[#F1F5F9] text-xs text-[#0F172A] py-2 pl-9 pr-3 rounded-lg border border-[#E2E8F0]"
                />
              </div>
              <button
                onClick={openAddModal}
                type="button"
                className="bg-[#0F172A] text-white font-headline text-xs font-bold px-4 py-2 rounded-lg shadow-md hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">person_add</span>
                <span>+ Nouveau Membre</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-slate-500 font-mono-data uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Photo</th>
                  <th className="px-3 py-2.5 font-semibold">N° membre</th>
                  <th className="px-3 py-2.5 font-semibold">Nom complet</th>
                  <th className="px-3 py-2.5 font-semibold">Téléphone</th>
                  <th className="px-3 py-2.5 font-semibold">Site</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Véhicules</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Solde (Ar)</th>
                  <th className="px-3 py-2.5 font-semibold">Statut</th>
                  <th className="px-3 py-2.5 font-semibold">Adhésion</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredMembers.map((m) => {
                  const status = STATUS_LABELS[m.status] || STATUS_LABELS.actif;
                  return (
                    <tr
                      key={m.id}
                      onClick={() => openMemberFile(m.id)}
                      className="cursor-pointer hover:bg-[#06B6D4]/5 transition-colors"
                    >
                      <td className="px-3 py-2"><Avatar src={m.avatarUrl} name={m.fullName} zoomable /></td>
                      <td className="px-3 py-2.5 font-mono-data font-bold text-[#0F172A] whitespace-nowrap">{m.memberNumber}</td>
                      <td className="px-3 py-2.5 font-medium text-[#0F172A]">{m.fullName}</td>
                      <td className="px-3 py-2.5 font-mono-data text-slate-600 whitespace-nowrap">{m.phone}</td>
                      <td className="px-3 py-2.5 text-slate-600">{sites.find((s) => s.id === m.primarySiteId)?.name || m.primarySiteId}</td>
                      <td className="px-3 py-2.5 font-mono-data text-right">{vehicles.filter((v) => v.memberId === m.id).length}</td>
                      <td className={`px-3 py-2.5 font-mono-data text-right ${m.currentBalanceAr < 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                        {formatAr(m.currentBalanceAr)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full border font-bold ${status.className}`}>{status.label}</span>
                      </td>
                      <td className="px-3 py-2.5 font-mono-data text-slate-500 whitespace-nowrap">{m.joinedDate}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <EntityActions compact collection="members" record={m} label={m.fullName} fields={MEMBER_EDIT_FIELDS} />
                      </td>
                    </tr>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-slate-500">
                      Aucun membre ne correspond à ce filtre.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500">Cliquez sur un membre pour ouvrir son dossier.</p>
        </div>
      )}

      {viewMode === 'detail' && (<>
      {/* Top Banner & Quick Selector */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-5 rounded-xl shadow-sm border border-[#E2E8F0]">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono-data text-xs text-slate-500">
            {startWithList && (
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="inline-flex items-center gap-1 text-[#0891b2] font-bold hover:underline"
              >
                <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                Liste
              </button>
            )}
            <span>Membres &amp; Propriétaires</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>Dossier Exploitation</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="font-bold text-[#0F172A] bg-slate-100 px-2 py-0.5 rounded border border-[#E2E8F0]">
              {currentMember?.memberNumber}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1">
            {currentMember && <Avatar src={currentMember.avatarUrl} name={currentMember.fullName} size={48} zoomable />}
            <h1 className="font-headline text-2xl font-bold text-[#0F172A] tracking-tight">
              {currentMember?.fullName}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full font-mono-data text-xs font-bold bg-[#06B6D4]/15 text-[#0891b2] border border-[#06B6D4]/30">
              <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
              {currentMember?.category === 'privilege' ? 'MEMBRE PRIVILÈGE' : currentMember?.category.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Member Selector and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Select Member */}
          <div className="relative min-w-[220px]">
            <select
              value={currentMember?.id}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full bg-[#F1F5F9] text-xs font-medium text-[#0F172A] py-2 pl-3 pr-8 rounded-lg border border-[#E2E8F0] appearance-none cursor-pointer"
            >
              {(currentMember && !filteredMembers.some(m => m.id === currentMember.id)
                ? [currentMember, ...filteredMembers]
                : filteredMembers
              ).map(m => (
                <option key={m.id} value={m.id}>
                  {m.memberNumber} - {m.fullName}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-2 text-slate-400 pointer-events-none text-[16px]">
              expand_more
            </span>
          </div>

          {currentMember && (
            <EntityActions
              collection="members"
              record={currentMember}
              label={currentMember.fullName}
              fields={MEMBER_EDIT_FIELDS}
              onDeleted={() => {
                setSelectedMemberId('');
                if (startWithList) setViewMode('list');
              }}
            />
          )}

          <button
            onClick={openAddModal}
            type="button"
            className="bg-white text-[#0F172A] font-headline text-xs font-bold px-3.5 py-2 rounded-lg border border-[#E2E8F0] shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">person_add</span>
            <span>+ Nouveau Membre</span>
          </button>

          {can('finance') && (
            <button
              onClick={() => onOpenNewPayment(currentMember ? { memberId: currentMember.id } : undefined)}
              type="button"
              className="bg-[#0F172A] text-white font-headline text-xs font-bold px-4 py-2 rounded-lg shadow-md hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">payments</span>
              <span>+ Enregistrer paiement</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Member Identity Card & Financial Strip (Bento Overview) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left: Member Profile Dossier (8 cols) */}
        <div className="xl:col-span-8 bg-white rounded-xl p-5 shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={currentMember?.avatarUrl || initialsAvatar(currentMember?.fullName)}
                  data-zoom={currentMember?.avatarUrl ? 'true' : undefined}
                  alt={currentMember?.fullName}
                  className="w-16 h-16 rounded-xl object-cover shadow-sm border-2 border-white ring-2 ring-[#06B6D4]"
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#16A34A] text-white rounded-full flex items-center justify-center font-mono-data text-[10px] font-bold shadow" title="Compte Validé">
                  ✓
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-headline text-lg font-bold text-[#0F172A]">{currentMember?.fullName}</span>
                  <span className="px-2 py-0.5 rounded font-mono-data text-[10px] font-bold bg-emerald-100 text-[#16A34A] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
                    {currentMember?.status?.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-slate-500 font-mono-data text-xs">
                  <span>Réf : <strong className="text-[#0F172A]">{currentMember?.memberNumber}</strong></span>
                  <span>•</span>
                  <span>Inscrit le : <strong>{currentMember?.joinedDate}</strong></span>
                  {currentMember?.approvedByPresident && (
                    <>
                      <span>•</span>
                      <span>Adhésion acceptée par : <strong className="text-[#0F172A]">{currentMember.approvedByPresident}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[#F8FAFC] px-3 py-2 rounded-lg flex items-center gap-2 border border-[#E2E8F0]">
              <span className="material-symbols-outlined text-[#06B6D4] text-[20px]">location_on</span>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Site Principal</span>
                <span className="text-xs font-bold text-[#0F172A]">
                  {sites.find(s => s.id === currentMember?.primarySiteId)?.name || currentMember?.primarySiteId || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Contact & CIN Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 bg-[#F8FAFC] p-4 rounded-xl mt-3 border border-[#E2E8F0]">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Téléphone Principal</span>
              <span className="font-mono-data text-xs font-bold text-[#0F172A] mt-0.5">{currentMember?.phone}</span>
              <span className="text-[11px] text-[#06B6D4] flex items-center gap-1 mt-0.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]"></span>
                {currentMember?.mobileMoneyProvider ? `${currentMember.mobileMoneyProvider} associé` : 'Mobile Money non renseigné'}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Carte d'Identité Nationale (CIN)</span>
              <span className="font-mono-data text-xs font-bold text-[#0F172A] mt-0.5">{currentMember?.cin || 'Non renseignée'}</span>
              <span className="text-[11px] text-slate-500">
                {currentMember?.cinIssuedDate
                  ? `Délivrée le ${currentMember.cinIssuedDate}${currentMember.cinIssuedLocation ? ` à ${currentMember.cinIssuedLocation}` : ''}`
                  : 'Date de délivrance non renseignée'}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Contact d'Urgence</span>
              <span className="text-xs font-bold text-[#0F172A] mt-0.5">{currentMember?.emergencyContactName || 'Non renseigné'}</span>
              <span className="font-mono-data text-xs text-slate-500">{currentMember?.emergencyContactPhone || '—'}</span>
            </div>

            <div className="sm:col-span-3 flex flex-col pt-2 border-t border-[#E2E8F0]">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Adresse Domicile</span>
              <span className="text-xs text-[#0F172A] mt-0.5 flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">home_pin</span>
                {currentMember?.address}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Financial Health & Balance Module (4 cols) */}
        <div className="xl:col-span-4 bg-[#0F172A] text-white rounded-xl p-5 shadow-sm border border-slate-800 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-[#06B6D4]/10 blur-2xl pointer-events-none"></div>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Solde &amp; Trésorerie Client</span>
              <span className="font-headline text-base font-bold text-white">Position Comptable</span>
            </div>
            {currentMember?.currentBalanceAr === 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[#10B981] font-mono-data text-[10px] font-bold border border-emerald-500/40">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>À JOUR
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-mono-data text-[10px] font-bold border border-red-500/40">
                <span className="material-symbols-outlined text-[14px]">warning</span>EN RETARD
              </span>
            )}
          </div>

          <div className="my-4 relative z-10">
            <div className="flex items-baseline gap-1.5">
              <span className={`font-headline text-3xl font-bold ${currentMember?.currentBalanceAr < 0 ? 'text-red-400' : 'text-white'}`}>
                {formatAr(currentMember?.currentBalanceAr || 0)}
              </span>
              <span className="font-mono-data text-lg text-slate-400 font-bold">Ar</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {currentMember?.currentBalanceAr === 0
                ? 'Aucun impayé constaté. Facturation et abonnements sains.'
                : 'Paiement en retard. Échéance dépassée sur l\'abonnement.'}
            </p>
          </div>

          {/* Quick telemetry metrics */}
          <div className="space-y-2 pt-3 border-t border-slate-800 relative z-10 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1 text-[11px]">
                <span className="material-symbols-outlined text-[15px] text-[#06B6D4]">history_toggle_off</span>
                Dernier passage
              </span>
              <span className="font-mono-data text-[11px] text-slate-200">15/05/2024 à 07:42 (P1)</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1 text-[11px]">
                <span className="material-symbols-outlined text-[15px] text-[#10B981]">verified_user</span>
                Registre incidents
              </span>
              <span className="font-mono-data text-[11px] text-[#10B981] font-semibold">0 incident</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1 text-[11px]">
                <span className="material-symbols-outlined text-[15px] text-slate-400">support_agent</span>
                Opérateur référent
              </span>
              <span className="font-mono-data text-[11px] text-slate-300">Poste Analakely #OP-04</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Folder Tabs Container */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden flex flex-col">
        {/* Tab Navigation */}
        <div className="flex items-center overflow-x-auto bg-[#F8FAFC] px-4 pt-2 gap-2 border-b border-[#E2E8F0]">
          {[
            { id: 'vehicules', label: 'Véhicules enregistrés', count: memberVehicles.length, icon: 'directions_car' },
            { id: 'abonnements', label: 'Abonnements & Tarifs en cours', count: memberSubs.length, icon: 'calendar_month' },
            { id: 'historique', label: 'Historique Paiements & Reçus', count: memberReceipts.length, icon: 'receipt_long' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              type="button"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-headline text-xs transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-[#0F172A] font-bold border-t-2 border-t-[#06B6D4] shadow-sm'
                  : 'text-slate-500 hover:text-[#0F172A] hover:bg-white/60'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="bg-slate-200 text-[#0F172A] font-mono-data text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="p-6">
          {/* TAB 1: Véhicules enregistrés */}
          {activeTab === 'vehicules' && (
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h3 className="font-headline text-base font-bold text-[#0F172A]">Flotte Privée Rattachée</h3>
                  <p className="text-xs text-slate-500">
                    Les véhicules ci-dessous sont autorisés au franchissement automatisé des barrières de péage.
                  </p>
                  {/* Business Rule Banner */}
                  <div className="mt-3 p-3 rounded-lg bg-[#E0F2FE] border-l-4 border-[#06B6D4] text-xs text-[#0F172A] flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[#06B6D4] text-[20px] mt-0.5 shrink-0">info</span>
                    <div>
                      <strong className="font-bold text-[#0F172A]">Règle d'attribution des emplacements :</strong> L'intérieur du parking fonctionne en{' '}
                      <span className="font-bold text-[#0284C7]">Placement Libre Intérieur</span> (sans place attitrée fixe, tarif standard 120 000 Ar/mois - Place non privative en zone intérieure partagée). La formule{' '}
                      <span className="font-bold text-[#D97706]">Emplacement Privatif Dédié</span> est réservée exclusivement aux stationnements hors enceinte / sur voirie dédiée (Tarif Privatif Extérieur : 180 000 Ar/mois).
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid of Vehicles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                {memberVehicles.map((veh) => (
                  <div key={veh.id} className="bg-[#F8FAFC] rounded-xl p-5 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded font-label-md text-xs uppercase bg-white text-[#0F172A] font-bold border border-[#E2E8F0]">
                          <span className="material-symbols-outlined text-[16px]">
                            {veh.category.includes('Deux-Roues') ? 'two_wheeler' : 'directions_car'}
                          </span>
                          {veh.category}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono-data text-xs text-[#16A34A] bg-emerald-100 px-2 py-0.5 rounded font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>ACTIF
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        {veh.photoUrl ? (
                          <img
                            src={veh.photoUrl}
                            data-zoom="true"
                            alt={veh.model}
                            className="w-24 h-16 rounded-lg object-cover shadow-sm border border-[#E2E8F0]"
                          />
                        ) : (
                          <div className="w-24 h-16 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500">
                            <span className="material-symbols-outlined text-3xl">directions_car</span>
                          </div>
                        )}
                        <div className="flex flex-col flex-1">
                          <h4 className="font-headline text-base font-bold text-[#0F172A]">{veh.brand} {veh.model}</h4>
                          <span className="text-xs text-slate-500">{veh.color}</span>
                        </div>
                        {/* Malagasy License Plate Display */}
                        <div className="bg-white px-3 py-1.5 rounded shadow-sm text-center border-l-4 border-[#0F172A]">
                          <span className="font-mono-plate text-sm tracking-widest text-[#0F172A] font-bold block">
                            {veh.licensePlate}
                          </span>
                          <div className="text-[9px] font-mono-data text-slate-400 leading-none uppercase mt-0.5">
                            MDG • TANA
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4 bg-white p-3 rounded-lg border border-[#E2E8F0]">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Type d'Emplacement</span>
                          <span className="font-headline text-xs font-bold text-[#0284C7] mt-0.5">
                            {veh.category.includes('Deux-Roues') ? 'Place Fixe C-08' : 'Placement Libre Intérieur'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {veh.category.includes('Deux-Roues') ? 'Zone Moto Clôturée' : 'Sans place attitrée fixe'}
                          </span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Formule Tarifaire</span>
                          <span className="font-mono-metric text-xs font-bold text-[#16A34A] mt-0.5">
                            {veh.category.includes('Deux-Roues') ? '40 000 Ar' : '120 000 Ar'}
                          </span>
                          <span className="text-[10px] text-slate-500">Abonnement Mensuel</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#E2E8F0]">
                      <span className="font-mono-data text-xs text-slate-500 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">sensors</span>
                        Télécommande RFID : <strong className="text-[#0F172A]">{veh.rfidTag}</strong>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => notifyNotAvailable(`Historique des passages de ${veh.licensePlate}`)}
                          type="button"
                          className="p-1 rounded text-[#06B6D4] hover:bg-slate-200"
                          title="Historique des passages"
                        >
                          <span className="material-symbols-outlined text-[18px]">history</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Abonnements & Tarifs en cours */}
          {activeTab === 'abonnements' && (() => {
            const today = todayInTana();
            const currentKey = monthKey(today.year, today.monthIndex);
            const todayStart = Date.UTC(today.year, today.monthIndex, today.day);
            const daysUntil = (d: string) => {
              const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(d || '');
              return m ? Math.round((Date.UTC(+m[3], +m[2] - 1, +m[1]) - todayStart) / 86_400_000) : null;
            };
            const rows = memberSubs.map((sub) => {
              // Same computed state as the dashboard and the alerts
              const h = subscriptionHealth(sub, receipts, today);
              const state: 'a_jour' | 'proche' | 'retard' | 'expire' =
                h.state === 'expire' ? 'expire' : h.state === 'en_retard' ? 'retard' : h.state === 'proche_echeance' ? 'proche' : 'a_jour';
              return { sub, unpaid: h.unpaid, arrearsAr: h.arrearsAr, state, days: daysUntil(sub.nextDueDate) };
            });
            const activeTotal = rows.filter((r) => r.state !== 'expire').reduce((sum, r) => sum + r.sub.monthlyAmountAr, 0);
            const STATE_BADGE = {
              a_jour: { label: 'À JOUR', cls: 'bg-emerald-100 text-[#16A34A]' },
              proche: { label: 'ÉCHÉANCE PROCHE', cls: 'bg-amber-100 text-amber-700' },
              retard: { label: 'RETARD', cls: 'bg-red-100 text-red-600' },
              expire: { label: 'EXPIRÉ', cls: 'bg-slate-100 text-slate-500' }
            };
            const CELL: Record<MonthState, string> = {
              paye: 'bg-emerald-500 text-white border-emerald-500',
              partiel: 'bg-amber-400 text-[#0F172A] border-amber-400',
              impaye: 'bg-red-50 text-red-700 border-red-300',
              a_venir: 'bg-white text-slate-400 border-[#E2E8F0]',
              hors_contrat: 'bg-slate-100 text-slate-300 border-slate-100'
            };
            const collect = (r: (typeof rows)[number]) =>
              onOpenNewPayment({
                memberId: r.sub.memberId,
                plate: r.sub.vehiclePlate,
                formula: formulaForTariff(r.sub.tariffType),
                monthlyAmountAr: r.sub.monthlyAmountAr,
                // Unpaid months first; otherwise the payment window proposes the next ones
                months: r.unpaid.slice(0, 12)
              });

            return (
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-headline text-base font-bold text-[#0F172A]">Contrats d'abonnement</h3>
                  <p className="text-xs text-slate-500">Échéances et règlements calculés à partir des reçus enregistrés.</p>
                </div>
                <div className="flex items-center gap-2 font-mono-data text-xs bg-[#F8FAFC] px-3 py-2 rounded-lg border border-[#E2E8F0]">
                  <span className="text-slate-500">Engagement mensuel :</span>
                  <strong className="text-[#0F172A] font-bold">{formatAr(activeTotal)} Ar / mois</strong>
                </div>
              </div>

              {rows.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8 border border-dashed border-[#CBD5E1] rounded-xl">
                  Aucun abonnement pour ce membre.
                </p>
              ) : (
              <>
              <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-slate-500 font-semibold uppercase tracking-wider border-b border-[#E2E8F0]">
                      <th className="py-2.5 px-4">Contrat</th>
                      <th className="py-2.5 px-4">Véhicule &amp; formule</th>
                      <th className="py-2.5 px-4">Période payée</th>
                      <th className="py-2.5 px-4">Prochaine échéance</th>
                      <th className="py-2.5 px-4 text-right">Tarif mensuel</th>
                      <th className="py-2.5 px-4 text-center">État</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {rows.map((r) => (
                      <tr key={r.sub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono-data font-bold text-[#0F172A]">{r.sub.contractRef}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#0F172A]">{r.sub.vehicleModel} ({r.sub.vehiclePlate})</div>
                          <div className="text-[#0284C7] text-[11px]">{r.sub.tariffType}</div>
                        </td>
                        <td className="py-3 px-4 font-mono-data text-slate-600">{r.sub.startDate} – {r.sub.endDate}</td>
                        <td className="py-3 px-4 font-mono-data text-[#0F172A]">
                          <strong>{r.sub.nextDueDate}</strong>
                          {r.days !== null && r.state !== 'expire' && (
                            <span className={`block text-[10px] ${r.days < 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                              {r.days < 0 ? `dépassée de ${-r.days} jour${-r.days > 1 ? 's' : ''}` : r.days === 0 ? 'aujourd’hui' : `dans ${r.days} jour${r.days > 1 ? 's' : ''}`}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono-data font-bold text-[#0F172A]">{formatAr(r.sub.monthlyAmountAr)} Ar</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono-data text-[10px] font-bold ${STATE_BADGE[r.state].cls}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {STATE_BADGE[r.state].label}
                          </span>
                          {r.state === 'retard' && (
                            <span className="block text-[10px] text-red-600 mt-0.5">
                              {r.unpaid.length ? `${r.unpaid.length} mois impayé${r.unpaid.length > 1 ? 's' : ''} · ` : 'Paiement partiel · '}
                              {formatAr(r.arrearsAr)} Ar
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {r.state !== 'expire' && (
                            <button
                              onClick={() => collect(r)}
                              type="button"
                              title={
                                r.unpaid.length
                                  ? `Encaisser les mois impayés : ${r.unpaid.slice(0, 12).map(monthLabel).join(', ')}`
                                  : 'Encaisser les mois suivants de cet abonnement'
                              }
                              className="text-[#06B6D4] font-semibold hover:underline whitespace-nowrap"
                            >
                              {r.unpaid.length ? 'Régler les impayés' : 'Payer les mois suivants'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Annual calendar: paid / unpaid months */}
              <div className="rounded-xl border border-[#E2E8F0] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="font-headline text-sm font-bold text-[#0F172A] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">calendar_month</span>
                    Calendrier des paiements
                  </h4>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setCalendarYear((y) => y - 1)} className="p-1 rounded hover:bg-slate-100" aria-label="Année précédente">
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <span className="font-mono-data text-sm font-bold text-[#0F172A] w-12 text-center">{calendarYear}</span>
                    <button type="button" onClick={() => setCalendarYear((y) => y + 1)} className="p-1 rounded hover:bg-slate-100" aria-label="Année suivante">
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                    {calendarYear !== today.year && (
                      <button type="button" onClick={() => setCalendarYear(today.year)} className="ml-1 text-[11px] text-[#06B6D4] font-semibold hover:underline">
                        Cette année
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-separate border-spacing-1">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="text-left font-semibold pr-2">Véhicule</th>
                        {MONTH_SHORT.map((m, i) => (
                          <th key={m} className={`font-semibold text-center ${monthKey(calendarYear, i) === currentKey ? 'text-[#06B6D4]' : ''}`}>{m}</th>
                        ))}
                        <th className="text-right font-semibold pl-2">Payés</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const cal = yearCalendar(r.sub, receipts, calendarYear, currentKey);
                        const paidCount = cal.filter((c) => c.state === 'paye').length;
                        return (
                          <tr key={r.sub.id}>
                            <td className="pr-2 whitespace-nowrap">
                              <span className="font-mono-plate font-bold text-[#0F172A]">{r.sub.vehiclePlate}</span>
                              <span className="block text-[10px] text-slate-400">{r.sub.tariffType}</span>
                            </td>
                            {cal.map((c) => (
                              <td key={c.key}>
                                <div
                                  title={`${monthLabel(c.key)} : ${MONTH_STATE_LABELS[c.state]}`}
                                  className={`h-8 min-w-[2.25rem] rounded-md border flex items-center justify-center font-bold ${CELL[c.state]} ${
                                    c.key === currentKey ? 'ring-2 ring-[#06B6D4] ring-offset-1' : ''
                                  }`}
                                >
                                  {c.state === 'paye' ? '✓' : c.state === 'partiel' ? '½' : c.state === 'impaye' ? '✗' : ''}
                                </div>
                              </td>
                            ))}
                            <td className="pl-2 text-right font-mono-data text-slate-600 whitespace-nowrap">{paidCount} / 12</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
                  {(Object.keys(MONTH_STATE_LABELS) as MonthState[]).map((st) => (
                    <span key={st} className="flex items-center gap-1.5">
                      <span className={`w-3.5 h-3.5 rounded border ${CELL[st]}`}></span>
                      {MONTH_STATE_LABELS[st]}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  Un mois est « payé » quand un reçu confirmé du membre pour ce véhicule le couvre. Les mois sont dus à partir du début du contrat
                  {rows.some((r) => dateToMonthKey(r.sub.startDate)) ? '' : ' (date de début inconnue)'}, jamais avant {monthLabel(BILLING_START_KEY).toLowerCase()},
                  jusqu’au mois en cours.
                </p>
              </div>
              </>
              )}
            </div>
            );
          })()}

          {/* TAB 3: Historique Paiements & Reçus */}
          {activeTab === 'historique' && (
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-headline text-base font-bold text-[#0F172A]">Journal des Encaissements</h3>
                  <p className="text-xs text-slate-500">Registre d'audit officiel avec références de transaction.</p>
                </div>
                <button
                  onClick={() => window.print()}
                  type="button"
                  className="bg-[#F8FAFC] text-[#0F172A] font-medium text-xs px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-100 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Exporter Relevé Fiscal</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-slate-500 font-semibold uppercase tracking-wider border-b border-[#E2E8F0]">
                      <th className="py-2.5 px-4">N° Reçu</th>
                      <th className="py-2.5 px-4">Date &amp; Heure</th>
                      <th className="py-2.5 px-4">Objet du Paiement</th>
                      <th className="py-2.5 px-4">Mode Règlement</th>
                      <th className="py-2.5 px-4">Agent Caisse</th>
                      <th className="py-2.5 px-4 text-right">Montant</th>
                      <th className="py-2.5 px-4 text-right">Justificatif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {memberReceipts.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono-data font-bold text-[#0F172A]">{rec.receiptNumber}</td>
                        <td className="py-3 px-4 font-mono-data text-slate-600">{rec.dateTime}</td>
                        <td className="py-3 px-4 font-medium text-[#0F172A]">{rec.purpose}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-[#0F172A] font-mono-data text-[10px] font-semibold border border-slate-200">
                            {rec.paymentMethod} • {rec.transactionRef}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{rec.cashierName}</td>
                        <td className="py-3 px-4 text-right font-mono-data font-bold text-[#0F172A]">
                          {formatAr(rec.amountPaidAr)} Ar
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onSelectReceipt(rec)}
                            type="button"
                            className="inline-flex items-center gap-1 text-[#06B6D4] hover:underline font-semibold"
                          >
                            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                            Reçu PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
      </>)}

      {/* Modal: Nouveau Membre */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#06B6D4] text-[22px]">person_add</span>
                <h3 className="font-headline text-lg font-bold text-[#0F172A]">Nouveau Membre / Propriétaire</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                type="button"
                className="text-slate-400 hover:text-[#0F172A]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Photo du membre</label>
                <PhotoInput value={formPhoto} onChange={setFormPhoto} fileNameHint={formName || 'nouveau-membre'} />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nom et prénoms *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: RAZAFY Nirina Haja"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#06B6D4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Numéro CIN</label>
                  <input
                    type="text"
                    placeholder="101 XXX XXX XXX"
                    value={formCin}
                    onChange={(e) => setFormCin(e.target.value)}
                    className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] font-mono-data"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Téléphone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+261 34 XX XXX XX"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] font-mono-data"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Mobile Money</label>
                  <select value={formMobileMoney} onChange={(e) => setFormMobileMoney(e.target.value)} className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <option value="">— Aucun —</option>
                    <option value="MVola">MVola</option>
                    <option value="Orange Money">Orange Money</option>
                    <option value="Airtel Money">Airtel Money</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Contact d’urgence</label>
                  <input type="text" maxLength={150} placeholder="Nom" value={formEmergencyName} onChange={(e) => setFormEmergencyName(e.target.value)} className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tél. contact d’urgence</label>
                  <input type="text" maxLength={30} placeholder="+261 …" value={formEmergencyPhone} onChange={(e) => setFormEmergencyPhone(e.target.value)} className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] font-mono-data" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Adresse Domicile</label>
                <input
                  type="text"
                  placeholder="Lot ... Antananarivo"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Catégorie</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                  >
                    <option value="standard">Standard</option>
                    <option value="privilege">Privilège</option>
                    <option value="resident">Résident</option>
                    <option value="corporate">Entreprise / B2B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Site de Rattachement</label>
                  <select
                    value={formSiteId}
                    onChange={(e) => {
                      const next = e.target.value;
                      // Follow the new site's president unless the field was typed by hand
                      if (!formPresident.trim() || formPresident === sitePresident(formSiteId)) {
                        setFormPresident(sitePresident(next));
                      }
                      setFormSiteId(next);
                    }}
                    className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <fieldset className="border border-[#E2E8F0] rounded-lg p-3 space-y-3">
                <legend className="px-1 text-[11px] font-semibold text-[#0F172A] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">directions_car</span>
                  Véhicule du membre *
                </legend>
                <p className="text-[10px] text-slate-400 -mt-1">Seuls les propriétaires d’un véhicule sont membres.</p>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Photo du véhicule</label>
                  <PhotoInput
                    value={formVehPhoto}
                    onChange={setFormVehPhoto}
                    fileNameHint={`vehicule_${formPlate || 'nouveau'}`}
                    facingMode="environment"
                    emptyIcon="directions_car"
                    maxSize={800}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Immatriculation *</label>
                    <input
                      type="text"
                      required
                      placeholder="ex : 1234 TBA"
                      value={formPlate}
                      onChange={(e) => setFormPlate(e.target.value)}
                      className={`w-full p-2.5 bg-[#F8FAFC] rounded-lg border font-mono-plate uppercase ${plateExists(formPlate) ? 'border-rose-400' : 'border-[#E2E8F0]'}`}
                    />
                    {plateExists(formPlate) && <p className="text-[10px] text-rose-600 mt-1">Immatriculation déjà enregistrée.</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Catégorie *</label>
                    <select
                      value={formVehCategory}
                      onChange={(e) => setFormVehCategory(e.target.value as VehicleCategory)}
                      className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                    >
                      {VEHICLE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Marque *</label>
                    <input type="text" required placeholder="ex : Toyota" value={formBrand} onChange={(e) => setFormBrand(e.target.value)} className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Modèle *</label>
                    <input type="text" required placeholder="ex : Hilux" value={formModel} onChange={(e) => setFormModel(e.target.value)} className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Couleur</label>
                    <input type="text" placeholder="ex : Gris métallisé" value={formColor} onChange={(e) => setFormColor(e.target.value)} className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]" />
                  </div>
                </div>
              </fieldset>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Adhésion acceptée par *</label>
                <select
                  required
                  value={formPresident}
                  onChange={(e) => setFormPresident(e.target.value)}
                  className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                >
                  <option value="">— Choisir le président —</option>
                  {presidentOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Le président du site choisi est proposé par défaut.</p>
                {sitesWithoutPresident.length > 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    Sans président : {sitesWithoutPresident.map((s) => s.name).join(', ')}. À renseigner dans Sites.
                  </p>
                )}
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
                  className="px-5 py-2 rounded-lg bg-[#06B6D4] text-[#0F172A] font-headline font-bold hover:bg-[#0891B2] hover:text-white transition-colors"
                >
                  Enregistrer Membre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
