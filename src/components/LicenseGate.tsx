import React, { useCallback, useEffect, useState } from 'react';
import { BrandLogo, useBranding } from '../services/branding';

/** Licence state answered by the server (the web version answers mode: 'web'). */
interface LicenseStatus {
  mode: 'web' | 'desktop';
  machineCode?: string;
  state?:
    | { state: 'active'; customer: string; issued: string }
    | { state: 'trial'; daysLeft: number; endsAt: number }
    | { state: 'expired'; reason: 'trial_over' | 'clock' };
}

/**
 * Installed version only: free trial banner, activation window, and blocking screen once the
 * 7-day trial is over. The hosted web version is shown as is.
 */
export const LicenseGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [showActivate, setShowActivate] = useState(false);

  const load = useCallback(() => {
    fetch('/api/v1/license/status')
      .then((r) => (r.ok ? r.json() : { mode: 'web' }))
      .then((s: LicenseStatus) => setStatus(s))
      .catch(() => setStatus((cur) => cur || { mode: 'web' }));
  }, []);

  useEffect(() => {
    load();
    const t = window.setInterval(load, 10 * 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  if (!status) return null;
  if (status.mode === 'web' || !status.state) return <>{children}</>;

  if (status.state.state === 'expired') {
    return (
      <ActivationScreen
        status={status}
        title={status.state.reason === 'clock' ? 'Date du système incorrecte' : 'Période d’essai terminée'}
        text={
          status.state.reason === 'clock'
            ? 'La date de l’ordinateur a été reculée. Remettez la bonne date, ou activez l’application avec votre clé.'
            : 'Les 7 jours d’essai gratuit sont écoulés. Activez l’application avec la clé fournie pour continuer. Vos données sont conservées.'
        }
        onActivated={(s) => setStatus(s)}
      />
    );
  }

  return (
    <>
      {status.state.state === 'trial' && (
        <div className="fixed bottom-3 left-3 z-[80] max-w-xs rounded-xl bg-[#0F172A] text-white shadow-lg px-3.5 py-2.5 text-xs flex items-center gap-3">
          <span className="material-symbols-outlined text-[#06B6D4] text-[20px]">schedule</span>
          <span className="flex-1">
            Essai gratuit : <strong>{status.state.daysLeft} jour{status.state.daysLeft > 1 ? 's' : ''} restant{status.state.daysLeft > 1 ? 's' : ''}</strong>
          </span>
          <button type="button" onClick={() => setShowActivate(true)} className="px-2.5 py-1 rounded-lg bg-[#06B6D4] text-[#0F172A] font-bold">
            Activer
          </button>
        </div>
      )}
      {children}
      {showActivate && (
        <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl relative">
            <button type="button" onClick={() => setShowActivate(false)} className="absolute top-3 right-3 text-slate-400 hover:text-[#0F172A]" aria-label="Fermer">
              <span className="material-symbols-outlined">close</span>
            </button>
            <ActivationForm
              status={status}
              onActivated={(s) => {
                setStatus(s);
                setShowActivate(false);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};

const ActivationScreen: React.FC<{ status: LicenseStatus; title: string; text: string; onActivated: (s: LicenseStatus) => void }> = ({
  status,
  title,
  text,
  onActivated
}) => {
  const { appName } = useBranding();
  return (
    <div className="min-h-screen bg-[#0B1322] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="p-6 pb-0 text-center space-y-2">
          <div className="flex justify-center"><BrandLogo size={48} /></div>
          <div className="font-headline font-bold text-[#0F172A]">{appName}</div>
          <h1 className="font-headline text-xl font-bold text-[#DC2626]">{title}</h1>
          <p className="text-xs text-slate-600">{text}</p>
        </div>
        <ActivationForm status={status} onActivated={onActivated} />
      </div>
    </div>
  );
};

const ActivationForm: React.FC<{ status: LicenseStatus; onActivated: (s: LicenseStatus) => void }> = ({ status, onActivated }) => {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(status.machineCode || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the code stays selectable */
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || 'Activation impossible.');
        return;
      }
      onActivated(body as LicenseStatus);
      window.location.reload();
    } catch {
      setError('Application injoignable.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-6 space-y-4 text-xs">
      <div className="space-y-1">
        <span className="block text-[11px] font-semibold text-slate-500">1. Envoyez ce code machine à votre fournisseur</span>
        <div className="flex gap-2">
          <code className="flex-1 select-all text-center text-base font-mono-data font-bold tracking-wider text-[#0F172A] bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg py-2.5">
            {status.machineCode}
          </code>
          <button type="button" onClick={copy} className="px-3 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 font-semibold">
            {copied ? 'Copié' : 'Copier'}
          </button>
        </div>
      </div>
      <label className="block space-y-1">
        <span className="block text-[11px] font-semibold text-slate-500">2. Collez la clé d’activation reçue</span>
        <textarea
          required
          rows={4}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="PM1-…"
          className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] font-mono-data text-[11px] break-all"
        />
      </label>
      {error && <p className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">{error}</p>}
      <button type="submit" disabled={busy || !key.trim()} className="w-full py-2.5 rounded-lg bg-[#0F172A] text-white font-headline font-bold disabled:opacity-50">
        {busy ? 'Activation…' : 'Activer l’application'}
      </button>
      <p className="text-[10px] text-slate-400 text-center">La clé est propre à cet ordinateur. Licence à vie.</p>
    </form>
  );
};
