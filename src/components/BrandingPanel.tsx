import React, { useEffect, useState } from 'react';
import { PhotoInput } from './PhotoInput';
import { useBranding, DEFAULT_BRANDING } from '../services/branding';
import { addAuditLog } from '../services/storage';

/** Logos are kept small: 256 px on the longest side, PNG (transparency). */
const LOGO_MAX_PX = 256;

/** "Identité de l'application": name and logo shown in the menu, sign-in page, cards, receipts, payslips and reports. */
export const BrandingPanel: React.FC = () => {
  const branding = useBranding();
  const [name, setName] = useState(branding.appName);
  const [logo, setLogo] = useState<string | null>(branding.logoUrl);
  const [nif, setNif] = useState(branding.nif);
  const [stat, setStat] = useState(branding.stat);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Follow the saved values (first load from the server)
  useEffect(() => { setName(branding.appName); setLogo(branding.logoUrl); setNif(branding.nif); setStat(branding.stat); }, [branding.appName, branding.logoUrl, branding.nif, branding.stat]);

  const dirty = name.trim() !== branding.appName || logo !== branding.logoUrl || nif.trim() !== branding.nif || stat.trim() !== branding.stat;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await branding.save({ appName: name.trim(), logoUrl: logo, nif: nif.trim(), stat: stat.trim() });
      addAuditLog('MODIFICATION_IDENTITE', 'Paramètres', name.trim()); // reloads the journal from the server
      setMessage({ ok: true, text: 'Identité enregistrée : le nom et le logo sont mis à jour partout.' });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Enregistrement impossible.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <span className="material-symbols-outlined text-[#06B6D4]">palette</span>
        <div>
          <h2 className="text-base font-bold font-title text-slate-900">Identité de l'application</h2>
          <p className="text-xs text-slate-500">Nom et logo affichés dans le menu, la page de connexion, les cartes, les reçus, les bulletins de paie et les rapports.</p>
        </div>
      </div>

      <form onSubmit={save} className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">Nom de l'application *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              required
              placeholder={DEFAULT_BRANDING.appName}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
            />
            <span className="block mt-1 text-[11px] text-slate-400">{name.trim().length}/40 caractères</span>
          </label>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1">Logo</span>
            <PhotoInput
              value={logo || undefined}
              onChange={(v) => setLogo(v || null)}
              maxSize={LOGO_MAX_PX}
              format="png"
              emptyIcon="local_parking"
              fileNameHint={`logo_${name || 'application'}`}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Image carrée de préférence (PNG avec fond transparent idéal). Sans logo, l'icône « P » par défaut est utilisée.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1">NIF</span>
              <input value={nif} onChange={(e) => setNif(e.target.value)} maxLength={40} placeholder="N° d’identification fiscale" className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-[#06B6D4]" />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1">STAT</span>
              <input value={stat} onChange={(e) => setStat(e.target.value)} maxLength={40} placeholder="N° statistique" className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-[#06B6D4]" />
            </label>
            <p className="col-span-2 -mt-1 text-[11px] text-slate-400">Imprimés sur les reçus quand ils sont renseignés.</p>
          </div>

          {message && (
            <p role={message.ok ? 'status' : 'alert'} className={`p-2.5 rounded-lg border text-xs ${message.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-[#DC2626]'}`}>
              {message.text}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving || !dirty || !name.trim()}
              className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            {dirty && (
              <button
                type="button"
                onClick={() => { setName(branding.appName); setLogo(branding.logoUrl); setNif(branding.nif); setStat(branding.stat); setMessage(null); }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
              >
                Annuler les changements
              </button>
            )}
            {(branding.logoUrl || branding.appName !== DEFAULT_BRANDING.appName) && !dirty && (
              <button
                type="button"
                onClick={() => { setName(DEFAULT_BRANDING.appName); setLogo(null); setMessage(null); }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
              >
                Revenir au nom et logo d'origine
              </button>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-2">Aperçu</span>
          <div className="rounded-xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#0F172A] flex items-center gap-3">
              {logo ? (
                <img src={logo} alt="" className="w-9 h-9 rounded-lg object-contain bg-white" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#06B6D4] to-[#0EA5E9] flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-[22px]">local_parking</span>
                </div>
              )}
              <div className="min-w-0">
                <div className="font-headline text-base font-bold text-white truncate">{name.trim() || DEFAULT_BRANDING.appName}</div>
                <div className="font-mono-data text-[10px] text-[#06B6D4] uppercase tracking-wider font-semibold">Gestion centrale</div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex items-center justify-center gap-2 border-t border-slate-200">
              {logo ? (
                <img src={logo} alt="" className="w-7 h-7 rounded-lg object-contain bg-white" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#06B6D4] to-[#0EA5E9] flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-[18px]">local_parking</span>
                </div>
              )}
              <span className="font-headline text-sm font-bold uppercase text-[#0F172A] truncate">{name.trim() || DEFAULT_BRANDING.appName}</span>
              <span className="text-[10px] text-slate-400">· en-tête des reçus</span>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
};
