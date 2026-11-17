import React, { useState } from 'react';
import type { User } from '../types';

interface AccountModalProps {
  user: User;
  onClose: () => void;
  onUpdated: (user: User) => void;
}

/** "Mon compte": change the sign-in email and/or password (current password required). */
export const AccountModal: React.FC<AccountModalProps> = ({ user, onClose, onUpdated }) => {
  const [email, setEmail] = useState(user.email);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next && next !== confirm) {
      setError('Les deux nouveaux mots de passe ne sont pas identiques.');
      return;
    }
    if (!next && email.trim().toLowerCase() === user.email.toLowerCase()) {
      setError('Aucune modification à enregistrer.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next || undefined, newEmail: email.trim() })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || 'Modification impossible.');
        return;
      }
      onUpdated(body.user as User);
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch {
      setError('Serveur injoignable.');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="account-title" className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 id="account-title" className="font-headline text-base font-bold text-[#0F172A] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#06B6D4]">manage_accounts</span>
            Mon compte
          </h3>
          <button type="button" onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-700">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4 text-xs">
          {done && (
            <p role="status" className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
              Identifiants mis à jour. Utilisez-les à votre prochaine connexion.
            </p>
          )}
          {error && <p role="alert" className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[#DC2626]">{error}</p>}
          <label className="block">
            <span className="block font-semibold text-slate-700 mb-1">Email de connexion</span>
            <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          </label>
          <label className="block">
            <span className="block font-semibold text-slate-700 mb-1">Nouveau mot de passe <span className="font-normal text-slate-400">(laisser vide pour ne pas changer)</span></span>
            <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={input} />
            <span className="block mt-1 text-[11px] text-slate-400">8 caractères minimum, avec des lettres et des chiffres.</span>
          </label>
          {next && (
            <label className="block">
              <span className="block font-semibold text-slate-700 mb-1">Confirmer le nouveau mot de passe</span>
              <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
            </label>
          )}
          <label className="block pt-2 border-t border-slate-100">
            <span className="block font-semibold text-slate-700 mb-1">Mot de passe actuel *</span>
            <input type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={input} />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">Fermer</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-[#0F172A] text-white font-bold hover:bg-slate-800 disabled:opacity-60">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
