'use client';

import { useEffect, useRef, useState } from 'react';
import { Crop, ZoomIn } from 'lucide-react';
import { Button } from '@/components/Button';

const ASPECT = 4 / 3;
const MAX_OUTPUT_WIDTH = 1000; // server tetap resize ke ≤800px, jadi 1000px cukup

type Size = { w: number; h: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Crop foto kandidat ke rasio 4:3 sebelum dikirim ke server.
 * Hasil canvas berupa JPEG agar kompatibel dengan alur upload yang sudah ada.
 */
export function ImageCropDialog({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
}) {
  const [url, setUrl] = useState('');
  const [natural, setNatural] = useState<Size>({ w: 0, h: 0 });
  const [viewport, setViewport] = useState<Size>({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  // Object URL selalu dibersihkan saat dialog ditutup / file berganti.
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    setNatural({ w: 0, h: 0 });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  // Ukuran viewport mengikuti lebar panel (responsif).
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setViewport((prev) =>
        Math.abs(prev.w - rect.width) < 0.5 && Math.abs(prev.h - rect.height) < 0.5
          ? prev
          : { w: rect.width, h: rect.height }
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const baseScale =
    natural.w > 0 && viewport.w > 0 ? Math.max(viewport.w / natural.w, viewport.h / natural.h) : 1;
  const displayW = natural.w * baseScale * zoom;
  const displayH = natural.h * baseScale * zoom;

  function clampOffset(x: number, y: number) {
    const maxX = Math.max(0, (displayW - viewport.w) / 2);
    const maxY = Math.max(0, (displayH - viewport.h) / 2);
    return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  }

  // Jaga supaya foto selalu menutup area crop saat zoom berubah.
  useEffect(() => {
    setOffset((prev) => clampOffset(prev.x, prev.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, viewport.w, viewport.h, natural.w, natural.h]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !processing) onCancel();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onCancel, processing]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (processing) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: offset.x,
      baseY: offset.y,
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setOffset(
      clampOffset(drag.baseX + (e.clientX - drag.startX), drag.baseY + (e.clientY - drag.startY))
    );
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  }

  async function handleConfirm() {
    const img = imgRef.current;
    if (!img || !natural.w || !viewport.w || processing) return;

    setProcessing(true);
    setError('');
    try {
      const sourceScale = displayW / natural.w;
      const sourceX = (displayW / 2 - viewport.w / 2 - offset.x) / sourceScale;
      const sourceY = (displayH / 2 - viewport.h / 2 - offset.y) / sourceScale;
      const sourceW = viewport.w / sourceScale;
      const sourceH = viewport.h / sourceScale;
      const outW = Math.max(1, Math.min(MAX_OUTPUT_WIDTH, Math.round(sourceW)));
      const outH = Math.max(1, Math.round(outW / ASPECT));

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Browser tidak mendukung canvas.');

      // JPEG tidak menyimpan transparansi — beri alas putih agar hasil tidak hitam.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);
      ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, outW, outH);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92)
      );
      if (!blob) throw new Error('Gagal membuat file hasil crop.');

      const baseName = file.name.replace(/\.[^.]+$/, '') || 'foto';
      onConfirm(
        new File([blob], `${baseName}-crop.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses foto.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-[24px] border-2 border-ink bg-white text-ink shadow-hard-lg">
        <div className="flex items-start gap-3 border-b-2 border-ink/10 p-4">
          <span className="app-icon bg-brand-yellow">
            <Crop className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="crop-title" className="font-[family-name:var(--font-display)] font-extrabold tracking-tight">Atur Crop Foto</h2>
            <p className="text-xs font-medium text-ink/50">
              Rasio 4:3 — geser dan zoom agar pas di kartu kandidat.
            </p>
          </div>
        </div>

        <div className="p-4">
          <div
            ref={viewportRef}
            className="relative aspect-[4/3] w-full cursor-grab touch-none select-none overflow-hidden rounded-xl border-2 border-ink bg-ink active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            aria-label="Area crop foto"
          >
            {url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={url}
                alt=""
                draggable={false}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setNatural({ w: img.naturalWidth, h: img.naturalHeight });
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
                className="absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  width: displayW || undefined,
                  height: displayH || undefined,
                  transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                }}
              />
            )}
            {!natural.w && (
              <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white/70">
                Memuat foto…
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 border-2 border-white/90">
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/35" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white/35" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/35" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white/35" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <ZoomIn className="h-4 w-4 shrink-0 text-ink/40" aria-hidden="true" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-brand-sky"
              aria-label="Zoom foto"
            />
            <span className="w-10 shrink-0 text-right font-mono text-xs font-bold text-ink/45">
              {zoom.toFixed(1)}x
            </span>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm font-semibold text-brand-red">
              {error}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 border-t-2 border-ink/10 p-4">
          <Button variant="secondary" onClick={onCancel} disabled={processing}>
            Batal
          </Button>
          <Button onClick={handleConfirm} loading={processing} disabled={!natural.w}>
            Pakai Foto
          </Button>
        </div>
      </div>
    </div>
  );
}
