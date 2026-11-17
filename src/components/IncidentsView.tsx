import React, { useState } from 'react';
import { EntityActions } from './EntityActions';
import { AppState, IncidentRecord } from '../types';
import { addIncident, updateIncidentStatus, updateEntity } from '../services/storage';
import { InvolvedPicker, InvolvedSummary } from './InvolvedPicker';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  Building2, 
  User, 
  Wrench, 
  Ban, 
  CreditCard,
  MessageSquare
} from 'lucide-react';

interface IncidentsViewProps {
  state: AppState;
  /** Text pre-filled in the search field (from the header search) */
  initialSearch?: string;
}

export const IncidentsView: React.FC<IncidentsViewProps> = ({ state, initialSearch }) => {
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  
  const [showModal, setShowModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newSiteId, setNewSiteId] = useState('S1');
  const [newReporter, setNewReporter] = useState(state.currentUser.fullName);
  const [newType, setNewType] = useState<IncidentRecord['type']>('materiel');
  const [newSeverity, setNewSeverity] = useState<IncidentRecord['severity']>('moyen');
  const [newDescription, setNewDescription] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newMemberIds, setNewMemberIds] = useState<string[]>([]);
  const [newVehicleIds, setNewVehicleIds] = useState<string[]>([]);

  const filteredIncidents = state.incidents.filter((inc: IncidentRecord) => {
    if (selectedSiteFilter !== 'all' && inc.siteId !== selectedSiteFilter) return false;
    if (statusFilter !== 'all' && inc.resolutionStatus !== statusFilter) return false;
    if (severityFilter !== 'all' && inc.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inc.ticketCode.toLowerCase().includes(q) ||
        inc.title.toLowerCase().includes(q) ||
        inc.reporterName.toLowerCase().includes(q) ||
        inc.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalIncidents = state.incidents.length;
  const criticalCount = state.incidents.filter((i: IncidentRecord) => i.severity === 'critique' && i.resolutionStatus !== 'resolu').length;
  const inProgressCount = state.incidents.filter((i: IncidentRecord) => i.resolutionStatus === 'en_cours').length;
  const resolvedCount = state.incidents.filter((i: IncidentRecord) => i.resolutionStatus === 'resolu' || i.resolutionStatus === 'classe').length;


  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDescription) return;

    addIncident({
      siteId: newSiteId,
      reporterName: newReporter,
      type: newType,
      severity: newSeverity,
      title: newTitle,
      description: newDescription,
      assignedTo: newAssignedTo || undefined,
      resolutionStatus: 'ouvert',
      memberIds: newMemberIds,
      vehicleIds: newVehicleIds
    });

    setNewTitle('');
    setNewDescription('');
    setNewAssignedTo('');
    setNewMemberIds([]);
    setNewVehicleIds([]);
    setShowModal(false);
  };

  const handleUpdateStatus = (id: string, status: 'ouvert' | 'en_cours' | 'resolu' | 'classe') => {
    updateIncidentStatus(id, status, resolutionNotes || undefined);
    setResolutionNotes('');
    if (selectedIncident && selectedIncident.id === id) {
      setSelectedIncident(prev => prev ? { ...prev, resolutionStatus: status } : null);
    }
  };

  const getSeverityBadge = (sev: IncidentRecord['severity']) => {
    switch (sev) {
      case 'critique':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-300">Critique</span>;
      case 'eleve':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-300">Élevé</span>;
      case 'moyen':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-600 border border-sky-300">Moyen</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Faible</span>;
    }
  };

  const getTypeIcon = (type: IncidentRecord['type']) => {
    switch (type) {
      case 'materiel':
        return <Wrench className="w-4 h-4 text-cyan-600" />;
      case 'stationnement_illicite':
        return <Ban className="w-4 h-4 text-amber-600" />;
      case 'impaye_force':
        return <CreditCard className="w-4 h-4 text-rose-600" />;
      case 'securite':
        return <ShieldAlert className="w-4 h-4 text-purple-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-title">Registre des Incidents & Sûreté</h1>
              {criticalCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white animate-pulse">
                  {criticalCount} Urgence active
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Suivi en temps réel des avaries matérielles, infractions de voirie, pertes de cartes et mains courantes
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Déclarer un Incident
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Signalements</p>
            <h3 className="text-2xl font-black font-title text-slate-900 mt-1">{totalIncidents}</h3>
            <span className="text-xs text-slate-500 mt-0.5 block">Depuis le 01/01/2024</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-rose-600">Pannes Critiques</p>
            <h3 className="text-2xl font-black font-title text-rose-600 mt-1">{criticalCount}</h3>
            <span className="text-xs text-rose-500 mt-0.5 block">Barrières / Détecteurs</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-600">En Cours de Résolution</p>
            <h3 className="text-2xl font-black font-title text-cyan-700 mt-1">{inProgressCount}</h3>
            <span className="text-xs text-slate-500 mt-0.5 block">Techniciens mandatés</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Incidents Clôturés</p>
            <h3 className="text-2xl font-black font-title text-emerald-600 mt-1">{resolvedCount}</h3>
            <span className="text-xs text-emerald-600 mt-0.5 block">Mains courantes signées</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters and search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher code ticket, motif..."
            className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedSiteFilter}
            onChange={(e) => setSelectedSiteFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">Tous les sites</option>
            {state.sites.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">Toutes gravités</option>
            <option value="critique">Critique</option>
            <option value="eleve">Élevé</option>
            <option value="moyen">Moyen</option>
            <option value="faible">Faible</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="ouvert">Ouvert</option>
            <option value="en_cours">En cours</option>
            <option value="resolu">Résolu</option>
            <option value="classe">Classé</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Date / Heure</th>
                <th className="py-3 px-4">Site</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4">Intitulé de l'Incident</th>
                <th className="py-3 px-4">Concernés</th>
                <th className="py-3 px-4">Gravité</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Aucun incident trouvé avec les filtres sélectionnés.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc: IncidentRecord) => {
                  const site = state.sites.find((s: any) => s.id === inc.siteId);
                  return (
                    <tr key={inc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-800">
                        {inc.ticketCode}
                        <div className="mt-1"><EntityActions compact collection="incidents" record={inc} label={`Incident ${inc.ticketCode}`} /></div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                        {inc.date}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                        {site ? site.code : inc.siteId}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 capitalize">
                          {getTypeIcon(inc.type)}
                          <span>{inc.type.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-xs line-clamp-1">{inc.title}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{inc.description}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <InvolvedSummary members={state.members} vehicles={state.vehicles} memberIds={inc.memberIds} vehicleIds={inc.vehicleIds} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getSeverityBadge(inc.severity)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                          inc.resolutionStatus === 'resolu'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : inc.resolutionStatus === 'en_cours'
                            ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                            : inc.resolutionStatus === 'ouvert'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {inc.resolutionStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedIncident(inc)}
                          className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-cyan-700 hover:bg-cyan-50 transition-colors"
                        >
                          Détails / Clôture
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* Incident Detail Drawer / Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-xs text-cyan-600">{selectedIncident.ticketCode}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 font-mono">{selectedIncident.date}</span>
                  <span className="text-slate-300">•</span>
                  {getSeverityBadge(selectedIncident.severity)}
                </div>
                <h3 className="text-lg font-bold font-title text-slate-900">{selectedIncident.title}</h3>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Déclarant :</span>
                  <span className="font-semibold text-slate-800">{selectedIncident.reporterName}</span>
                </div>
                {selectedIncident.assignedTo && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Assigné à / Prestataire :</span>
                    <span className="font-semibold text-cyan-700">{selectedIncident.assignedTo}</span>
                  </div>
                )}
                {selectedIncident.resolvedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Date de résolution certifiée :</span>
                    <span className="font-mono text-emerald-700">{selectedIncident.resolvedAt}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Description des faits</h4>
                <p className="text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed text-xs">
                  {selectedIncident.description}
                </p>
              </div>

              <IncidentInvolvedEditor
                key={selectedIncident.id}
                incident={selectedIncident}
                members={state.members}
                vehicles={state.vehicles}
                onSaved={(memberIds, vehicleIds) =>
                  setSelectedIncident((prev) => (prev ? { ...prev, memberIds, vehicleIds } : prev))
                }
              />

              {selectedIncident.resolutionNotes && (
                <div>
                  <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Rapport de clôture</h4>
                  <p className="text-emerald-900 bg-emerald-50 p-3 rounded-xl border border-emerald-200 leading-relaxed text-xs">
                    {selectedIncident.resolutionNotes}
                  </p>
                </div>
              )}

              {/* Status Update section */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-700">Mettre à jour le statut du dossier</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedIncident.id, 'en_cours')}
                    className="px-3 py-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-800 text-xs font-semibold hover:bg-cyan-100"
                  >
                    Passer en cours
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedIncident.id, 'resolu')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
                  >
                    Valider Résolution
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedIncident.id, 'classe')}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-100"
                  >
                    Classer sans suite
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Note d'intervention ou de clôture
                  </label>
                  <textarea
                    rows={2}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Précisez les pièces changées, la régularisation ou le constat de clôture..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Incident */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold font-title text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Déclarer un Nouvel Incident
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intitulé concis de l'incident
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="ex: Barrière B1 Bloquée / Véhicule stationné hors emplacement"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Site concerné
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Niveau de Gravité
                  </label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="faible">Faible</option>
                    <option value="moyen">Moyen</option>
                    <option value="eleve">Élevé</option>
                    <option value="critique">Critique (Urgence)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="materiel">Panne Matériel Barrière</option>
                    <option value="stationnement_illicite">Stationnement Illicite</option>
                    <option value="impaye_force">Sortie Forcée / Impayé</option>
                    <option value="securite">Perte Carte / Sûreté</option>
                    <option value="autre">Autre Incident</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Déclarant (Gardien / Agent)
                  </label>
                  <input
                    type="text"
                    required
                    value={newReporter}
                    onChange={(e) => setNewReporter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Membres et véhicules concernés
                </label>
                <InvolvedPicker
                  members={state.members}
                  vehicles={state.vehicles}
                  memberIds={newMemberIds}
                  vehicleIds={newVehicleIds}
                  onChange={(m, v) => {
                    setNewMemberIds(m);
                    setNewVehicleIds(v);
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigner à (Technicien / Gardien chef)
                </label>
                <input
                  type="text"
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  placeholder="ex: Socatana SARL / Rasoanaivo Jean"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description détaillée des circonstances
                </label>
                <textarea
                  rows={3}
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Circonstances, numéros de plaque impliqués, impact sur le flux..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md"
                >
                  Ouvrir Ticket Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/** Editable list of members / vehicles involved, shown in the incident detail panel. */
const IncidentInvolvedEditor: React.FC<{
  incident: IncidentRecord;
  members: any[];
  vehicles: any[];
  onSaved: (memberIds: string[], vehicleIds: string[]) => void;
}> = ({ incident, members, vehicles, onSaved }) => {
  const [memberIds, setMemberIds] = useState<string[]>(incident.memberIds || []);
  const [vehicleIds, setVehicleIds] = useState<string[]>(incident.vehicleIds || []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const dirty =
    JSON.stringify(memberIds) !== JSON.stringify(incident.memberIds || []) ||
    JSON.stringify(vehicleIds) !== JSON.stringify(incident.vehicleIds || []);

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      await updateEntity('incidents', incident.id, { memberIds, vehicleIds });
      onSaved(memberIds, vehicleIds);
      setMessage('Enregistré');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Membres &amp; véhicules concernés</h4>
      <InvolvedPicker
        members={members}
        vehicles={vehicles}
        memberIds={memberIds}
        vehicleIds={vehicleIds}
        onChange={(m, v) => {
          setMemberIds(m);
          setVehicleIds(v);
          setMessage('');
        }}
      />
      {(dirty || message) && (
        <div className="flex items-center justify-end gap-2 mt-2">
          {message && <span className="text-[11px] text-slate-500">{message}</span>}
          {dirty && (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-500 disabled:opacity-60"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
