import React, { useState } from 'react';
import { AppState, AuditLogItem } from '../types';
import { 
  Shield, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  User, 
  Building2, 
  Activity, 
  Terminal,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { ResetDataPanel } from './ResetDataPanel';
import { BrandingPanel } from './BrandingPanel';

interface AuditLogsViewProps {
  state: AppState;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ state }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const failedLogins = state.auditLogs.filter((l: AuditLogItem) => l.action === 'CONNEXION_ECHOUEE').length;

  const modules: string[] = Array.from(new Set(state.auditLogs.map((l: AuditLogItem) => l.module)));

  const filteredLogs = state.auditLogs.filter((log: AuditLogItem) => {
    if (moduleFilter !== 'all' && log.module !== moduleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.siteCode.toLowerCase().includes(q) ||
        log.ipAddress.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['ID', 'Horodatage', 'Utilisateur', 'Action', 'Site', 'Module', 'Détails', 'IP'];
    const rows = filteredLogs.map((l: AuditLogItem) => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.userName}"`,
      `"${l.action}"`,
      `"${l.siteCode}"`,
      `"${l.module}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      l.ipAddress
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `journal_audit_parking_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);

    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Shield className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-xl sm:text-2xl font-bold font-title">Journal d'Audit & Traçabilité Sûreté</h1>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Actions enregistrées par le serveur : connexions, encaissements, dépenses, paie, créations, modifications et suppressions
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm flex items-center gap-2 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          Exporter CSV
        </button>
      </div>

      <BrandingPanel />

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Événements Journalisés</p>
            <h3 className="text-xl font-black font-title text-slate-900 mt-1">{state.auditLogs.length}</h3>
          </div>
          <Activity className="w-5 h-5 text-cyan-600" />
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Opérateurs Actifs</p>
            <h3 className="text-xl font-black font-title text-slate-900 mt-1">
              {new Set(state.auditLogs.map((l: AuditLogItem) => l.userName)).size}
            </h3>
          </div>
          <User className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Connexions échouées</p>
            <h3 className={`text-xl font-black font-title mt-1 ${failedLogins > 0 ? 'text-[#DC2626]' : 'text-emerald-600'}`}>{failedLogins}</h3>
          </div>
          <CheckCircle2 className={`w-5 h-5 ${failedLogins > 0 ? 'text-[#DC2626]' : 'text-emerald-600'}`} />
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher action, utilisateur, IP, mot-clé..."
            className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">Tous les modules ({modules.length})</option>
            {modules.map((m: string) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3 px-4">Horodatage</th>
                <th className="py-3 px-4">Utilisateur / Auteur</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Site</th>
                <th className="py-3 px-4">Détails de l'Opération</th>
                <th className="py-3 px-4">Adresse IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                    Aucun enregistrement d'audit ne correspond à vos critères.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: AuditLogItem) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-cyan-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900 whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="py-3 px-4 font-bold text-cyan-700 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-slate-100 text-slate-700">
                        {log.module}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {log.siteCode}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-700 max-w-md truncate">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ResetDataPanel state={state} onExportAudit={handleExportCSV} />

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold font-title text-slate-900 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-600" />
                Détail de l'Événement d'Audit
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">ID Événement :</span>
                  <span className="text-slate-800 font-bold">{selectedLog.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Horodatage GMT+3 :</span>
                  <span className="text-slate-800">{selectedLog.timestamp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Auteur :</span>
                  <span className="text-cyan-700 font-bold">{selectedLog.userName} ({selectedLog.userId})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Action :</span>
                  <span className="text-emerald-700 font-bold">{selectedLog.action}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Module / Périmètre :</span>
                  <span className="text-slate-700">{selectedLog.module}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Site :</span>
                  <span className="text-slate-700">{selectedLog.siteCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Adresse IP cliente :</span>
                  <span className="text-slate-700">{selectedLog.ipAddress}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Payload & Détails complets
                </span>
                <p className="p-3 bg-white border border-slate-200 rounded-xl text-slate-800 leading-relaxed font-sans text-xs">
                  {selectedLog.details}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
