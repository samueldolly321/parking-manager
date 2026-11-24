/** Application name and logo, editable in "Paramètres & Audit" and shown everywhere. */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface Branding {
  appName: string;
  /** Image data URL, or null for the default parking icon */
  logoUrl: string | null;
  /** Tax numbers printed on receipts (empty = not printed) */
  nif: string;
  stat: string;
}

export const DEFAULT_BRANDING: Branding = { appName: 'Parking Mada', logoUrl: null, nif: '', stat: '' };

interface BrandingContextValue extends Branding {
  /** Saves on the server, then updates every screen. Throws with a readable message on failure. */
  save: (next: { appName: string; logoUrl?: string | null; nif?: string; stat?: string }) => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue>({ ...DEFAULT_BRANDING, save: async () => {} });

/** Browser tab: title and favicon follow the branding. */
function applyToDocument(b: Branding) {
  document.title = b.appName;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  // The uploaded logo, otherwise the default "P" icon of the application
  link.type = b.logoUrl ? '' : 'image/svg+xml';
  link.href = b.logoUrl || '/favicon.svg';
}

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);

  useEffect(() => {
    fetch('/api/v1/settings/branding')
      .then((r) => (r.ok ? r.json() : DEFAULT_BRANDING))
      .then((b: Branding) => setBranding({ appName: b.appName || DEFAULT_BRANDING.appName, logoUrl: b.logoUrl || null, nif: b.nif || '', stat: b.stat || '' }))
      .catch(() => undefined);
  }, []);

  useEffect(() => applyToDocument(branding), [branding]);

  const save = useCallback(async (next: { appName: string; logoUrl?: string | null; nif?: string; stat?: string }) => {
    let res: Response;
    try {
      res = await fetch('/api/v1/settings/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next)
      });
    } catch {
      throw new Error('Serveur injoignable.');
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error || `Enregistrement impossible (erreur ${res.status}).`);
    setBranding({ appName: body.appName, logoUrl: body.logoUrl || null, nif: body.nif || '', stat: body.stat || '' });
  }, []);

  return <BrandingContext.Provider value={{ ...branding, save }}>{children}</BrandingContext.Provider>;
};

export const useBranding = () => useContext(BrandingContext);

/** The logo (uploaded image, or the default parking icon on a cyan square). */
export const BrandLogo: React.FC<{ size?: number; className?: string; rounded?: string }> = ({ size = 36, className = '', rounded = 'rounded-lg' }) => {
  const { logoUrl, appName } = useBranding();
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`Logo ${appName}`}
        style={{ width: size, height: size }}
        className={`${rounded} object-contain bg-white shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className={`${rounded} bg-gradient-to-tr from-[#06B6D4] to-[#0EA5E9] flex items-center justify-center text-white shrink-0 ${className}`}
      aria-hidden="true"
    >
      <span className="material-symbols-outlined" style={{ fontSize: Math.round(size * 0.6) }}>local_parking</span>
    </div>
  );
};
