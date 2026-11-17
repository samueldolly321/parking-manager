import React, { useState } from 'react';
import { useBranding, BrandLogo } from '../services/branding';
import type { User } from '../types';
import { APP_INFO, CguContent } from '../content/legal';

interface LoginViewProps {
  onLoggedIn: (user: User) => void;
  /** Shown above the form, e.g. after an expired session */
  notice?: string | null;
}

/** Full-screen sign-in page: background photo, brand on the left, glass card with the form. */
export const LoginView: React.FC<LoginViewProps> = ({ onLoggedIn, notice }) => {
  const { appName } = useBranding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCgu, setShowCgu] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || 'Connexion impossible.');
        setPassword('');
        return;
      }
      onLoggedIn(body.user as User);
    } catch {
      setError('Serveur injoignable. Vérifiez que l’application est bien démarrée.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0B1322] font-sans text-white">
      {/* Background photo + overlays */}
      <img
        src="/login-bg.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B1322]/95 via-[#0F172A]/75 to-[#0F172A]/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B1322]/90 via-transparent to-[#0B1322]/40" />
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#06B6D4]/20 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col lg:flex-row items-center justify-center lg:justify-between gap-10 px-5 py-10 sm:px-8">
        {/* Brand side */}
        <section className="max-w-md text-center lg:text-left">
          <div className="inline-flex items-center gap-3">
            <BrandLogo size={48} rounded="rounded-xl" className="shadow-lg shadow-cyan-500/30" />
            <div className="text-left">
              <div className="font-headline text-xl font-bold leading-tight">{appName}</div>
              <div className="font-mono-data text-[11px] uppercase tracking-[0.2em] text-[#67E8F9]">Gestion centrale</div>
            </div>
          </div>
          <h1 className="mt-8 font-headline text-3xl sm:text-4xl font-bold leading-tight">
            Pilotez vos parkings,<br />
            <span className="text-[#67E8F9]">site par site.</span>
          </h1>
          <p className="mt-4 text-sm text-slate-300 leading-relaxed hidden sm:block">
            Membres, encaissements, trésorerie, paie et gardiennage d'Antananarivo réunis dans une seule console.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-200 hidden lg:block">
            {[
              ['payments', 'Encaissements et reçus en Ariary'],
              ['security', 'Brigades et gardes 24h'],
              ['analytics', 'Rapports et statistiques exportables']
            ].map(([icon, text]) => (
              <li key={icon} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px] text-[#67E8F9]">{icon}</span>
                </span>
                {text}
              </li>
            ))}
          </ul>
        </section>

        {/* Form card */}
        <section className="w-full max-w-md">
          <div className="rounded-2xl bg-white/95 text-[#0F172A] shadow-2xl shadow-black/40 ring-1 ring-white/20 backdrop-blur-xl p-6 sm:p-8">
            <h2 className="font-headline text-2xl font-bold">Connexion</h2>
            <p className="mt-1 text-sm text-slate-500">Accédez à votre espace de gestion.</p>

            {notice && !error && (
              <p role="status" className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                {notice}
              </p>
            )}
            {error && (
              <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-[#DC2626]">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </p>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4" noValidate={false}>
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1.5">Adresse email</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400 pointer-events-none">mail</span>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="username"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.mg"
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm placeholder:text-slate-400 focus:border-[#06B6D4] focus:outline-none focus:ring-4 focus:ring-[#06B6D4]/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400 pointer-events-none">lock</span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-11 text-sm placeholder:text-slate-400 focus:border-[#06B6D4] focus:outline-none focus:ring-4 focus:ring-[#06B6D4]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#0F172A] py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-[#06B6D4]/30 disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Connexion…
                  </>
                ) : (
                  <>
                    Se connecter
                    <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-[11px] text-slate-500">
              En vous connectant, vous acceptez les{' '}
              <button type="button" onClick={() => setShowCgu(true)} className="font-semibold text-[#0891B2] hover:underline">
                conditions générales d'utilisation
              </button>.
            </p>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Mot de passe oublié ? Contactez l'administrateur de l'application.
            </p>
          </div>
          <p className="mt-4 text-center text-[11px] text-slate-400">
            Connexion sécurisée · Antananarivo (GMT+3) · Créé par {APP_INFO.creatorName}
          </p>
        </section>
      </div>

      {showCgu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowCgu(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cgu-title"
            className="bg-white text-[#0F172A] rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
              <h2 id="cgu-title" className="font-headline text-base font-bold">Conditions générales d'utilisation</h2>
              <button type="button" onClick={() => setShowCgu(false)} aria-label="Fermer" className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="overflow-y-auto px-5 sm:px-6 py-5">
              <CguContent compact />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
