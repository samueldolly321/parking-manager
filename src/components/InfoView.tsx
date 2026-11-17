import React, { useState } from 'react';
import { APP_INFO, CguContent } from '../content/legal';

type Tab = 'informations' | 'cgu';

/** "Informations & CGU": who made the app, what it does, and the general terms of use. */
export const InfoView: React.FC = () => {
  const [tab, setTab] = useState<Tab>('informations');

  return (
    <div className="flex flex-col w-full space-y-6">
      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono-data text-xs text-slate-500 uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">info</span>
            Pilotage &amp; Système
          </div>
          <h1 className="font-headline text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Informations &amp; Conditions générales</h1>
        </div>
        <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200 self-start" role="tablist" aria-label="Rubriques">
          {([['informations', 'Informations', 'info'], ['cgu', 'Conditions générales', 'gavel']] as [Tab, string, string][]).map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${tab === id ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-600 hover:text-[#0F172A]'}`}
            >
              <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'informations' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Application */}
          <section className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#06B6D4] to-[#0EA5E9] flex items-center justify-center text-white shadow-md shrink-0">
                <span className="material-symbols-outlined text-[32px]">local_parking</span>
              </div>
              <div>
                <h2 className="font-headline text-lg font-bold text-[#0F172A]">{APP_INFO.name}</h2>
                <p className="text-xs text-slate-500">Version {APP_INFO.version} · Gestion centrale multi-sites · Antananarivo (GMT+3)</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              Application web de gestion des parkings : sites et zones, emplacements, membres et véhicules, cartes de membres,
              abonnements, encaissements et reçus en Ariary, trésorerie et dépenses avec photo de facture, paie, personnel et
              planning des gardes 24h, comité de gestion, matériel, incidents, rapports et statistiques exportables.
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                ['Technologies', 'React, TypeScript, Vite, Tailwind CSS, Node.js / Express, PostgreSQL (Drizzle ORM)'],
                ['Sécurité', 'Connexion par email et mot de passe chiffré, session sécurisée, journal d’audit'],
                ['Monnaie et fuseau', 'Ariary malgache (Ar) · Indian/Antananarivo (GMT+3)']
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</dt>
                  <dd className="mt-0.5 text-[#0F172A] break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Creator */}
          <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 sm:p-6 flex flex-col gap-4">
            <h2 className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Créateur de l'application</h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-headline font-bold shrink-0" aria-hidden="true">
                {APP_INFO.creatorName.split(' ').map((p) => p[0]).slice(0, 2).join('')}
              </div>
              <div className="min-w-0">
                <p className="font-headline font-bold text-[#0F172A]">{APP_INFO.creatorName}</p>
                <p className="text-xs text-slate-500">Conception et développement</p>
              </div>
            </div>
            <a
              href={`mailto:${APP_INFO.creatorEmail}`}
              className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-sm text-[#0F172A] hover:bg-slate-50 break-all"
            >
              <span className="material-symbols-outlined text-[18px] text-[#06B6D4] shrink-0">mail</span>
              {APP_INFO.creatorEmail}
            </a>
            <a
              href={`tel:${APP_INFO.creatorPhoneIntl}`}
              className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-sm text-[#0F172A] hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[18px] text-[#06B6D4] shrink-0">call</span>
              <span className="font-mono-data">{APP_INFO.creatorPhone}</span>
            </a>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pour toute question, suggestion ou demande d'assistance concernant l'application, contactez le créateur par email ou par téléphone.
            </p>
            <p className="mt-auto text-[11px] text-slate-400">© {new Date().getFullYear()} {APP_INFO.creatorName}. Tous droits réservés.</p>
          </section>
        </div>
      ) : (
        <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 sm:p-8 max-w-4xl">
          <h2 className="font-headline text-lg font-bold text-[#0F172A] mb-4">Conditions générales d'utilisation</h2>
          <CguContent />
        </section>
      )}
    </div>
  );
};
