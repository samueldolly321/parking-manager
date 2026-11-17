import React, { useState } from 'react';
import { Member, Vehicle, Subscription, PaymentReceipt, MembershipCard, Site } from '../types';
import { PhotoInput, Avatar } from './PhotoInput';
import { EntityActions } from './EntityActions';

const MEMBER_EDIT_FIELDS = [
  'avatarUrl', 'fullName', 'phone', 'cin', 'cinIssuedDate', 'cinIssuedLocation', 'address', 'category',
  'primarySiteId', 'status', 'mobileMoneyProvider', 'emergencyContactName', 'emergencyContactPhone',
  'currentBalanceAr', 'joinedDate', 'notes'
];

interface MembersViewProps {
  members: Member[];
  vehicles: Vehicle[];
  subscriptions: Subscription[];
  receipts: PaymentReceipt[];
  cards: MembershipCard[];
  sites: Site[];
  selectedSiteId: string;
  onAddMember: (memberData: Partial<Member>) => string;
  onOpenNewPayment: () => void;
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
  selectedSiteId,
  onAddMember,
  onOpenNewPayment,
  onSelectReceipt,
  onToggleCardBlock,
  startWithList = false,
  initialSelectedId
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'detail'>(startWithList && !initialSelectedId ? 'list' : 'detail');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(initialSelectedId || members[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'vehicules' | 'abonnements' | 'historique' | 'cartes' | 'documents'>('vehicules');
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
  const memberCards = cards.filter(c => c.memberId === currentMember?.id);

  const formatAr = (val: number) => {
    return new Intl.NumberFormat('fr-MG').format(val).replace(/,/g, ' ');
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    const newMemberId = onAddMember({
      fullName: formName,
      cin: formCin || '101 000 000 000',
      phone: formPhone,
      address: formAddress || 'Antananarivo',
      category: formCategory,
      primarySiteId: formSiteId,
      avatarUrl: formPhoto
    });

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
                onClick={() => setShowAddModal(true)}
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
                      <td className="px-3 py-2"><Avatar src={m.avatarUrl} name={m.fullName} /></td>
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
            {currentMember && <Avatar src={currentMember.avatarUrl} name={currentMember.fullName} size={48} />}
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
            onClick={() => setActiveTab('cartes')}
            type="button"
            className="bg-white text-[#0F172A] font-medium text-xs px-3.5 py-2 rounded-lg border border-[#E2E8F0] shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">badge</span>
            <span>Imprimer carte PVC</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            type="button"
            className="bg-white text-[#0F172A] font-headline text-xs font-bold px-3.5 py-2 rounded-lg border border-[#E2E8F0] shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">person_add</span>
            <span>+ Nouveau Membre</span>
          </button>

          <button
            onClick={onOpenNewPayment}
            type="button"
            className="bg-[#0F172A] text-white font-headline text-xs font-bold px-4 py-2 rounded-lg shadow-md hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">payments</span>
            <span>+ Enregistrer paiement</span>
          </button>
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
                  src={currentMember?.avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAKowTqWDIHUyYNTyslG-6YQsTUPvDPEGovwESfsCzIEw-prEikTVwX31_yTJu1sBqNn6xWfgtdzRzuNvP4uZceNey04m2Z6Kg9yYYwQT0uvELsTUq1S7s4HhkI3C76yh1EYtVs-ZEaeOLbOnhOHgkwImdcQBDLajp6c99RGxOJLmAr6lTjXPcVxhS-2wzOxsMwFrsdDfWzNiI5i-7niEJSL9bExTCix6Wu9zo4h1I'}
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
                </div>
              </div>
            </div>

            <div className="bg-[#F8FAFC] px-3 py-2 rounded-lg flex items-center gap-2 border border-[#E2E8F0]">
              <span className="material-symbols-outlined text-[#06B6D4] text-[20px]">location_on</span>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Site Principal</span>
                <span className="text-xs font-bold text-[#0F172A]">
                  {sites.find(s => s.id === currentMember?.primarySiteId)?.name || 'Analakely Central'}
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
                {currentMember?.mobileMoneyProvider || 'MVola'} Associé
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Carte d'Identité Nationale (CIN)</span>
              <span className="font-mono-data text-xs font-bold text-[#0F172A] mt-0.5">{currentMember?.cin}</span>
              <span className="text-[11px] text-slate-500">Délivrée le {currentMember?.cinIssuedDate || '14/03/2012'}</span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Contact d'Urgence</span>
              <span className="text-xs font-bold text-[#0F172A] mt-0.5">{currentMember?.emergencyContactName || 'Épouse'}</span>
              <span className="font-mono-data text-xs text-slate-500">{currentMember?.emergencyContactPhone || '+261 32 98 765 43'}</span>
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
            { id: 'cartes', label: 'Cartes de Membre', count: memberCards.length, icon: 'credit_card' },
            { id: 'documents', label: 'Pièces Justificatives', count: 3, icon: 'folder_open' }
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
                          onClick={() => alert(`Historique des passages de ${veh.licensePlate} : 42 passages ce mois.`)}
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
          {activeTab === 'abonnements' && (
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-headline text-base font-bold text-[#0F172A]">Contrats d'Abonnement Actifs</h3>
                  <p className="text-xs text-slate-500">Périodicité de renouvellement et statut de règlement.</p>
                </div>
                <div className="flex items-center gap-2 font-mono-data text-xs bg-[#F8FAFC] px-3 py-2 rounded-lg border border-[#E2E8F0]">
                  <span className="text-slate-500">Engagement Total Mensuel :</span>
                  <strong className="text-[#0F172A] font-bold">160 000 Ar / mois</strong>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-slate-500 font-semibold uppercase tracking-wider border-b border-[#E2E8F0]">
                      <th className="py-2.5 px-4">Contrat Réf.</th>
                      <th className="py-2.5 px-4">Véhicule &amp; Emplacement</th>
                      <th className="py-2.5 px-4">Période en cours</th>
                      <th className="py-2.5 px-4">Prochaine Échéance</th>
                      <th className="py-2.5 px-4 text-right">Tarif Mensuel</th>
                      <th className="py-2.5 px-4 text-center">État</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {memberSubs.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono-data font-bold text-[#0F172A]">{sub.contractRef}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#0F172A]">{sub.vehicleModel} ({sub.vehiclePlate})</div>
                          <div className="text-[#0284C7] text-[11px]">{sub.tariffType}</div>
                        </td>
                        <td className="py-3 px-4 font-mono-data text-slate-600">{sub.startDate} - {sub.endDate}</td>
                        <td className="py-3 px-4 font-mono-data text-[#0F172A]">
                          <strong>{sub.nextDueDate}</strong>
                          <span className="block text-[10px] text-slate-400">dans {sub.daysRemaining} jours</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono-data font-bold text-[#0F172A]">
                          {formatAr(sub.monthlyAmountAr)} Ar
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono-data text-[10px] font-bold ${
                            sub.status === 'a_jour' ? 'bg-emerald-100 text-[#16A34A]' : 'bg-red-100 text-red-600'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {sub.status === 'a_jour' ? 'À JOUR' : 'RETARD'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={onOpenNewPayment}
                            type="button"
                            className="text-[#06B6D4] font-semibold hover:underline"
                          >
                            Renouveler
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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

          {/* TAB 4: Cartes de Membre */}
          {activeTab === 'cartes' && (
            <div className="flex flex-col space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-headline text-base font-bold text-[#0F172A]">Support Physique &amp; Accès RFID</h3>
                  <p className="text-xs text-slate-500">
                    Aperçu de la carte plastique sécurisée et des droits d'accès aux bornes de péage.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (memberCards[0]) {
                        onToggleCardBlock(memberCards[0].id);
                      }
                    }}
                    type="button"
                    className="bg-red-50 text-red-700 hover:bg-red-100 font-headline text-xs font-bold px-3 py-2 rounded-lg border border-red-200 flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">block</span>
                    <span>{memberCards[0]?.status === 'bloquee_perdue' ? 'Débloquer Carte' : 'Déclarer perte / Bloquer'}</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    type="button"
                    className="bg-[#0F172A] text-white font-headline text-xs font-bold px-3.5 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">print</span>
                    <span>Imprimer carte</span>
                  </button>
                </div>
              </div>

              {/* Physical CR80 Card Specimen Recto & Verso */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                {/* RECTO */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono-data text-xs text-slate-500 uppercase font-semibold">Face Recto (Badge Opérationnel)</span>
                  <div className="w-full aspect-[85.6/53.98] rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A1120] text-white p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden border border-slate-700 select-none">
                    {/* Madagascar Micro Flag & Header */}
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center text-[#06B6D4] border border-[#06B6D4]/40">
                          <span className="material-symbols-outlined text-[18px]">local_parking</span>
                        </div>
                        <div>
                          <div className="font-headline text-xs font-bold tracking-wider uppercase text-white leading-tight">Parking Mada</div>
                          <div className="font-mono-data text-[8px] text-[#06B6D4] uppercase">Réseau Central • Analakely</div>
                        </div>
                      </div>

                      {/* Madagascar Flag */}
                      <div className="w-6 h-4 rounded-sm overflow-hidden flex shadow-sm border border-white/20">
                        <div className="w-1/3 bg-white h-full"></div>
                        <div className="w-2/3 h-full flex flex-col">
                          <div className="h-1/2 bg-[#FC3D32]"></div>
                          <div className="h-1/2 bg-[#007E3A]"></div>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Photo + Smart Chip + Member Name */}
                    <div className="flex items-center gap-4 relative z-10 my-auto">
                      <div className="relative w-14 h-18 rounded-lg overflow-hidden border-2 border-cyan-400 shadow-md shrink-0">
                        <img
                          src={currentMember?.avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAKowTqWDIHUyYNTyslG-6YQsTUPvDPEGovwESfsCzIEw-prEikTVwX31_yTJu1sBqNn6xWfgtdzRzuNvP4uZceNey04m2Z6Kg9yYYwQT0uvELsTUq1S7s4HhkI3C76yh1EYtVs-ZEaeOLbOnhOHgkwImdcQBDLajp6c99RGxOJLmAr6lTjXPcVxhS-2wzOxsMwFrsdDfWzNiI5i-7niEJSL9bExTCix6Wu9zo4h1I'}
                          alt={currentMember?.fullName}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Gold Contactless Chip Simulation */}
                      <div className="w-9 h-7 rounded bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-[1.5px] shadow-sm flex flex-col justify-between overflow-hidden shrink-0">
                        <div className="flex justify-between h-2 border-b border-amber-800/40">
                          <div className="w-2 border-r border-amber-800/40"></div>
                          <div className="w-2 border-l border-amber-800/40"></div>
                        </div>
                        <div className="h-1.5 flex items-center justify-center">
                          <div className="w-3 h-1 rounded-full border border-amber-800/40"></div>
                        </div>
                        <div className="flex justify-between h-2 border-t border-amber-800/40">
                          <div className="w-2 border-r border-amber-800/40"></div>
                          <div className="w-2 border-l border-amber-800/40"></div>
                        </div>
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-mono-data text-cyan-400 uppercase tracking-widest font-semibold">
                          Titulaire Privilège
                        </span>
                        <span className="font-headline text-sm font-bold text-white truncate leading-tight">
                          {currentMember?.fullName}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono-plate text-[10px] text-cyan-200 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 font-bold">
                            {memberVehicles[0]?.licensePlate || '6543 TBD'}
                          </span>
                          <span className="font-mono-data text-[10px] text-slate-400">
                            {currentMember?.memberNumber}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="flex items-end justify-between relative z-10 border-t border-slate-700/60 pt-2">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-mono-data uppercase text-slate-400">Identifiant Unique</span>
                        <span className="font-mono-data text-xs text-white font-bold tracking-wider">
                          {memberCards[0]?.cardNumber || 'CRD-9981-ANL'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col text-right">
                          <span className="text-[8px] font-mono-data uppercase text-slate-400">Validité</span>
                          <span className="font-mono-data text-xs text-amber-400 font-bold">12/2024</span>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 p-[1px] flex items-center justify-center shadow">
                          <div className="w-full h-full rounded-full bg-slate-900/60 flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-[14px]">verified_user</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* VERSO */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono-data text-xs text-slate-500 uppercase font-semibold">Face Verso (Contrôle &amp; Chiffrement)</span>
                  <div className="w-full aspect-[85.6/53.98] rounded-2xl bg-slate-900 text-slate-100 p-5 flex flex-col justify-between shadow-2xl relative border border-slate-700 select-none overflow-hidden">
                    {/* Magnetic Stripe */}
                    <div className="-mx-5 -mt-5 h-9 bg-black flex items-center px-4 justify-between border-b border-slate-800">
                      <span className="font-mono-data text-[7px] text-slate-500 tracking-widest">
                        ISO 7811 HI-CO 4000 OE MAGNETIC TRACK 1 &amp; 2
                      </span>
                      <span className="w-2 h-2 rounded-full bg-cyan-500/50"></span>
                    </div>

                    <div className="grid grid-cols-12 gap-3 items-center my-auto">
                      <div className="col-span-4 flex flex-col items-center bg-white p-2 rounded-lg shadow shrink-0">
                        {/* High Contrast QR Code for scanning */}
                        <svg className="w-18 h-18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="5" y="5" width="26" height="26" rx="2" fill="#0F172A" />
                          <rect x="9" y="9" width="18" height="18" fill="white" />
                          <rect x="13" y="13" width="10" height="10" fill="#0F172A" />
                          <rect x="69" y="5" width="26" height="26" rx="2" fill="#0F172A" />
                          <rect x="73" y="9" width="18" height="18" fill="white" />
                          <rect x="77" y="13" width="10" height="10" fill="#0F172A" />
                          <rect x="5" y="69" width="26" height="26" rx="2" fill="#0F172A" />
                          <rect x="9" y="73" width="18" height="18" fill="white" />
                          <rect x="13" y="77" width="10" height="10" fill="#0F172A" />
                          <rect x="36" y="8" width="5" height="5" fill="#0F172A" />
                          <rect x="44" y="8" width="5" height="10" fill="#0F172A" />
                          <rect x="36" y="24" width="10" height="5" fill="#0F172A" />
                          <rect x="54" y="24" width="7" height="7" fill="#0F172A" />
                          <rect x="36" y="36" width="14" height="14" rx="1" fill="#0F172A" />
                          <rect x="40" y="40" width="6" height="6" fill="white" />
                          <rect x="58" y="38" width="8" height="5" fill="#0F172A" />
                          <rect x="72" y="38" width="12" height="6" fill="#0F172A" />
                          <rect x="38" y="82" width="10" height="6" fill="#0F172A" />
                          <rect x="54" y="84" width="6" height="6" fill="#0F172A" />
                          <rect x="70" y="82" width="18" height="8" fill="#0F172A" />
                        </svg>
                        <span className="font-mono-data text-[7px] text-slate-600 mt-1 uppercase">
                          TOKEN: e8f9-4b12
                        </span>
                      </div>

                      <div className="col-span-8 flex flex-col justify-between space-y-1.5 pl-1">
                        <p className="text-[8px] leading-[11px] text-slate-300 text-justify font-sans">
                          Cette carte est strictement personnelle et demeure la propriété de Parking Manager Madagascar.
                          En cas de perte, aviser immédiatement le poste de sécurité d'Analakely au{' '}
                          <strong className="text-white">+261 34 12 345 67</strong>.
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          <div className="flex flex-col">
                            <span className="text-[7px] font-mono-data text-slate-400 uppercase">Signature Titulaire</span>
                            <div className="h-6 bg-slate-100 rounded flex items-center px-2">
                              <span className="italic text-[10px] text-slate-800 font-serif">A. Ramanantsoa</span>
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[7px] font-mono-data text-slate-400 uppercase">Visa Direction</span>
                            <div className="h-6 bg-slate-100 rounded flex items-center justify-between px-2">
                              <span className="font-mono-data text-[8px] text-slate-700 font-bold">PMM-OK</span>
                              <span className="material-symbols-outlined text-[13px] text-[#06B6D4]">verified</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Barcode */}
                    <div className="flex flex-col items-center border-t border-slate-700/60 pt-1">
                      <span className="font-mono-data text-[8px] text-cyan-300 tracking-widest">
                        * {currentMember?.memberNumber}-TANA *
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Pièces Justificatives */}
          {activeTab === 'documents' && (
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-headline text-base font-bold text-[#0F172A]">Dossier Numérique &amp; Conformité</h3>
                  <p className="text-xs text-slate-500">Pièces numérisées légalisées et assurances de stationnement.</p>
                </div>
                <button
                  onClick={() => alert('Sélectionnez un fichier PDF ou JPG à joindre au dossier du membre.')}
                  type="button"
                  className="bg-[#F8FAFC] text-[#0F172A] font-headline text-xs font-bold px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-100 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">upload_file</span>
                  <span>Téléverser Document</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Doc 1 */}
                <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#06B6D4] text-[32px]">badge</span>
                    <div className="flex flex-col min-w-0">
                      <h4 className="font-headline text-xs font-bold text-[#0F172A] truncate">Copie CIN Légalisée</h4>
                      <span className="font-mono-data text-[11px] text-slate-500">CIN_Ramanantsoa_2023.pdf</span>
                      <span className="text-[10px] text-slate-400 mt-1">1.4 Mo • Validé</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#E2E8F0]">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono-data text-[#16A34A] bg-emerald-100 px-2 py-0.5 rounded font-bold">
                      CONFORME
                    </span>
                    <button
                      onClick={() => alert('Consultation de la copie CIN légalisée en préfecture.')}
                      type="button"
                      className="text-xs text-[#06B6D4] font-medium hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      Consulter
                    </button>
                  </div>
                </div>

                {/* Doc 2 */}
                <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#06B6D4] text-[32px]">directions_car</span>
                    <div className="flex flex-col min-w-0">
                      <h4 className="font-headline text-xs font-bold text-[#0F172A] truncate">Cartes Grises (Rav4 &amp; PCX)</h4>
                      <span className="font-mono-data text-[11px] text-slate-500">CartesGrises_TBD_TBH.pdf</span>
                      <span className="text-[10px] text-slate-400 mt-1">2.8 Mo • Validé</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#E2E8F0]">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono-data text-[#16A34A] bg-emerald-100 px-2 py-0.5 rounded font-bold">
                      CONFORME
                    </span>
                    <button
                      onClick={() => alert('Consultation des cartes grises du parc automobile rattaché.')}
                      type="button"
                      className="text-xs text-[#06B6D4] font-medium hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      Consulter
                    </button>
                  </div>
                </div>

                {/* Doc 3 */}
                <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#06B6D4] text-[32px]">description</span>
                    <div className="flex flex-col min-w-0">
                      <h4 className="font-headline text-xs font-bold text-[#0F172A] truncate">Contrat Adhésion Signé</h4>
                      <span className="font-mono-data text-[11px] text-slate-500">Reglement_Signe_MBR0089.pdf</span>
                      <span className="text-[10px] text-slate-400 mt-1">890 Ko • Signé le 12/01/23</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#E2E8F0]">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono-data text-slate-600 bg-slate-200 px-2 py-0.5 rounded font-bold">
                      ARCHIVÉ
                    </span>
                    <button
                      onClick={() => alert('Consultation du règlement intérieur et contrat signé.')}
                      type="button"
                      className="text-xs text-[#06B6D4] font-medium hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      Consulter
                    </button>
                  </div>
                </div>
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
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Numéro CIN (12 chiffres)</label>
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
                    onChange={(e) => setFormSiteId(e.target.value)}
                    className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                  >
                    <option value="S1">Site 01 - Analakely Central</option>
                    <option value="S2">Site 02 - Ankorondrano Business</option>
                    <option value="S3">Site 03 - Ivato Aéroport Hub</option>
                  </select>
                </div>
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
