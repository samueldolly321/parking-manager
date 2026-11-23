import React, { useEffect, useState } from 'react';
import { Notice, dismissNotice, subscribeNotices } from '../services/notify';

const STYLES: Record<Notice['kind'], { box: string; icon: string }> = {
  error: { box: 'bg-rose-50 border-rose-200 text-rose-800', icon: 'error' },
  success: { box: 'bg-emerald-50 border-emerald-200 text-emerald-800', icon: 'check_circle' },
  info: { box: 'bg-white border-[#E2E8F0] text-[#0F172A]', icon: 'info' }
};

export const Toaster: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  useEffect(() => subscribeNotices(setNotices), []);

  if (notices.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)]" role="status" aria-live="polite">
      {notices.map((n) => (
        <div key={n.id} className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border shadow-lg text-sm ${STYLES[n.kind].box}`}>
          <span className="material-symbols-outlined text-[18px] mt-0.5">{STYLES[n.kind].icon}</span>
          <span className="flex-1">{n.message}</span>
          <button type="button" onClick={() => dismissNotice(n.id)} aria-label="Fermer" className="opacity-60 hover:opacity-100">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      ))}
    </div>
  );
};
