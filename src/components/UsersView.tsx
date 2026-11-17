import React, { useEffect, useState } from 'react';
import { ADMIN_ROLES, Site, USER_ROLES, User, UserRole } from '../types';
import { addAuditLog } from '../services/storage';

interface UsersViewProps {
  currentUser: User;
  sites: Site[];
  /** Called when the signed-in user edits their own account */
  onSelfUpdated: (user: User) => void;
}

const roleLabel = (r: string) => USER_ROLES.find((x) => x.role === r)?.label || r;
const needsSite = (r: string) => USER_ROLES.find((x) => x.role === r)?.needsSite ?? false;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

/** "Abcd-2345-Efgh": 12 characters with letters and digits, easy to read aloud. */
function generatePassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const pick = (set: string, n: number) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (v) => set[v % set.length]).join('');
  return `${pick(letters, 4)}-${pick(digits, 4)}-${pick(letters, 4)}`;
}

async function api<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new Error('Serveur injoignable.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
  return data as T;
}

type Form = { fullName: string; email: string; role: UserRole; siteId: string; phone: string; isActive: boolean; password: string; confirm: string };
const emptyForm = (): Form => ({ fullName: '', email: '', role: 'secretaire', siteId: '', phone: '', isActive: true, password: '', confirm: '' });

/** Password field with show/hide, generate and copy. */
const PasswordFields: React.FC<{ value: string; confirm: string; onChange: (pw: string, confirm: string) => void }> = ({ value, confirm, onChange }) => {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const input = 'w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#06B6D4]';
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          aria-label="Mot de passe"
          value={value}
          onChange={(e) => onChange(e.target.value, confirm)}
          className={input}
        />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Masquer' : 'Afficher'} className="px-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
          <span className="material-symbols-outlined text-[18px]">{show ? 'visibility_off' : 'visibility'}</span>
        </button>
      </div>
      {!show && (
        <input type="password" autoComplete="new-password" aria-label="Confirmer le mot de passe" placeholder="Confirmer le mot de passe" value={confirm} onChange={(e) => onChange(value, e.target.value)} className={input} />
      )}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <button
          type="button"
          onClick={() => { const pw = generatePassword(); onChange(pw, pw); setShow(true); setCopied(false); }}
          className="px-2.5 py-1 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[15px] text-[#06B6D4]">key</span>
          Générer un mot de passe
        </button>
        {value && (
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(value).then(() => setCopied(true)).catch(() => undefined)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px] text-[#06B6D4]">content_copy</span>
            {copied ? 'Copié' : 'Copier'}
          </button>
        )}
        <span className="text-slate-400">8 caractères minimum, lettres et chiffres.</span>
      </div>
    </div>
  );
};

export const UsersView: React.FC<UsersViewProps> = ({ currentUser, sites, onSelfUpdated }) => {
  const isAdmin = ADMIN_ROLES.includes(currentUser.role);
  const [users, setUsers] = useState<User[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<User | 'new' | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  const [pwTarget, setPwTarget] = useState<User | null>(null);
  const [pw, setPw] = useState({ password: '', confirm: '' });
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = () =>
    api<User[]>('/api/v1/users').then((u) => { setUsers(u); setLoadError(null); }).catch((e) => setLoadError(e.message));

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const siteName = (id?: string) => (id ? (sites.find((s) => s.id === id)?.name || id).replace(/^Site \d+\s*-\s*/, '') : '—');

  const openNew = () => { setForm(emptyForm()); setError(null); setEditing('new'); };
  const openEdit = (u: User) => {
    setForm({ fullName: u.fullName, email: u.email, role: u.role, siteId: u.siteId || '', phone: u.phone || '', isActive: u.isActive, password: '', confirm: '' });
    setError(null);
    setEditing(u);
  };

  const run = async (fn: () => Promise<void>, success: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setNotice(success);
      await load();
      addAuditLog('UTILISATEURS', 'Utilisateurs', success); // reloads the journal from the server
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opération impossible.');
    } finally {
      setBusy(false);
    }
  };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing === 'new' && form.password !== form.confirm) {
      setError('Les deux mots de passe ne sont pas identiques.');
      return;
    }
    const payload = {
      fullName: form.fullName,
      email: form.email,
      role: form.role,
      siteId: form.siteId || null,
      phone: form.phone,
      isActive: form.isActive
    };
    run(async () => {
      if (editing === 'new') {
        await api<User>('/api/v1/users', 'POST', { ...payload, password: form.password });
      } else if (editing) {
        const updated = await api<User>(`/api/v1/users/${encodeURIComponent(editing.id)}`, 'PUT', payload);
        if (updated.id === currentUser.id) onSelfUpdated(updated);
      }
      setEditing(null);
    }, editing === 'new' ? `Compte créé pour ${form.fullName}.` : `Compte de ${form.fullName} mis à jour.`);
  };

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwTarget) return;
    if (pw.password !== pw.confirm) { setError('Les deux mots de passe ne sont pas identiques.'); return; }
    run(async () => {
      await api(`/api/v1/users/${encodeURIComponent(pwTarget.id)}/password`, 'POST', { password: pw.password });
      setPwTarget(null);
    }, `Nouveau mot de passe défini pour ${pwTarget.fullName}. Communiquez-le-lui de façon sûre.`);
  };

  const toggleActive = (u: User) =>
    run(async () => { await api(`/api/v1/users/${encodeURIComponent(u.id)}`, 'PUT', { isActive: !u.isActive }); },
      u.isActive ? `Compte de ${u.fullName} désactivé : il ne peut plus se connecter.` : `Compte de ${u.fullName} réactivé.`);

  const confirmDelete = () => {
    if (!toDelete) return;
    const u = toDelete;
    run(async () => { await api(`/api/v1/users/${encodeURIComponent(u.id)}`, 'DELETE'); setToDelete(null); }, `Compte de ${u.fullName} supprimé.`);
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-8 text-center space-y-2">
        <span className="material-symbols-outlined text-[40px] text-slate-300">lock</span>
        <h1 className="font-headline text-lg font-bold text-[#0F172A]">Utilisateurs &amp; Rôles</h1>
        <p className="text-sm text-slate-500">La gestion des comptes est réservée aux administrateurs (Super Admin, Président Général).</p>
      </div>
    );
  }

  const filtered = (users || []).filter((u) => {
    const q = query.trim().toLowerCase();
    return !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || roleLabel(u.role).toLowerCase().includes(q);
  });
  const field = 'w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]';

  return (
    <div className="flex flex-col w-full space-y-6">
      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono-data text-xs text-slate-500 uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">manage_accounts</span>
            Pilotage &amp; Système
          </div>
          <h1 className="font-headline text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Utilisateurs &amp; Rôles</h1>
          <p className="text-xs text-slate-500">
            {users ? `${users.length} compte${users.length > 1 ? 's' : ''} · ${users.filter((u) => u.isActive).length} actif${users.filter((u) => u.isActive).length > 1 ? 's' : ''}` : 'Chargement…'}
            {' '}— chaque personne se connecte avec son email et son propre mot de passe.
          </p>
        </div>
        <button type="button" onClick={openNew} className="self-start md:self-auto px-4 py-2.5 rounded-lg bg-[#0F172A] text-white hover:bg-slate-800 shadow-md text-xs font-bold flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">person_add</span>
          + Nouvel utilisateur
        </button>
      </div>

      {notice && (
        <p role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-start justify-between gap-3">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Fermer" className="text-emerald-700"><span className="material-symbols-outlined text-[18px]">close</span></button>
        </p>
      )}
      {error && !editing && !pwTarget && !toDelete && (
        <p role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-[#DC2626]">{error}</p>
      )}
      {loadError && <p role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-[#DC2626]">{loadError}</p>}

      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="p-3 sm:p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher nom, email, rôle…" aria-label="Rechercher un utilisateur"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]" />
          </div>
        </div>
        <ul className="divide-y divide-slate-100">
          {users && filtered.length === 0 && <li className="p-8 text-center text-sm text-slate-400">Aucun utilisateur.</li>}
          {filtered.map((u) => {
            const me = u.id === currentUser.id;
            return (
              <li key={u.id} className={`p-4 flex flex-col lg:flex-row lg:items-center gap-3 ${u.isActive ? '' : 'bg-slate-50/70'}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${u.isActive ? 'bg-[#0F172A] text-white' : 'bg-slate-200 text-slate-500'}`}>{initials(u.fullName)}</div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`font-semibold truncate ${u.isActive ? 'text-[#0F172A]' : 'text-slate-500 line-through'}`}>{u.fullName}</span>
                      {me && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800">Vous</span>}
                      {!u.isActive && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600">Désactivé</span>}
                    </div>
                    <span className="block text-xs text-slate-500 truncate">{u.email}{u.phone ? ` · ${u.phone}` : ''}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs lg:w-[340px]">
                  <span className={`px-2 py-0.5 rounded-full border font-semibold ${ADMIN_ROLES.includes(u.role) ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>{roleLabel(u.role)}</span>
                  {u.siteId && <span className="px-2 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800">{siteName(u.siteId)}</span>}
                  <span className="text-[11px] text-slate-400">{u.lastLogin ? `Dernière connexion : ${u.lastLogin}` : 'Jamais connecté'}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => openEdit(u)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">edit</span>Modifier
                  </button>
                  <button type="button" onClick={() => { setPw({ password: '', confirm: '' }); setError(null); setPwTarget(u); }} className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">key</span>Mot de passe
                  </button>
                  {!me && (
                    <>
                      <button type="button" disabled={busy} onClick={() => toggleActive(u)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1 disabled:opacity-50">
                        <span className="material-symbols-outlined text-[16px]">{u.isActive ? 'block' : 'check_circle'}</span>{u.isActive ? 'Désactiver' : 'Réactiver'}
                      </button>
                      <button type="button" onClick={() => { setError(null); setToDelete(u); }} aria-label={`Supprimer ${u.fullName}`} className="px-2.5 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-[#DC2626] hover:bg-red-50">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-[11px] text-slate-500">
        Les rôles Super Admin et Président Général peuvent gérer les comptes et l'identité de l'application. Un compte désactivé ne peut plus se connecter et sa session en cours est coupée.
      </p>

      {/* Create / edit */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="user-form-title" className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
              <h3 id="user-form-title" className="font-headline text-base font-bold text-[#0F172A]">{editing === 'new' ? 'Nouvel utilisateur' : `Modifier ${editing.fullName}`}</h3>
              <button type="button" onClick={() => !busy && setEditing(null)} aria-label="Fermer" className="text-slate-400 hover:text-slate-700"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={submitForm} className="px-5 sm:px-6 py-5 space-y-3">
              <label className="block"><span className="block text-xs font-semibold text-slate-700 mb-1">Nom complet *</span>
                <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={field} />
              </label>
              <label className="block"><span className="block text-xs font-semibold text-slate-700 mb-1">Email de connexion *</span>
                <input required type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={field} />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block"><span className="block text-xs font-semibold text-slate-700 mb-1">Rôle *</span>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className={`${field} bg-white`}>
                    <optgroup label="Rôles généraux">
                      {USER_ROLES.filter((r) => !r.needsSite).map((r) => <option key={r.role} value={r.role}>{r.label}</option>)}
                    </optgroup>
                    <optgroup label="Rôles rattachés à un site">
                      {USER_ROLES.filter((r) => r.needsSite).map((r) => <option key={r.role} value={r.role}>{r.label}</option>)}
                    </optgroup>
                  </select>
                </label>
                <label className="block"><span className="block text-xs font-semibold text-slate-700 mb-1">Site {needsSite(form.role) ? '*' : '(facultatif)'}</span>
                  <select required={needsSite(form.role)} value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })} className={`${field} bg-white`}>
                    <option value="">{needsSite(form.role) ? 'Choisir le site…' : 'Tous les sites'}</option>
                    {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
              </div>
              <label className="block"><span className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</span>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+261 34 …" className={field} />
              </label>
              {editing === 'new' ? (
                <div><span className="block text-xs font-semibold text-slate-700 mb-1">Mot de passe initial *</span>
                  <PasswordFields value={form.password} confirm={form.confirm} onChange={(password, confirm) => setForm({ ...form, password, confirm })} />
                  <p className="mt-1 text-[11px] text-slate-500">Communiquez-le à la personne : elle pourra le changer dans « Mon compte ».</p>
                </div>
              ) : editing.id !== currentUser.id && (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-cyan-600" />
                  Compte actif (peut se connecter)
                </label>
              )}
              {error && <p role="alert" className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC2626]">{error}</p>}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditing(null)} disabled={busy} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">Annuler</button>
                <button type="submit" disabled={busy} className="px-5 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-60">
                  {busy ? 'Enregistrement…' : editing === 'new' ? 'Créer le compte' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set password */}
      {pwTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="pw-title" className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
              <h3 id="pw-title" className="font-headline text-base font-bold text-[#0F172A]">Mot de passe de {pwTarget.fullName}</h3>
              <button type="button" onClick={() => !busy && setPwTarget(null)} aria-label="Fermer" className="text-slate-400 hover:text-slate-700"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={submitPassword} className="px-5 sm:px-6 py-5 space-y-3">
              <p className="text-xs text-slate-500">Le nouveau mot de passe remplace l'ancien immédiatement.</p>
              <PasswordFields value={pw.password} confirm={pw.confirm} onChange={(password, confirm) => setPw({ password, confirm })} />
              {error && <p role="alert" className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC2626]">{error}</p>}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setPwTarget(null)} disabled={busy} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">Annuler</button>
                <button type="submit" disabled={busy || !pw.password} className="px-5 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-60">{busy ? 'Enregistrement…' : 'Définir le mot de passe'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
          <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <h3 id="del-title" className="font-headline text-base font-bold text-[#0F172A] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#DC2626]">warning</span>Supprimer le compte ?
            </h3>
            <p className="text-sm text-slate-600">
              <strong>{toDelete.fullName}</strong> ({toDelete.email}) ne pourra plus se connecter. Cette action est définitive ;
              pour bloquer l'accès temporairement, préférez « Désactiver ».
            </p>
            {error && <p role="alert" className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC2626]">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setToDelete(null)} disabled={busy} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">Annuler</button>
              <button type="button" onClick={confirmDelete} disabled={busy} className="px-4 py-2 rounded-xl bg-[#DC2626] text-white text-xs font-bold hover:bg-red-700 disabled:opacity-60">{busy ? 'Suppression…' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
