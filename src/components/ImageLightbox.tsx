import React, { useEffect, useState } from 'react';

/**
 * Full-screen viewer for photos. Any <img data-zoom="true"> in the app opens here when clicked
 * (the click does not also select the row or card behind the photo). Escape or a click closes it.
 */
export const ImageLightbox: React.FC = () => {
  const [image, setImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const img = (e.target as HTMLElement | null)?.closest?.('img[data-zoom="true"]') as HTMLImageElement | null;
      if (!img || !img.src) return;
      e.preventDefault();
      e.stopPropagation(); // capture phase: the row / card behind is not clicked
      setImage({ src: img.src, alt: img.alt || '' });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    if (!image) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setImage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [image]);

  if (!image) return null;
  return (
    <div
      className="fixed inset-0 z-[90] bg-black/85 flex flex-col items-center justify-center p-4 cursor-zoom-out"
      onClick={() => setImage(null)}
      role="dialog"
      aria-label={image.alt || 'Photo'}
    >
      <button
        type="button"
        onClick={() => setImage(null)}
        aria-label="Fermer"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
      >
        <span className="material-symbols-outlined">close</span>
      </button>
      <img src={image.src} alt={image.alt} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl bg-white" />
      {image.alt && <p className="mt-3 text-sm text-white/90 text-center">{image.alt}</p>}
    </div>
  );
};
