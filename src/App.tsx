/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  AppState, 
  UserRole, 
  PaymentReceipt, 
  Member, 
  Vehicle, 
  ParkingSpot, 
  SpotStatus, 
  ExpenseRecord,
  User
} from './types';
import {
  loadState,
  saveState,
  subscribeToState,
  setSelectedSite,
  setCurrentUser,
  addAuditLog,
  hydrateFromBackend,
  syncApi,
  clearLocalCache
} from './services/storage';
import { LoginView } from './components/LoginView';
import { AccountModal } from './components/AccountModal';

import { Sidebar, NavPath } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { SpotsView } from './components/SpotsView';
import { MembersView } from './components/MembersView';
import { VehiclesView } from './components/VehiclesView';
import { CardsView } from './components/CardsView';
import { GuardsView } from './components/GuardsView';
import { EquipmentView } from './components/EquipmentView';
import { TreasuryView } from './components/TreasuryView';
import { ReceiptsView } from './components/ReceiptsView';
import { GovernanceView } from './components/GovernanceView';
import { IncidentsView } from './components/IncidentsView';
import { PayrollView } from './components/PayrollView';
import { AuditLogsView } from './components/AuditLogsView';
import { ReportsView } from './components/ReportsView';
import { SitesView } from './components/SitesView';
import { InfoView } from './components/InfoView';
import { computeAlerts } from './services/dashboardMetrics';

import { NewPaymentModal } from './components/NewPaymentModal';
import { ReceiptPrintModal } from './components/ReceiptPrintModal';
import { QrScannerModal } from './components/QrScannerModal';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [currentPath, setCurrentPath] = useState<NavPath>('tableau-de-bord');
  const [searchTerm, setSearchTerm] = useState<string>('');
  // What the page opens on when reached from the header search; `nonce` remounts the page
  const [focus, setFocus] = useState<{ selectId?: string; query?: string; nonce: number }>({ nonce: 0 });
  // Sidebar as a drawer on small screens
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /** Opens a page, optionally on a given record or with its search pre-filled. */
  const goTo = (path: NavPath, target?: { selectId?: string; query?: string }) => {
    setCurrentPath(path);
    setFocus((f) => ({ selectId: target?.selectId, query: target?.query, nonce: f.nonce + 1 }));
    setSidebarOpen(false);
  };
  const viewKey = `${currentPath}-${focus.nonce}`;

  // Modals
  const [isNewPaymentOpen, setIsNewPaymentOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);

  // Authentication: nothing is shown before the server has confirmed the session
  const [authStatus, setAuthStatus] = useState<'checking' | 'out' | 'in'>('checking');
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  /** Called once the user is known: loads the data from the server. */
  const enterApp = async (user: User) => {
    setCurrentUser(user);
    await hydrateFromBackend();
    setState(loadState());
    setAuthNotice(null);
    setAuthStatus('in');
  };

  const handleLogout = async () => {
    try { await fetch('/api/v1/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    clearLocalCache();
    setAccountOpen(false);
    setCurrentPath('tableau-de-bord');
    setAuthNotice(null);
    setAuthStatus('out');
  };

  // Subscribe to storage updates, then check the session
  useEffect(() => {
    const unsubscribe = subscribeToState((newState) => {
      setState({ ...newState });
    });
    fetch('/api/v1/auth/me')
      .then(async (res) => (res.ok ? enterApp((await res.json()) as User) : setAuthStatus('out')))
      .catch(() => setAuthStatus('out'));
    return () => unsubscribe();
  }, []);

  // Any API call answered "401" (session expired) sends back to the sign-in page
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await originalFetch(...args);
      const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].href : args[0].url;
      if (res.status === 401 && url.includes('/api/') && !url.includes('/auth/')) {
        clearLocalCache();
        setAuthNotice('Votre session a expiré. Reconnectez-vous pour continuer.');
        setAuthStatus('out');
      }
      return res;
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  // Escape closes the mobile menu (Ctrl+K / ⌘K is handled by the header search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers
  const handleSelectSite = (siteId: string) => {
    setSelectedSite(siteId);
    setState(loadState());
  };

  const handleChangeRole = (role: UserRole) => {
    const updatedUser = { ...state.currentUser, role };
    setCurrentUser(updatedUser);
    setState(loadState());
  };

  const handleOpenNewPayment = () => {
    setIsNewPaymentOpen(true);
  };

  const handleSelectReceipt = (receipt: PaymentReceipt) => {
    setSelectedReceipt(receipt);
  };

  const handlePaymentSubmit = (data: {
    memberId: string;
    memberName: string;
    vehiclePlate?: string;
    siteId: string;
    siteName: string;
    purpose: string;
    period: string;
    amountDueAr: number;
    amountPaidAr: number;
    paymentMethod: any;
    cashierName: string;
  }) => {
    const receiptNum = `REC-2024-${String(state.receipts.length + 513).padStart(4, '0')}`;
    const newReceipt: PaymentReceipt = {
      id: `rec-${Date.now()}`,
      receiptNumber: receiptNum,
      dateTime: new Date().toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' }) + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Indian/Antananarivo' }),
      memberId: data.memberId,
      memberName: data.memberName,
      vehiclePlate: data.vehiclePlate,
      siteId: data.siteId,
      siteName: data.siteName,
      purpose: data.purpose,
      period: data.period,
      amountDueAr: data.amountDueAr,
      amountPaidAr: data.amountPaidAr,
      remainingBalanceAr: Math.max(0, data.amountDueAr - data.amountPaidAr),
      paymentMethod: data.paymentMethod,
      cashierName: data.cashierName,
      transactionRef: `TRX-${Math.floor(10000 + Math.random() * 90000)}-${data.paymentMethod.replace(/\s+/g, '').toUpperCase()}`,
      status: 'confirme'
    };

    // Update state with new receipt
    const nextState = { ...state };
    nextState.receipts = [newReceipt, ...nextState.receipts];

    // Also update member balance if found
    const member = nextState.members.find((m: Member) => m.id === data.memberId);
    if (member) {
      member.currentBalanceAr = 0;
      member.status = 'actif';
    }

    // Update active cash register
    const reg = nextState.cashRegisters.find((r: any) => r.siteId === data.siteId && r.status === 'ouverte');
    if (reg) {
      if (data.paymentMethod === 'Espèces') {
        reg.totalCashCollectedAr += data.amountPaidAr;
        reg.currentCashInHandAr += data.amountPaidAr;
      } else {
        reg.totalMobileMoneyAr += data.amountPaidAr;
      }
    }

    saveState(nextState);
    syncApi('/api/v1/receipts', 'POST', newReceipt);
    addAuditLog('ENCAISSEMENT_ENREGISTRE', 'Finances', `Reçu #${receiptNum} de ${data.amountPaidAr.toLocaleString('fr-FR')} Ar enregistré pour ${data.memberName}`, data.siteId);

    // Launch celebratory confetti
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    setIsNewPaymentOpen(false);
    setSelectedReceipt(newReceipt);
  };

  const handleAddMember = (memberData: any) => {
    const nextState = { ...state };
    const memberCode = `MBR-2024-${String(nextState.members.length + 1).padStart(4, '0')}`;
    const newMember: Member = {
      id: `mbr-${Date.now()}`,
      memberNumber: memberCode,
      fullName: memberData.fullName || 'Nouveau Membre',
      cin: memberData.cin || '101 000 000 000',
      category: memberData.category || 'standard',
      phone: memberData.phone || memberData.primaryPhone || '+261 34 00 000 00',
      address: memberData.address || 'Antananarivo',
      primarySiteId: memberData.primarySiteId || 'S1',
      joinedDate: new Date().toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' }),
      status: 'actif',
      currentBalanceAr: 0,
      notes: memberData.notes,
      avatarUrl: memberData.avatarUrl
    };
    nextState.members = [newMember, ...nextState.members];
    saveState(nextState);
    syncApi('/api/v1/members', 'POST', newMember);
    addAuditLog('ADHESION_MEMBRE', 'Membres', `Nouveau membre ${newMember.fullName} (${memberCode}) enregistré`);
    return newMember.id;
  };

  const handleAddVehicle = (vehData: any) => {
    const nextState = { ...state };
    const newVeh: Vehicle = {
      id: `veh-${Date.now()}`,
      licensePlate: vehData.licensePlate || vehData.plate || '0000 TAA',
      brand: vehData.brand || 'Marque',
      model: vehData.model || 'Modèle',
      color: vehData.color || 'Noir',
      category: vehData.category || 'Voiture Légère (VL)',
      memberId: vehData.memberId || state.members[0]?.id || '',
      siteId: vehData.siteId || 'S1',
      status: 'actif',
      registeredAt: new Date().toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' })
    };
    nextState.vehicles = [newVeh, ...nextState.vehicles];
    saveState(nextState);
    syncApi('/api/v1/vehicles', 'POST', newVeh);
    addAuditLog('AJOUT_VEHICULE', 'Véhicules', `Véhicule ${newVeh.licensePlate} (${newVeh.brand} ${newVeh.model}) assigné au site ${newVeh.siteId}`);
  };

  const handleToggleCardBlock = (cardId: string) => {
    const nextState = { ...state };
    const card = nextState.cards.find((c: any) => c.id === cardId);
    if (card) {
      const isBlocked = card.status === 'bloquee_perdue';
      card.status = isBlocked ? 'actif' : 'bloquee_perdue';
      saveState(nextState);
      syncApi(`/api/v1/cards/${encodeURIComponent(cardId)}/toggle-block`, 'POST');
      addAuditLog(
        isBlocked ? 'DEBLOCAGE_CARTE' : 'MISE_EN_OPPOSITION_CARTE',
        'Cartes Membres',
        `Carte ${card.cardNumber} (${card.memberName}) ${isBlocked ? 'réactivée' : 'mise en opposition'}`
      );
    }
  };

  const handleUpdateSpotStatus = (spotId: string, status: SpotStatus, details?: Partial<ParkingSpot>) => {
    const nextState = { ...state };
    const spot = nextState.spots.find((s: any) => s.id === spotId);
    if (spot) {
      spot.status = status;
      if (details) {
        if (details.currentVehiclePlate !== undefined) spot.currentVehiclePlate = details.currentVehiclePlate;
        if (details.currentDriverName !== undefined) spot.currentDriverName = details.currentDriverName;
        if (details.currentVehicleModel !== undefined) spot.currentVehicleModel = details.currentVehicleModel;
        if (details.entryTime !== undefined) spot.entryTime = details.entryTime;
      }
      if (status === 'libre') {
        spot.currentVehiclePlate = undefined;
        spot.currentDriverName = undefined;
        spot.currentVehicleModel = undefined;
        spot.entryTime = undefined;
      }
      saveState(nextState);
      syncApi(`/api/v1/spots/${encodeURIComponent(spotId)}`, 'PATCH', {
        status: spot.status,
        currentVehiclePlate: spot.currentVehiclePlate ?? null,
        currentDriverName: spot.currentDriverName ?? null,
        currentVehicleModel: spot.currentVehicleModel ?? null,
        entryTime: spot.entryTime ?? null
      });
      addAuditLog('ROTATION_EMPLACEMENT', 'Emplacements', `Emplacement ${spot.code} (${spot.zone}) mis à jour: ${status}`);
    }
  };

  const handleApproveExpense = (expenseId: string) => {
    const nextState = { ...state };
    const exp = nextState.expenses.find((e: any) => e.id === expenseId);
    if (exp) {
      exp.status = 'approuve';
      exp.approverName = state.currentUser.fullName;

      // Deduct from cash register
      const reg = nextState.cashRegisters.find((r: any) => r.siteId === exp.siteId && r.status === 'ouverte');
      if (reg && exp.paymentMethod === 'Espèces') {
        reg.totalExpensesPaidAr += exp.amountAr;
        reg.currentCashInHandAr -= exp.amountAr;
      }

      saveState(nextState);
      syncApi(`/api/v1/expenses/${encodeURIComponent(expenseId)}/approve`, 'POST', {
        approverName: state.currentUser.fullName
      });
      addAuditLog('APPROBATION_DEPENSE', 'Finances', `Dépense #${exp.expenseNumber} de ${exp.amountAr.toLocaleString('fr-FR')} Ar approuvée (${exp.category})`);
    }
  };

  const handleRejectExpense = (expenseId: string) => {
    const nextState = { ...state };
    const exp = nextState.expenses.find((e: any) => e.id === expenseId);
    if (exp) {
      exp.status = 'rejete';
      exp.approverName = state.currentUser.fullName;
      saveState(nextState);
      syncApi(`/api/v1/expenses/${encodeURIComponent(expenseId)}/reject`, 'POST', {
        approverName: state.currentUser.fullName
      });
      addAuditLog('REJET_DEPENSE', 'Finances', `Dépense #${exp.expenseNumber} rejetée`);
    }
  };


  /** Creates the expense on the server first, then shows it. Throws with a readable message on failure. */
  const handleAddExpense = async (expenseData: Partial<ExpenseRecord>): Promise<void> => {
    const year = new Date().getFullYear();
    const prefix = `DEP-${year}-`;
    const maxSeq = state.expenses
      .map((e) => (e.expenseNumber.startsWith(prefix) ? Number(e.expenseNumber.slice(prefix.length)) : 0))
      .reduce((a, b) => Math.max(a, Number.isFinite(b) ? b : 0), 0);
    const expNum = `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
    const draft: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      expenseNumber: expNum,
      date: new Date().toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' }) + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Indian/Antananarivo' }),
      siteId: expenseData.siteId || 'S1',
      category: expenseData.category || 'Autre',
      description: expenseData.description || 'Dépense exploitation',
      beneficiary: expenseData.beneficiary || 'Prestataire',
      amountAr: expenseData.amountAr || 50000,
      paymentMethod: expenseData.paymentMethod || 'Espèces',
      requesterName: state.currentUser.fullName,
      status: 'en_attente',
      invoicePhotoUrl: expenseData.invoicePhotoUrl,
      quantity: expenseData.quantity,
      unit: expenseData.unit
    };

    let res: Response;
    try {
      res = await fetch('/api/v1/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      });
    } catch {
      throw new Error('Serveur injoignable : la dépense n’a pas été enregistrée.');
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        res.status === 413
          ? 'La photo de la facture est trop lourde. Réessayez avec une photo plus petite.'
          : body?.error || `La dépense n’a pas été enregistrée (erreur ${res.status}).`
      );
    }
    // The server may have changed the number if it was already taken
    const saved = (await res.json()) as ExpenseRecord;
    const nextState = loadState();
    nextState.expenses = [saved, ...nextState.expenses.filter((e) => e.id !== saved.id)];
    saveState(nextState);
    addAuditLog('DEMANDE_ENGAGEMENT_DEPENSE', 'Finances', `Demande d'engagement #${saved.expenseNumber} créée pour ${saved.amountAr.toLocaleString('fr-FR')} Ar`);
  };

  // Render view router
  const renderCurrentView = () => {
    switch (currentPath) {
      case 'rapports-et-statistiques':
        return <ReportsView key={viewKey} state={state} selectedSiteId={state.selectedSiteId} />;

      case 'informations-et-cgu':
        return <InfoView />;

      case 'sites-et-zones':
        return <SitesView key={viewKey} state={state} onNavigate={(p) => goTo(p as NavPath)} />;

      case 'tableau-de-bord':
        return (
          <DashboardView
            sites={state.sites}
            spots={state.spots}
            receipts={state.receipts}
            vehicles={state.vehicles}
            members={state.members}
            guards={state.guards}
            incidents={state.incidents}
            expenses={state.expenses}
            subscriptions={state.subscriptions}
            cashRegisters={state.cashRegisters}
            selectedSiteId={state.selectedSiteId}
            onOpenNewPayment={handleOpenNewPayment}
            onSelectReceipt={handleSelectReceipt}
            onNavigate={(p) => setCurrentPath(p as NavPath)}
          />
        );

      case 'emplacements-et-occupation':
        return (
          <SpotsView
            spots={state.spots}
            sites={state.sites}
            selectedSiteId={state.selectedSiteId}
            onUpdateSpotStatus={handleUpdateSpotStatus}
            onOpenNewPayment={handleOpenNewPayment}
          />
        );

      case 'vehicules':
        return (
          <VehiclesView
            key={viewKey}
            initialSearch={focus.query}
            onOpenMember={(memberId) => goTo('membres-et-proprietaires', { selectId: memberId })}
            vehicles={state.vehicles}
            members={state.members}
            sites={state.sites}
            selectedSiteId={state.selectedSiteId}
            onAddVehicle={handleAddVehicle}
          />
        );

      case 'membres-et-proprietaires':
      case 'abonnements-et-tarifs':
        return (
          <MembersView
            key={viewKey}
            initialSelectedId={focus.selectId}
            startWithList={currentPath === 'membres-et-proprietaires'}
            members={state.members}
            vehicles={state.vehicles}
            subscriptions={state.subscriptions}
            receipts={state.receipts}
            cards={state.cards}
            sites={state.sites}
            selectedSiteId={state.selectedSiteId}
            onAddMember={handleAddMember}
            onOpenNewPayment={handleOpenNewPayment}
            onSelectReceipt={handleSelectReceipt}
            onToggleCardBlock={handleToggleCardBlock}
          />
        );

      case 'cartes-de-membres':
        return (
          <CardsView
            key={viewKey}
            initialSelectedId={focus.selectId}
            cards={state.cards}
            members={state.members}
            onToggleCardBlock={handleToggleCardBlock}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        );

      case 'encaissements-et-recus':
        return (
          <ReceiptsView
            key={viewKey}
            initialSearch={focus.query}
            receipts={state.receipts}
            sites={state.sites}
            selectedSiteId={state.selectedSiteId}
            onOpenNewPayment={handleOpenNewPayment}
            onSelectReceipt={handleSelectReceipt}
          />
        );

      case 'tresorerie-et-caisses':
        return (
          <TreasuryView
            cashRegisters={state.cashRegisters}
            expenses={state.expenses}
            sites={state.sites}
            selectedSiteId={state.selectedSiteId}
            onApproveExpense={handleApproveExpense}
            onRejectExpense={handleRejectExpense}
            onAddExpense={handleAddExpense}
          />
        );

      case 'paie-et-salaires':
        return <PayrollView state={state} />;

      case 'personnel-et-gardiens':
        return (
          <GuardsView
            key={viewKey}
            initialSearch={focus.query}
            initialSelectedId={focus.selectId}
            guards={state.guards}
            sites={state.sites}
            selectedSiteId={state.selectedSiteId}
          />
        );

      case 'comite-de-gestion':
      case 'utilisateurs-et-roles':
        return <GovernanceView state={state} />;

      case 'materiels-et-equipements':
        return (
          <EquipmentView
            key={viewKey}
            initialSelectedId={focus.selectId}
            equipments={state.equipments}
            sites={state.sites}
            selectedSiteId={state.selectedSiteId}
          />
        );

      case 'incidents-et-registre':
        return <IncidentsView key={viewKey} initialSearch={focus.query} state={state} />;

      case 'parametres-et-audit':
        return <AuditLogsView state={state} />;

      default:
        return (
          <DashboardView
            sites={state.sites}
            spots={state.spots}
            receipts={state.receipts}
            vehicles={state.vehicles}
            members={state.members}
            guards={state.guards}
            incidents={state.incidents}
            expenses={state.expenses}
            subscriptions={state.subscriptions}
            cashRegisters={state.cashRegisters}
            selectedSiteId={state.selectedSiteId}
            onOpenNewPayment={handleOpenNewPayment}
            onSelectReceipt={handleSelectReceipt}
            onNavigate={(p) => setCurrentPath(p as NavPath)}
          />
        );
    }
  };

  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1322] text-slate-300 text-sm gap-2">
        <span className="material-symbols-outlined animate-spin text-[#06B6D4]">progress_activity</span>
        Chargement…
      </div>
    );
  }
  if (authStatus === 'out') {
    return <LoginView notice={authNotice} onLoggedIn={(user) => { enterApp(user); }} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans antialiased text-[#0F172A]">
      {accountOpen && (
        <AccountModal
          user={state.currentUser}
          onClose={() => setAccountOpen(false)}
          onUpdated={(user) => { setCurrentUser({ ...state.currentUser, email: user.email }); setState(loadState()); }}
        />
      )}
      {/* Left Sidebar: fixed on large screens, drawer on small screens */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={(path) => goTo(path)}
        sitesCount={state.sites.length}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-72 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <Header
          sites={state.sites}
          selectedSiteId={state.selectedSiteId}
          onSelectSite={handleSelectSite}
          currentUser={state.currentUser}
          onChangeRole={handleChangeRole}
          onOpenNewPayment={handleOpenNewPayment}
          onGlobalSearch={(term) => setSearchTerm(term)}
          searchTerm={searchTerm}
          searchState={state}
          onOpenSearchResult={(target) => goTo(target.path as NavPath, target)}
          onOpenMenu={() => setSidebarOpen(true)}
          onOpenAccount={() => setAccountOpen(true)}
          onLogout={handleLogout}
          alerts={computeAlerts({
            subscriptions: state.subscriptions,
            incidents: state.incidents,
            expenses: state.expenses,
            siteNames: Object.fromEntries(state.sites.map((s) => [s.id, s.name.replace(/^Site \d+\s*-\s*/, '')]))
          })}
          onNavigate={(p) => goTo(p as NavPath)}
        />

        {/* View Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {renderCurrentView()}
        </main>
      </div>

      {/* Payment Modal */}
      {isNewPaymentOpen && (
        <NewPaymentModal
          isOpen={isNewPaymentOpen}
          onClose={() => setIsNewPaymentOpen(false)}
          members={state.members}
          vehicles={state.vehicles}
          sites={state.sites}
          receipts={state.receipts}
          onSubmitPayment={handlePaymentSubmit}
        />
      )}

      {/* Receipt Print View Modal */}
      <ReceiptPrintModal
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />

      {/* QR & Gate Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        cards={state.cards}
        members={state.members}
      />
    </div>
  );
}
