import React from 'react';
import QRCode from 'qrcode';

/** Real, scannable QR code (cards, receipts). */
export const QrCodeSvg: React.FC<{ value: string; className?: string; style?: React.CSSProperties }> = ({ value, className, style }) => {
  const path = React.useMemo(() => {
    if (!value) return { size: 1, d: '' };
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const { size, data } = qr.modules;
    let d = '';
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[y * size + x]) d += `M${x} ${y}h1v1h-1z`;
    return { size, d };
  }, [value]);
  return (
    <svg className={className} style={style} viewBox={`-1 -1 ${path.size + 2} ${path.size + 2}`} shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR code">
      <rect x={-1} y={-1} width={path.size + 2} height={path.size + 2} fill="white" />
      <path d={path.d} fill="#0F172A" />
    </svg>
  );
};
