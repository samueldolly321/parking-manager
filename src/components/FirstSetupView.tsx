import React, { useState } from 'react';
import { BrandLogo, useBranding } from '../services/branding';

/** Installed version, first launch: creation of the administrator account (email + password). */
export const FirstSetupView: React.FC<{ onDone: (email: string) => void }> = ({ onDone }) => {
  const { appName } = useBranding();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Les deux mots de passe ne sont pas identiques.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || 'Configuration impossible.');
        return;
      }
      onDone(email.trim().toLowerCase());
    } catch {
      setError('Application injoignable.');
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#06B6D4]';
  return (
    <div className="min-h-screen bg-[#0B1322] flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4 text-xs">
        <div className="text-center space-y-2">
          <div className="flex justify-center"><BrandLogo size={48} /></div>
          <h1 className="font-headline text-xl font-bold text-[#0F172A]">Bienvenue dans {appName}</h1>
          <p className="text-slate-600">Premier démarrage : créez le compte administrateur. Il permettra ensuite de créer les autres utilisateurs.</p>
        </div>
        <label className="block space-y-1">
          <span className="font-semibold text-slate-700">Nom complet</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={150} className={field} />
        </label>
        <label className="block space-y-1">
          <span className="font-semibold text-slate-700">Email (identifiant de connexion) *</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        </label>
        <label className="block space-y-1">
          <span className="font-semibold text-slate-700">Mot de passe *</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={field} autoComplete="new-password" />
          <span className="text-[11px] text-slate-400">8 caractères minimum, avec des lettres et des chiffres.</span>
        </label>
        <label className="block space-y-1">
          <span className="font-semibold text-slate-700">Confirmer le mot de passe *</span>
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} autoComplete="new-password" />
        </label>
        {error && <p className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">{error}</p>}
        <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#0F172A] text-white font-headline font-bold disabled:opacity-50">
          {busy ? 'Création…' : 'Créer le compte administrateur'}
        </button>
      </form>
    </div>
  );
};
