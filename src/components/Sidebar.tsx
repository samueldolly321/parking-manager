import React from 'react';
import { APP_INFO } from '../content/legal';

export type NavPath =
  | 'tableau-de-bord'
  | 'sites-et-zones'
  | 'emplacements-et-occupation'
  | 'vehicules'
  | 'membres-et-proprietaires'
  | 'cartes-de-membres'
  | 'abonnements-et-tarifs'
  | 'encaissements-et-recus'
  | 'tresorerie-et-caisses'
  | 'paie-et-salaires'
  | 'personnel-et-gardiens'
  | 'comite-de-gestion'
  | 'materiels-et-equipements'
  | 'incidents-et-registre'
  | 'rapports-et-statistiques'
  | 'utilisateurs-et-roles'
  | 'parametres-et-audit'
  | 'informations-et-cgu';

interface SidebarProps {
  currentPath: NavPath;
  onNavigate: (path: NavPath) => void;
  sitesCount: number;
  /** Small screens only: the menu is a drawer, shown when open */
  open?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate, open = false, onClose }) => {
  const navSections = [
    {
      title: 'VUE GÉNÉRALE',
      items: [
        { path: 'tableau-de-bord' as NavPath, label: 'Tableau de bord', icon: 'dashboard' },
        { path: 'sites-et-zones' as NavPath, label: 'Sites & Zones', icon: 'domain' }
      ]
    },
    {
      title: 'GESTION OPÉRATIONNELLE',
      items: [
        { path: 'emplacements-et-occupation' as NavPath, label: 'Emplacements & Occupation', icon: 'local_parking' },
        { path: 'vehicules' as NavPath, label: 'Véhicules', icon: 'directions_car' },
        { path: 'membres-et-proprietaires' as NavPath, label: 'Membres & Propriétaires', icon: 'group' },
        { path: 'cartes-de-membres' as NavPath, label: 'Cartes de membres', icon: 'badge' },
        { path: 'abonnements-et-tarifs' as NavPath, label: 'Abonnements & Tarifs', icon: 'sell' }
      ]
    },
    {
      title: 'FINANCES & TRÉSORERIE',
      items: [
        { path: 'encaissements-et-recus' as NavPath, label: 'Encaissements & Reçus', icon: 'receipt_long' },
        { path: 'tresorerie-et-caisses' as NavPath, label: 'Trésorerie & Caisses', icon: 'account_balance_wallet' },
        { path: 'paie-et-salaires' as NavPath, label: 'Paie & Rémunérations', icon: 'request_quote' }
      ]
    },
    {
      title: 'SÉCURITÉ & RESSOURCES',
      items: [
        { path: 'personnel-et-gardiens' as NavPath, label: 'Personnel & Gardiens', icon: 'security' },
        { path: 'comite-de-gestion' as NavPath, label: 'Comité de Gestion', icon: 'military_tech' },
        { path: 'materiels-et-equipements' as NavPath, label: 'Matériels & Équipements', icon: 'build' },
        { path: 'incidents-et-registre' as NavPath, label: 'Incidents & Registre', icon: 'warning' }
      ]
    },
    {
      title: 'PILOTAGE & SYSTÈME',
      items: [
        { path: 'rapports-et-statistiques' as NavPath, label: 'Rapports & Statistiques', icon: 'analytics' },
        { path: 'utilisateurs-et-roles' as NavPath, label: 'Utilisateurs & Rôles', icon: 'manage_accounts' },
        { path: 'parametres-et-audit' as NavPath, label: 'Paramètres & Audit', icon: 'settings' },
        { path: 'informations-et-cgu' as NavPath, label: 'Informations & CGU', icon: 'info' }
      ]
    }
  ];

  return (
    <>
    {/* Backdrop behind the drawer (small screens) */}
    {open && (
      <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden="true" />
    )}
    <aside
      className={`fixed left-0 top-0 h-screen w-72 max-w-[85vw] bg-[#131B2E] text-white flex flex-col z-50 shadow-[0_1px_8px_rgba(0,0,0,0.08)] select-none transition-transform duration-200 lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-label="Menu principal"
    >
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between gap-2 border-b border-white/10 bg-[#0F172A]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#06B6D4] to-[#0EA5E9] flex items-center justify-center text-white shadow-md font-bold text-lg">
            <span className="material-symbols-outlined text-[22px]">local_parking</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline text-base font-bold text-white tracking-tight leading-tight">
              Parking Mada
            </span>
            <span className="font-mono-data text-[10px] text-[#06B6D4] uppercase tracking-wider font-semibold">
              GESTION CENTRALE
            </span>
          </div>
        </div>
        <span className="hidden lg:inline font-mono-data text-[10px] px-2 py-0.5 rounded bg-white/10 text-[#06B6D4] uppercase tracking-wider font-semibold border border-[#06B6D4]/30">
          PROD TANA
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le menu"
          className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>
      </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 scrollbar-thin scrollbar-thumb-white/10">
        <nav className="space-y-4">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-2 font-mono-data text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = currentPath === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => onNavigate(item.path)}
                      type="button"
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-xs font-medium ${
                        isActive
                          ? 'bg-[#06B6D4] text-[#0F172A] font-bold shadow-md shadow-[#06B6D4]/20'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-[#0F172A]' : 'text-slate-400'}`}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Postgres & Node status */}
      <div className="p-3 bg-[#0B1322] border-t border-white/10 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span className="font-mono-data text-xs text-[#06B6D4] font-medium">PostgreSQL 16 OK</span>
          </div>
          <span className="font-mono-data text-[10px] text-slate-400">v{APP_INFO.version}</span>
        </div>
        <div className="font-mono-data text-[10px] text-slate-400 truncate flex items-center justify-between">
          <span>Antananarivo Central DC</span>
          <span className="text-emerald-400">GMT+3</span>
        </div>
      </div>
    </aside>
    </>
  );
};
