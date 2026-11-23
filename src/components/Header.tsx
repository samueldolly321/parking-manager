import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Site, User, USER_ROLES } from '../types';
import { userSite } from '../services/permissions';
import { DashboardAlert, formatLongDate, todayInTana } from '../services/dashboardMetrics';
import { globalSearch, KIND_LABEL, SearchResult, SearchTarget } from '../services/globalSearch';

interface HeaderProps {
  sites: Site[];
  selectedSiteId: string;
  onSelectSite: (siteId: string) => void;
  currentUser: User;
  onOpenNewPayment: () => void;
  onGlobalSearch: (term: string) => void;
  searchTerm: string;
  /** Data the global search looks into */
  searchState: AppState;
  /** Opens the page of a search result */
  onOpenSearchResult: (target: SearchTarget) => void;
  /** Opens the side menu (small screens) */
  onOpenMenu: () => void;
  /** Opens the "Mon compte" window (email / password) */
  onOpenAccount: () => void;
  onLogout: () => void;
  /** Alerts computed from the data (subscriptions, incidents, pending expenses). */
  alerts: DashboardAlert[];
  onNavigate: (path: string) => void;
}

const ALERT_TARGET: Record<DashboardAlert['kind'], string> = {
  echeance: 'abonnements-et-tarifs',
  incident: 'incidents-et-registre',
  depense: 'tresorerie-et-caisses'
};

const alertBoxClass = (a: DashboardAlert) =>
  a.kind === 'incident' && a.urgent
    ? { box: 'bg-red-50 border-red-500', title: 'text-red-900', text: 'text-red-700' }
    : a.kind === 'depense'
      ? { box: 'bg-blue-50 border-blue-500', title: 'text-blue-900', text: 'text-blue-700' }
      : { box: 'bg-amber-50 border-amber-500', title: 'text-amber-900', text: 'text-amber-700' };

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const SHORTCUT_LABEL = isMac ? '⌘K' : 'Ctrl K';

interface SearchBoxProps {
  state: AppState;
  value: string;
  onChange: (v: string) => void;
  onOpen: (target: SearchTarget) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  showShortcut?: boolean;
  onEscape?: () => void;
}

/** Search field with live results (keyboard: ↑ ↓ to move, Enter to open, Esc to close). */
const SearchBox: React.FC<SearchBoxProps> = ({ state, value, onChange, onOpen, inputRef, showShortcut, onEscape }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = useMemo(() => globalSearch(state, value), [state, value]);
  const listId = useRef(`search-results-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => setActive(0), [value]);

  const choose = (r: SearchResult) => {
    onOpen(r.target);
    onChange('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (results[active]) {
        e.preventDefault();
        choose(results[active]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      if (!value) onEscape?.();
      onChange('');
    }
  };

  const showPanel = open && value.trim().length >= 2;

  return (
    <div className="relative w-full">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
        search
      </span>
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showPanel && results[active] ? `${listId}-${active}` : undefined}
        aria-label="Recherche globale"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder="Immatriculation, membre, reçu, carte, dépense…"
        autoComplete="off"
        className={`w-full bg-[#F1F5F9] text-[#0F172A] placeholder:text-slate-400 font-sans text-xs rounded-lg py-2 pl-9 pr-3 ${showShortcut ? 'xl:pr-16' : ''} focus:outline-none focus:ring-2 focus:ring-[#06B6D4] border border-[#E2E8F0] transition-all [&::-webkit-search-cancel-button]:hidden`}
      />
      {showShortcut && !value && (
        <span className="hidden xl:inline absolute right-3 top-1/2 -translate-y-1/2 font-mono-data text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-white border border-[#E2E8F0] pointer-events-none whitespace-nowrap">
          {SHORTCUT_LABEL}
        </span>
      )}
      {value && (
        <button
          type="button"
          aria-label="Effacer la recherche"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-[#E2E8F0] p-1.5 z-50 max-h-[60vh] overflow-y-auto"
        >
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-slate-400">Aucun résultat pour « {value.trim()} »</p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(r)}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2.5 ${i === active ? 'bg-[#06B6D4]/10' : 'hover:bg-slate-50'}`}
              >
                <span className="material-symbols-outlined text-[18px] text-[#06B6D4] shrink-0">{KIND_LABEL[r.kind].icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-[#0F172A] truncate">{r.title}</span>
                  <span className="block text-[11px] text-slate-500 truncate">{r.subtitle}</span>
                </span>
                <span className="shrink-0 font-mono-data text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {KIND_LABEL[r.kind].label}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const Header: React.FC<HeaderProps> = ({
  sites,
  selectedSiteId,
  onSelectSite,
  currentUser,
  onOpenNewPayment,
  onGlobalSearch,
  searchTerm,
  searchState,
  onOpenSearchResult,
  onOpenMenu,
  onOpenAccount,
  onLogout,
  alerts,
  onNavigate
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const today = todayInTana();
  const urgentCount = alerts.filter((a) => a.urgent).length;

  // Ctrl+K / ⌘K focuses the search (opens the search row on small screens)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const desktop = desktopSearchRef.current;
        if (desktop && desktop.offsetParent !== null) {
          desktop.focus();
        } else {
          setMobileSearchOpen(true);
          requestAnimationFrame(() => mobileSearchRef.current?.focus());
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openResult = (target: SearchTarget) => {
    setMobileSearchOpen(false);
    onOpenSearchResult(target);
  };

  const roleLabel = USER_ROLES.find((r) => r.role === currentUser.role)?.label || currentUser.role;
  const lockedSite = userSite(currentUser);
  const lockedSiteName = sites.find((x) => x.id === lockedSite)?.name;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-sm">
      <div className="h-16 px-3 sm:px-4 lg:px-6 flex items-center gap-2 sm:gap-3">
        {/* Menu button (small screens) */}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Ouvrir le menu"
          className="lg:hidden p-1.5 sm:p-2 -ml-1 rounded-lg text-slate-600 hover:bg-[#F1F5F9] shrink-0"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        {/* Site Selector */}
        <div className="relative flex-1 md:flex-none md:w-44 xl:w-60 min-w-0 max-w-60">
          <select
            value={lockedSite || selectedSiteId}
            onChange={(e) => onSelectSite(e.target.value)}
            disabled={!!lockedSite}
            title={lockedSite ? `Votre compte est rattaché au ${lockedSiteName || 'site'}` : undefined}
            aria-label="Sélectionner un site"
            className="w-full truncate bg-[#F1F5F9] text-[#0F172A] font-medium text-xs rounded-lg py-2 pl-2.5 sm:pl-3 pr-7 sm:pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#06B6D4] border border-[#E2E8F0] transition-colors"
          >
            {!lockedSite && <option value="all">Tous les Sites</option>}
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2.5 top-2 text-slate-500 pointer-events-none text-[18px]">
            expand_more
          </span>
        </div>

        {/* Universal Search (medium screens and up) */}
        <div className="hidden md:block flex-1 min-w-[9rem] max-w-xl">
          <SearchBox
            state={searchState}
            value={searchTerm}
            onChange={onGlobalSearch}
            onOpen={openResult}
            inputRef={desktopSearchRef}
            showShortcut
          />
        </div>

        {/* Right: search (small screens), payment, date, alerts, profile */}
        <div className="flex items-center gap-0.5 sm:gap-2 lg:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen((o) => !o);
              requestAnimationFrame(() => mobileSearchRef.current?.focus());
            }}
            aria-label="Rechercher"
            aria-expanded={mobileSearchOpen}
            className="md:hidden p-1.5 sm:p-2 rounded-lg text-slate-500 hover:bg-[#F1F5F9]"
          >
            <span className="material-symbols-outlined text-[20px]">{mobileSearchOpen ? 'close' : 'search'}</span>
          </button>

          <button
            onClick={onOpenNewPayment}
            type="button"
            aria-label="Nouvel encaissement"
            className="bg-[#06B6D4] text-[#0F172A] font-headline text-xs font-bold p-1.5 sm:px-3.5 sm:py-2 rounded-lg hover:bg-[#0891B2] hover:text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span className="hidden sm:inline whitespace-nowrap">
              <span className="xl:hidden">Encaisser</span>
              <span className="hidden xl:inline">Nouvel Encaissement</span>
            </span>
          </button>

          {/* Date Display */}
          <div className="hidden min-[1400px]:flex flex-col text-right whitespace-nowrap">
            <span className="text-xs text-[#0F172A] font-semibold">{formatLongDate(today)}</span>
            <span className="font-mono-data text-[10px] text-slate-500">{today.weekday} (GMT+3)</span>
          </div>

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowRoleMenu(false); }}
              aria-label="Notifications système"
              aria-expanded={showNotifications}
              type="button"
              className="relative p-1.5 sm:p-2 rounded-lg text-slate-500 hover:bg-[#F1F5F9] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {alerts.length > 0 && (
                <span className={`absolute top-1 right-1 w-4 h-4 bg-[#DC2626] text-white font-mono-data text-[9px] font-bold rounded-full flex items-center justify-center ${urgentCount > 0 ? 'animate-pulse' : ''}`}>
                  {alerts.length > 9 ? '9+' : alerts.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] bg-white rounded-xl shadow-xl border border-[#E2E8F0] p-3 space-y-2 z-50 -mr-12 sm:mr-0">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                  <span className="font-headline text-xs font-bold text-[#0F172A]">Alertes Système</span>
                  {urgentCount > 0 && (
                    <span className="font-mono-data text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">
                      {urgentCount} urgente{urgentCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-xs max-h-80 overflow-y-auto">
                  {alerts.length === 0 && (
                    <p className="py-4 text-center text-slate-400">Aucune alerte en cours.</p>
                  )}
                  {alerts.map((a) => {
                    const c = alertBoxClass(a);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => { setShowNotifications(false); onNavigate(ALERT_TARGET[a.kind]); }}
                        className={`w-full text-left p-2 rounded border-l-2 hover:brightness-95 ${c.box}`}
                      >
                        <span className={`font-semibold block truncate ${c.title}`}>{a.title}</span>
                        <span className={`text-[11px] line-clamp-2 ${c.text}`}>{a.detail}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => { setShowRoleMenu(!showRoleMenu); setShowNotifications(false); }}
              type="button"
              aria-label={`Profil : ${currentUser.fullName}`}
              aria-expanded={showRoleMenu}
              className="flex items-center gap-2 pl-1 py-1 rounded-lg hover:bg-[#F1F5F9] transition-colors"
            >
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-[#06B6D4] shrink-0"
                />
              ) : (
                <span className="w-8 h-8 rounded-full bg-[#0F172A] text-white ring-2 ring-[#06B6D4] flex items-center justify-center text-[11px] font-bold shrink-0" aria-hidden="true">
                  {currentUser.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
                </span>
              )}
              <div className="hidden xl:flex flex-col text-left max-w-[150px]">
                <span className="text-xs text-[#0F172A] font-semibold leading-tight truncate">{currentUser.fullName}</span>
                <span className="font-mono-data text-[10px] text-[#06B6D4] font-medium leading-tight truncate">
                  {roleLabel}
                </span>
              </div>
              <span className="hidden sm:inline material-symbols-outlined text-[16px] text-slate-400">arrow_drop_down</span>
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white rounded-xl shadow-xl border border-[#E2E8F0] p-2 space-y-1 z-50">
                <div className="px-3 py-2 border-b border-[#E2E8F0]">
                  <div className="text-xs font-semibold text-[#0F172A] truncate">{currentUser.fullName}</div>
                  <div className="text-[11px] text-[#06B6D4] font-medium">{roleLabel}</div>
                  <div className="text-[10px] text-slate-500">
                    {lockedSite ? `Accès limité au ${lockedSiteName || 'site'}` : 'Accès à tous les sites'}
                  </div>
                </div>
                <div className="pt-1 mt-1 border-t border-[#E2E8F0] space-y-0.5">
                  <button
                    type="button"
                    onClick={() => { setShowRoleMenu(false); onOpenAccount(); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-100 text-slate-700 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">manage_accounts</span>
                    Mon compte (email, mot de passe)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowRoleMenu(false); onLogout(); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-red-50 text-[#DC2626] font-semibold flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Se déconnecter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search row (small screens) */}
      {mobileSearchOpen && (
        <div className="md:hidden px-3 sm:px-4 pb-3">
          <SearchBox
            state={searchState}
            value={searchTerm}
            onChange={onGlobalSearch}
            onOpen={openResult}
            inputRef={mobileSearchRef}
            onEscape={() => setMobileSearchOpen(false)}
          />
        </div>
      )}
    </header>
  );
};
