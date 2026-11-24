import React, { useState } from 'react';
import { useBranding } from '../services/branding';
import { printMeetingPv } from '../services/documents';
import { can } from '../services/access';
import { formatEntryTime } from '../services/spots';
import { addMonthsFr } from '../services/cards';
import { initialsAvatar } from '../services/avatar';
import { EntityActions } from './EntityActions';
import { PhotoInput } from './PhotoInput';
import { AppState, CommitteeMember, GovernanceMeeting } from '../types';
import { addCommitteeMember, addMeeting, updateProfileAvatar } from '../services/storage';
import { 
  Users, 
  FileText, 
  Calendar, 
  Award, 
  ShieldCheck, 
  Plus, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Download,
  Building2,
  Phone
} from 'lucide-react';

interface GovernanceViewProps {
  state: AppState;
}

export const GovernanceView: React.FC<GovernanceViewProps> = ({ state }) => {
  const [activeTab, setActiveTab] = useState<'membres' | 'reunions' | 'statuts'>('membres');
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<GovernanceMeeting | null>(state.meetings[0] || null);
  const brand = useBranding();

  // Photo modal
  const [photoModalTarget, setPhotoModalTarget] = useState<{ id: string; name: string; currentPhoto: string } | null>(null);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');


  // New member form
  const [newRole, setNewRole] = useState<CommitteeMember['role']>('President Site');
  const [newFullName, setNewFullName] = useState('');
  const [newSiteId, setNewSiteId] = useState(state.sites[0]?.id || '');
  const [newPhone, setNewPhone] = useState('+261 34 ');
  const [newEmail, setNewEmail] = useState('');
  /** Photo imported from the PC or taken with the camera (none = initials) */
  const [newPhoto, setNewPhoto] = useState<string | undefined>(undefined);
  const [newIndemnity, setNewIndemnity] = useState(450000);
  // Mandate: from today, 3 years by default
  const [newMandateStart, setNewMandateStart] = useState(() => formatEntryTime().slice(0, 10));
  const [newMandateEnd, setNewMandateEnd] = useState(() => addMonthsFr(formatEntryTime().slice(0, 10), 36));

  // New meeting form
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDate, setNewMeetingDate] = useState(() => formatEntryTime().slice(0, 10));
  const [newMeetingLocation, setNewMeetingLocation] = useState('');
  const [newMeetingAgenda, setNewMeetingAgenda] = useState('');
  const [newMeetingPV, setNewMeetingPV] = useState('');
  const [newResolutionsCount, setNewResolutionsCount] = useState(3);

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName) return;
    addCommitteeMember({
      role: newRole,
      fullName: newFullName,
      siteId: newRole.includes('Site') ? newSiteId : undefined,
      phone: newPhone,
      email: newEmail || undefined,
      avatarUrl: newPhoto,
      monthlyIndemnityAr: Number(newIndemnity) || 450000,
      mandateStart: newMandateStart,
      mandateEnd: newMandateEnd,
      status: 'actif'
    });
    setNewFullName('');
    setNewPhoto(undefined);
    setShowMemberModal(false);
  };

  const handleSavePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoModalTarget || !customPhotoUrl.trim()) return;
    updateProfileAvatar('committee', photoModalTarget.id, customPhotoUrl.trim());
    setCustomPhotoUrl('');
    setPhotoModalTarget(null);
  };

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingTitle || !newMeetingPV) return;
    addMeeting({
      title: newMeetingTitle,
      date: newMeetingDate,
      location: newMeetingLocation,
      agenda: newMeetingAgenda,
      summaryPV: newMeetingPV,
      resolutionsCount: Number(newResolutionsCount) || 1
    });
    setNewMeetingTitle('');
    setNewMeetingAgenda('');
    setNewMeetingPV('');
    setShowMeetingModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Users className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-xl sm:text-2xl font-bold font-title">Comité de Gestion & Gouvernance</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Mandat 2023 - 2025
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Organisation statutaire collégiale multi-sites, délibérations officielles et registre des procès-verbaux
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {can('governance') && (
            <button
              onClick={() => setShowMeetingModal(true)}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm flex items-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4 text-cyan-400" />
              Consigner un PV
            </button>
          )}
          {can('governance') && (
            <button
              onClick={() => setShowMemberModal(true)}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouveau Dirigeant
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-4 sm:gap-8 overflow-x-auto [&>button]:shrink-0 [&>button]:whitespace-nowrap">
        <button
          onClick={() => setActiveTab('membres')}
          className={`pb-4 px-2 font-medium text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'membres'
              ? 'border-cyan-500 text-cyan-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          Membres du Bureau ({state.committeeMembers.length})
        </button>
        <button
          onClick={() => setActiveTab('reunions')}
          className={`pb-4 px-2 font-medium text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'reunions'
              ? 'border-cyan-500 text-cyan-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Assemblées Générales & PVs ({state.meetings.length})
        </button>
        <button
          onClick={() => setActiveTab('statuts')}
          className={`pb-4 px-2 font-medium text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'statuts'
              ? 'border-cyan-500 text-cyan-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Règlement Intérieur & Statuts
        </button>
      </div>

      {/* Tab: Members */}
      {activeTab === 'membres' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.committeeMembers.map((member: CommitteeMember) => {
            const site = member.siteId ? state.sites.find((s: any) => s.id === member.siteId) : null;
            return (
              <div 
                key={member.id} 
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />
                
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* PHOTO DE PROFIL DIRIGEANT */}
                    <div className="relative group/avatar">
                      <img
                        src={member.avatarUrl || initialsAvatar(member.fullName)}
                        data-zoom={member.avatarUrl ? 'true' : undefined}
                        alt={member.fullName}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 shadow-sm"
                      />
                      <button
                        onClick={() => setPhotoModalTarget({ id: member.id, name: member.fullName, currentPhoto: member.avatarUrl || '' })}
                        className="absolute inset-0 bg-black/60 text-white rounded-2xl opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-[10px] font-bold transition-opacity"
                      >
                        Changer
                      </button>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{member.fullName}</h3>
                      <div className="my-1"><EntityActions compact collection="committee" record={member} label={member.fullName} /></div>
                      <p className="text-xs font-semibold text-cyan-600 uppercase tracking-wide">
                        {member.role}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    member.status === 'actif' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {member.status === 'actif' ? 'En exercice' : 'Honoraire'}
                  </span>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100 text-sm">
                  {site && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" /> Affectation
                      </span>
                      <span className="font-medium text-slate-800 text-xs">{site.name}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> Contact officiel
                    </span>
                    <span className="font-mono text-slate-800 text-xs">{member.phone}</span>
                  </div>

                  {member.monthlyIndemnityAr && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-500" /> Indemnité mensuelle
                      </span>
                      <span className="font-mono font-bold text-emerald-700 text-xs">
                        {member.monthlyIndemnityAr.toLocaleString('fr-FR')} Ar/mois
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Durée du mandat
                    </span>
                    <span className="font-medium text-slate-700 text-xs">
                      {member.mandateStart} au {member.mandateEnd}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setPhotoModalTarget({ id: member.id, name: member.fullName, currentPhoto: member.avatarUrl || '' })}
                    className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold"
                  >
                    Modifier Photo
                  </button>
                  <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Assermenté
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* Tab: Meetings & PVs */}
      {activeTab === 'reunions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Historique des Sessions & Délibérations
            </h2>
            {state.meetings.map((meeting: GovernanceMeeting) => (
              <div
                key={meeting.id}
                onClick={() => setSelectedMeeting(meeting)}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  selectedMeeting?.id === meeting.id
                    ? 'border-cyan-500 bg-cyan-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex justify-end -mt-1 -mr-1"><EntityActions compact collection="meetings" record={meeting} label={meeting.title} /></div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono text-cyan-600 font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {meeting.date}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">
                    {meeting.resolutionsCount} résolutions
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm line-clamp-2">
                  {meeting.title}
                </h4>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1 truncate">
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                  {meeting.location}
                </p>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selectedMeeting ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
                <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600 font-mono">
                        Procès-Verbal Officiel
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs font-mono text-slate-500">{selectedMeeting.date}</span>
                    </div>
                    <h2 className="text-xl font-bold font-title text-slate-900">
                      {selectedMeeting.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      Lieu de séance : {selectedMeeting.location}
                    </p>
                  </div>
                  <button 
                    onClick={() => printMeetingPv(selectedMeeting, brand)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Imprimer PV
                  </button>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Ordre du Jour
                  </h4>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm">
                    {selectedMeeting.agenda}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Synthèse des Délibérations & Résolutions Adoptées
                  </h4>
                  <div className="p-4 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm leading-relaxed space-y-3">
                    <p>{selectedMeeting.summaryPV}</p>
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-emerald-900">
                        <span className="font-bold">Décision exécutoire : </span>
                        Toutes les résolutions votées lors de cette session sont répertoriées dans le registre central et transmises aux Trésoriers et Présidents de site respectifs pour application immédiate.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Signé par le Président Général et le Secrétaire Général de séance
                  </div>
                  <span className="font-mono">Réf: PV-{selectedMeeting.id.toUpperCase()}</span>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                Sélectionnez une réunion pour consulter le procès-verbal.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Statutes */}
      {activeTab === 'statuts' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold font-title text-slate-900">
                Statuts et Règlement Intérieur de l'Organisation des Parkings
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Version consolidée et enregistrée auprès de la Commune Urbaine d'Antananarivo (CUA)
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
              En vigueur 2024
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-600" />
                Article 1 : Principe du Placement Libre Intérieur
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Le stationnement dans l'enceinte intérieure couverte ou sécurisée des sites s'effectue strictement selon le mode du <strong className="text-slate-900">Placement Libre Intérieur</strong> (tarif forfaitaire de 120 000 Ar/mois). Aucune place numérotée ne peut être privatisée à l'intérieur, afin de garantir l'optimisation maximale des flux et la rotation continue.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-600" />
                Article 2 : Emplacements Privatifs Dédiés sur Voirie
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Les <strong className="text-slate-900">Emplacements Privatifs Dédiés</strong> sont expressément réservés aux zones de voirie extérieures balisées et numérotées (tarif réglementé de 180 000 Ar/mois). Un arceau rabattable ou panneau nominatif est attribué au titulaire de l'abonnement.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-600" />
                Article 3 : Obligations de la Carte PVC et Badge RFID
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tout véhicule adhérent doit présenter la carte PVC officielle format ISO CR80 (NTAG216) lors de son franchissement de barrière. Tout badge prêté à un tiers non enregistré entraîne la suspension immédiate de l'abonnement pour une durée de 30 jours.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-600" />
                Article 4 : Gestion des Recettes & Clôture de Caisse
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Chaque opérateur de caisse et gardien assermenté doit obligatoirement éditer un reçu officiel numéroté pour tout paiement en espèces ou Mobile Money (MVola/Orange Money). La caisse physique est clôturée quotidiennement et auditée par le Trésorier de site.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Committee Member */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold font-title text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-600" />
                Nommer un Dirigeant du Comité
              </h3>
              <button
                onClick={() => setShowMemberModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom et Prénoms
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="ex: Randriamampianina Luc"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fonction Statutaire
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="President General">Président Général</option>
                    <option value="Vice President">Vice-Président</option>
                    <option value="President Site">Président de Site</option>
                    <option value="Tresorier General">Trésorier Général</option>
                    <option value="Tresorier Site">Trésorier de Site</option>
                    <option value="Secretaire General">Secrétaire Général</option>
                    <option value="Controleur de Gestion">Contrôleur de Gestion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Site d'affectation
                  </label>
                  <select
                    value={newSiteId}
                    onChange={(e) => setNewSiteId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-cyan-500"
                  >
                    {state.sites.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Téléphone Flotte Officiel
                </label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1">Photo officielle</span>
                <PhotoInput value={newPhoto} onChange={setNewPhoto} fileNameHint={newFullName || 'dirigeant'} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Début Mandat
                  </label>
                  <input
                    type="text"
                    value={newMandateStart}
                    onChange={(e) => setNewMandateStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fin Mandat
                  </label>
                  <input
                    type="text"
                    value={newMandateEnd}
                    onChange={(e) => setNewMandateEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-md"
                >
                  Enregistrer Nomination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Meeting PV */}
      {showMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold font-title text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-600" />
                Consigner un Procès-Verbal de Réunion
              </h3>
              <button
                onClick={() => setShowMeetingModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intitulé de la Réunion ou Session
                </label>
                <input
                  type="text"
                  required
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                  placeholder="ex: Assemblée Générale Ordinaire T2 2024"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date de Séance (JJ/MM/AAAA)
                  </label>
                  <input
                    type="text"
                    required
                    value={newMeetingDate}
                    onChange={(e) => setNewMeetingDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre de Résolutions
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newResolutionsCount}
                    onChange={(e) => setNewResolutionsCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lieu de Réunion
                </label>
                <input
                  type="text"
                  required
                  value={newMeetingLocation}
                  onChange={(e) => setNewMeetingLocation(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ordre du Jour
                </label>
                <textarea
                  rows={2}
                  value={newMeetingAgenda}
                  onChange={(e) => setNewMeetingAgenda(e.target.value)}
                  placeholder="Points statutaires abordés lors de la séance..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Synthèse des Délibérations & Résolutions (PV officiel)
                </label>
                <textarea
                  rows={4}
                  required
                  value={newMeetingPV}
                  onChange={(e) => setNewMeetingPV(e.target.value)}
                  placeholder="Texte officiel certifié des décisions prises..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMeetingModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-md"
                >
                  Valider et Publier PV
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Modifier Photo Dirigeant */}
      {photoModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-600 text-[20px]">photo_camera</span>
                <h3 className="text-base font-bold font-title text-slate-900">
                  Photo de profil : {photoModalTarget.name}
                </h3>
              </div>
              <button onClick={() => { setPhotoModalTarget(null); setCustomPhotoUrl(''); }} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <div className="flex items-center justify-center py-2">
              <img
                src={customPhotoUrl || photoModalTarget.currentPhoto || initialsAvatar(photoModalTarget.name)}
                alt="Aperçu"
                className="w-24 h-24 rounded-2xl object-cover border-2 border-cyan-500 shadow-md"
              />
            </div>

            <form onSubmit={handleSavePhoto} className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1">
                  Depuis le PC ou l'appareil photo :
                </span>
                <PhotoInput
                  value={customPhotoUrl.startsWith('data:') ? customPhotoUrl : undefined}
                  onChange={(v) => setCustomPhotoUrl(v || '')}
                  fileNameHint={photoModalTarget.name}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Ou coller l'adresse (URL) d'une photo :
                </label>
                <input
                  type="url"
                  value={customPhotoUrl.startsWith('data:') ? '' : customPhotoUrl}
                  onChange={(e) => setCustomPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setPhotoModalTarget(null); setCustomPhotoUrl(''); }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!customPhotoUrl.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enregistrer Photo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
