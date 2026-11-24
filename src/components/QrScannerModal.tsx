import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { MembershipCard, Member } from '../types';
import { CardVerification, recordCardPassage, verifyCardCode } from '../services/storage';
import { can } from '../services/access';
import { notify } from '../services/notify';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: MembershipCard[];
  members: Member[];
}

const GATE_KEY = 'pm_scanner_gate';
const AUTO_KEY = 'pm_scanner_auto';
/** The same card is not read again during this delay (ms). */
const SAME_CODE_PAUSE = 4000;

/**
 * Card check at a gate: the camera reads the QR code on the card (or the card number is typed),
 * the server says whether it is accepted, and the passage can be recorded on the card.
 */
export const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return <ScannerDialog onClose={onClose} />;
};

const ScannerDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const busyRef = useRef(false);

  const [cameraState, setCameraState] = useState<'starting' | 'on' | 'off' | 'error'>('starting');
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<(CardVerification & { code: string; recorded?: boolean }) | null>(null);
  const [checking, setChecking] = useState(false);
  const [gate, setGate] = useState(() => localStorage.getItem(GATE_KEY) || 'Entrée principale');
  const [autoRecord, setAutoRecord] = useState(() => localStorage.getItem(AUTO_KEY) !== 'non');
  const canRecord = can('write');

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const record = useCallback(
    async (card: MembershipCard) => {
      try {
        await recordCardPassage(card.id, gate);
        setResult((r) => (r && r.card?.id === card.id ? { ...r, recorded: true } : r));
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Passage non enregistré.', 'error');
      }
    },
    [gate]
  );

  /** Checks a code (scanned or typed) on the server. */
  const check = useCallback(
    async (code: string) => {
      const value = code.trim();
      if (!value || busyRef.current) return;
      busyRef.current = true;
      setChecking(true);
      try {
        const r = await verifyCardCode(value);
        setResult({ ...r, code: value });
        if (r.valid && r.card && autoRecord && canRecord) await record(r.card);
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Vérification impossible.', 'error');
      } finally {
        busyRef.current = false;
        setChecking(false);
      }
    },
    [autoRecord, canRecord, record]
  );

  // Camera + reading loop
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const scan = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!cancelled && video && canvas && video.readyState >= 2 && video.videoWidth) {
        // A reduced frame is enough and keeps the reading fast
        const scale = Math.min(1, 640 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
          const now = Date.now();
          if (qr?.data && !(qr.data === lastRef.current.code && now - lastRef.current.at < SAME_CODE_PAUSE)) {
            lastRef.current = { code: qr.data, at: now };
            if (navigator.vibrate) navigator.vibrate(80);
            void check(qr.data);
          }
        }
      }
      if (!cancelled) timer = window.setTimeout(scan, 200);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('error');
        setCameraError('Ce navigateur ne donne pas accès à la caméra (il faut une adresse en https ou localhost).');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setCameraState('on');
        scan();
      } catch (err) {
        setCameraState('error');
        const name = (err as { name?: string })?.name;
        setCameraError(
          name === 'NotAllowedError'
            ? 'Accès à la caméra refusé. Autorisez la caméra pour ce site dans le navigateur, ou saisissez le numéro de carte.'
            : name === 'NotFoundError'
            ? 'Aucune caméra trouvée sur cet appareil. Saisissez le numéro de carte.'
            : 'Caméra indisponible. Saisissez le numéro de carte.'
        );
      }
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      stopCamera();
    };
  }, [check, stopCamera]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const changeGate = (v: string) => {
    setGate(v);
    localStorage.setItem(GATE_KEY, v);
  };
  const changeAuto = (v: boolean) => {
    setAutoRecord(v);
    localStorage.setItem(AUTO_KEY, v ? 'oui' : 'non');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3 max-h-[95vh] overflow-y-auto text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
          <h3 className="font-headline text-base font-bold text-[#0F172A] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#06B6D4]">qr_code_scanner</span>
            Contrôle des cartes
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-[#0F172A]" aria-label="Fermer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Camera */}
        <div className="relative w-full aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
          <video ref={videoRef} playsInline muted className={`absolute inset-0 w-full h-full object-cover ${cameraState === 'on' ? '' : 'hidden'}`} />
          <canvas ref={canvasRef} className="hidden" />
          {cameraState === 'on' && <div className="absolute w-48 h-48 border-2 border-[#06B6D4] rounded-xl pointer-events-none" />}
          {cameraState === 'starting' && <span className="text-slate-300">Ouverture de la caméra…</span>}
          {cameraState === 'error' && <p className="px-6 text-center text-slate-300">{cameraError}</p>}
          {cameraState === 'on' && (
            <span className="absolute bottom-2 px-3 py-1 rounded-full bg-black/60 text-slate-200 text-[11px]">
              {checking ? 'Vérification…' : 'Présentez le QR code au dos de la carte'}
            </span>
          )}
        </div>

        {/* Manual entry */}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void check(manualCode);
          }}
        >
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Ou saisir le n° de carte (CRD-…)"
            className="flex-1 p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] font-mono-data uppercase"
          />
          <button type="submit" disabled={!manualCode.trim() || checking} className="px-3 rounded-lg bg-[#0F172A] text-white font-bold disabled:opacity-50">
            Vérifier
          </button>
        </form>

        {/* Result */}
        {result && (
          <div className={`p-3.5 rounded-xl border-2 ${result.valid ? 'bg-emerald-50 border-emerald-400' : 'bg-rose-50 border-rose-400'}`}>
            <div className={`font-headline text-xl font-black ${result.valid ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
              {result.valid ? '✓ ' : '✗ '}
              {result.label}
            </div>
            {result.card && (
              <div className="mt-1 space-y-0.5 text-[#0F172A]">
                <div className="font-bold text-sm">{result.card.memberName}</div>
                <div className="font-mono-data">
                  {result.card.cardNumber} · {result.card.primaryPlate}
                  {result.card.secondaryPlate ? ` / ${result.card.secondaryPlate}` : ''}
                </div>
                <div className="text-slate-500">{result.card.siteName}</div>
              </div>
            )}
            <div className="mt-1 text-slate-600">{result.message}</div>
            {result.valid && result.card && canRecord && (
              <div className="mt-2">
                {result.recorded ? (
                  <span className="text-[11px] font-bold text-emerald-700">Passage enregistré — {gate}</span>
                ) : (
                  <button type="button" onClick={() => result.card && record(result.card)} className="px-3 py-1.5 rounded-lg bg-[#16A34A] text-white font-bold">
                    Enregistrer le passage
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Checkpoint */}
        {canRecord && (
          <div className="grid grid-cols-2 gap-2 items-end pt-1 border-t border-[#E2E8F0]">
            <label className="block">
              <span className="block text-[10px] font-semibold text-slate-500 mb-1">Point de contrôle</span>
              <input value={gate} onChange={(e) => changeGate(e.target.value)} maxLength={100} className="w-full p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]" />
            </label>
            <label className="flex items-center gap-2 pb-2 text-[11px] text-slate-600">
              <input type="checkbox" checked={autoRecord} onChange={(e) => changeAuto(e.target.checked)} />
              Enregistrer les passages automatiquement
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
