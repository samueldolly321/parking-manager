import React, { useState } from 'react';
import { MembershipCard, Member } from '../types';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: MembershipCard[];
  members: Member[];
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  cards,
  members
}) => {
  if (!isOpen) return null;

  const [scanResult, setScanResult] = useState<{
    valid: boolean;
    token: string;
    card?: MembershipCard;
    member?: Member;
    message: string;
  }>({
    valid: true,
    token: 'uuid:e8f9-4b12-98a0-22c3',
    card: cards[0],
    member: members[0],
    message: 'Signature Cryptographique Vérifiée. Titulaire autorisé.'
  });

  const [gateStatus, setGateStatus] = useState<'idle' | 'opening' | 'open'>('idle');

  const handleTestToken = (token: string) => {
    const card = cards.find(c => c.qrToken === token);
    if (card) {
      const member = members.find(m => m.id === card.memberId);
      const isValid = card.status === 'actif';
      setScanResult({
        valid: isValid,
        token,
        card,
        member,
        message: isValid
          ? `Titulaire : ${card.memberName} · Statut : VALIDE (${card.siteName})`
          : `CARTE EN OPPOSITION / PERDUE (#${card.cardNumber})`
      });
    } else {
      setScanResult({
        valid: false,
        token,
        message: 'Jeton QR inconnu ou non signé par l\'autorité de certification PMM.'
      });
    }
  };

  const handleOpenGate = () => {
    setGateStatus('opening');
    setTimeout(() => {
      setGateStatus('open');
      setTimeout(() => {
        setGateStatus('idle');
      }, 4000);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 border border-[#E2E8F0]">
        <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center text-[#06B6D4]">
              <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
            </div>
            <div>
              <h3 className="font-headline text-base font-bold text-[#0F172A]">Contrôleur de Validité QR Code</h3>
              <p className="text-xs text-slate-500">Décryptage cryptographique instantané de la carte PVC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded text-slate-400 hover:text-[#0F172A]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Simulated Camera Viewfinder */}
        <div className="w-full h-56 bg-slate-900 rounded-xl relative overflow-hidden flex flex-col items-center justify-center text-white">
          <div className="w-40 h-40 border-2 border-[#06B6D4]/80 rounded-xl relative flex items-center justify-center">
            <div className="absolute inset-0 bg-[#06B6D4]/5 animate-pulse"></div>
            {/* Animated Laser Scanning Beam */}
            <div className="w-full h-0.5 bg-[#06B6D4] shadow-[0_0_8px_#06B6D4] absolute top-1/2 -translate-y-1/2 animate-bounce"></div>
          </div>
          <div className="absolute bottom-3 font-mono-data text-[11px] bg-black/60 px-3 py-1 rounded-full text-slate-300">
            Viser le QR Code au verso de la carte PVC
          </div>
        </div>

        {/* Quick Sample Selector to test valid vs blocked cards */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 text-[10px] uppercase font-semibold">Simuler scan carte :</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => handleTestToken('uuid:e8f9-4b12-98a0-22c3')}
              type="button"
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 font-mono-data text-[10px] text-slate-700 font-bold"
            >
              Carte Andry (Valide)
            </button>
            <button
              onClick={() => handleTestToken('uuid:dd88-1102-ff55-90ab')}
              type="button"
              className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 font-mono-data text-[10px] text-red-700 font-bold"
            >
              Carte Jean-Luc (Perdue/Bloquée)
            </button>
          </div>
        </div>

        {/* Decrypted Verification Payload Box */}
        <div
          className={`p-3.5 rounded-xl flex items-start gap-3 border ${
            scanResult.valid ? 'bg-[#F8FAFC] border-emerald-300' : 'bg-red-50 border-red-300'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[22px] ${
              scanResult.valid ? 'text-[#16A34A]' : 'text-[#DC2626]'
            }`}
          >
            {scanResult.valid ? 'check_circle' : 'cancel'}
          </span>
          <div className="flex-1 text-xs space-y-1">
            <div className={`font-headline font-bold ${scanResult.valid ? 'text-[#0F172A]' : 'text-[#DC2626]'}`}>
              {scanResult.valid ? 'Signature Cryptographique Vérifiée' : 'Alerte : Accès Refusé'}
            </div>
            <div className="font-mono-data text-[11px] text-slate-500">
              Payload : <code className="text-[#06B6D4] font-bold">{scanResult.token}</code>
            </div>
            <div className="text-slate-700 text-xs font-medium">
              {scanResult.message}
            </div>
          </div>
        </div>

        {/* Gate feedback animation */}
        {gateStatus !== 'idle' && (
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-800 animate-pulse">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#16A34A]">sensor_door</span>
              {gateStatus === 'opening' ? 'Envoi signal impulsion automate...' : 'BARRIÈRE OUVERTE — PASSAGE LIBRE'}
            </span>
            <span className="font-mono-data text-[10px]">RELAIS #B1-OK</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-headline font-bold"
          >
            Fermer
          </button>
          <button
            onClick={handleOpenGate}
            type="button"
            disabled={!scanResult.valid || gateStatus !== 'idle'}
            className="px-4 py-2 rounded-lg bg-[#06B6D4] text-[#0F172A] hover:bg-[#0891B2] hover:text-white transition-all text-xs font-headline font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Forcer Ouverture Barrière</span>
          </button>
        </div>
      </div>
    </div>
  );
};
