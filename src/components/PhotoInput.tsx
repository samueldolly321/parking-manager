import React, { useEffect, useRef, useState } from 'react';

const MAX_SIZE = 480; // px, longest side of the stored photo (default, e.g. member photos)
const JPEG_QUALITY = 0.85;

/** Draws a source (image or video frame) into a canvas, scaled down, and returns a JPEG data URL. */
function toResizedDataUrl(source: CanvasImageSource, width: number, height: number, maxSize = MAX_SIZE, format: 'jpeg' | 'png' = 'jpeg'): string {
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  // PNG keeps transparency (logos); JPEG is lighter for photos
  return format === 'png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

function fileToDataUrl(file: File, maxSize = MAX_SIZE, format: 'jpeg' | 'png' = 'jpeg'): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(toResizedDataUrl(img, img.naturalWidth, img.naturalHeight, maxSize, format));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image illisible'));
    };
    img.src = url;
  });
}

/** Saves a data URL as a file in the browser's download folder. */
export function downloadPhoto(dataUrl: string, fileName: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

interface PhotoInputProps {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  /** Used to name the file when the photo is saved on the PC */
  fileNameHint?: string;
  /** Longest side of the stored image, in px (480 by default; larger for documents) */
  maxSize?: number;
  /** Camera to open: 'user' (front, default) or 'environment' (back, for documents) */
  facingMode?: 'user' | 'environment';
  /** Icon shown when there is no photo yet */
  emptyIcon?: string;
  /** 'png' keeps transparency (logos) */
  format?: 'jpeg' | 'png';
}

export const PhotoInput: React.FC<PhotoInputProps> = ({
  value,
  onChange,
  fileNameHint,
  maxSize = MAX_SIZE,
  facingMode = 'user',
  emptyIcon = 'person',
  format = 'jpeg'
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState('');

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  useEffect(() => () => stopCamera(), []);

  const openCamera = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Caméra non disponible sur ce navigateur. Utilisez « Importer depuis le PC ».');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      });
    } catch {
      setError("Impossible d'accéder à la caméra (autorisation refusée ou aucune caméra détectée).");
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const dataUrl = toResizedDataUrl(video, video.videoWidth, video.videoHeight, maxSize, format);
    onChange(dataUrl);
    stopCamera();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      onChange(await fileToDataUrl(file, maxSize, format));
    } catch {
      setError("Ce fichier n'est pas une image valide.");
    }
  };

  const safeName = (fileNameHint || 'photo-membre').replace(/[^a-z0-9-_]+/gi, '_');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 rounded-lg border border-[#E2E8F0] bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
          {value ? (
            <img src={value} alt="Photo" className={`w-full h-full ${format === 'png' ? 'object-contain' : 'object-cover'}`} />
          ) : (
            <span className="material-symbols-outlined text-slate-300 text-[36px]">{emptyIcon}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openCamera}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">photo_camera</span>
            Prendre une photo
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">upload</span>
            Importer depuis le PC
          </button>
          {value && (
            <>
              <button
                type="button"
                onClick={() => downloadPhoto(value, `${safeName}.${format === 'png' ? 'png' : 'jpg'}`)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">download</span>
                Enregistrer sur le PC
              </button>
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-rose-200 text-rose-600 bg-white hover:bg-rose-50"
              >
                Retirer
              </button>
            </>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {error && <p className="text-[11px] text-rose-600">{error}</p>}

      {cameraOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-4 max-w-md w-full space-y-3">
            <p className="font-headline font-bold text-sm text-[#0F172A]">Prendre une photo</p>
            <video ref={videoRef} playsInline muted className="w-full rounded-lg bg-black aspect-[4/3] object-cover" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={stopCamera} className="px-3 py-2 text-xs font-bold rounded-lg border border-[#E2E8F0]">
                Annuler
              </button>
              <button type="button" onClick={capture} className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0F172A] text-white flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">camera</span>
                Capturer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Small round avatar used in lists. */
export const Avatar: React.FC<{ src?: string; name: string; size?: number }> = ({ src, name, size = 36 }) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return src ? (
    <img src={src} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover border border-[#E2E8F0]" />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-slate-100 border border-[#E2E8F0] flex items-center justify-center text-[11px] font-bold text-slate-500"
    >
      {initials || '?'}
    </div>
  );
};
