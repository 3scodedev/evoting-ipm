'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tombol Kunci layar untuk bilik suara.
 *
 * - Klik "Kunci" → masuk mode layar penuh (fullscreen) + status terkunci.
 * - Keluar HANYA lewat kombinasi Ctrl+C+B (tahan Ctrl, tekan C lalu B).
 * - Esc tetap bisa keluar dari fullscreen (dibatasi browser), tapi kunci
 *   layar tetap aktif: overlay "Layar Terkunci" menahan sampai kombinasi
 *   ditekan; ketuk overlay untuk kembali ke layar penuh.
 */
export function ScreenLock() {
  const [locked, setLocked] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const lockedRef = useRef(false);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  const unlock = useCallback(() => {
    setLocked(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Sinkronkan status fullscreen; kalau keluar tak sengaja (Esc) → coba masuk lagi
  useEffect(() => {
    const onChange = () => {
      const fs = !!document.fullscreenElement;
      setFullscreen(fs);
      if (!fs && lockedRef.current) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Kombinasi rahasia: tahan Ctrl, tekan C lalu B (selisih < 1,2 dtk)
  useEffect(() => {
    if (!locked) return;
    let tC = 0;
    let tB = 0;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      const k = e.key.toLowerCase();
      if (k === 'c') {
        e.preventDefault();
        tC = Date.now();
      } else if (k === 'b') {
        e.preventDefault();
        tB = Date.now();
      } else {
        return;
      }
      if (tC && tB && Math.abs(tC - tB) < 1200) unlock();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        tC = 0;
        tB = 0;
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, [locked, unlock]);

  // Blokir klik kanan selama terkunci
  useEffect(() => {
    if (!locked) return;
    const noCtx = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', noCtx);
    return () => document.removeEventListener('contextmenu', noCtx);
  }, [locked]);

  async function lock() {
    try {
      await document.documentElement.requestFullscreen();
      setFullscreen(!!document.fullscreenElement);
      setLocked(true);
    } catch {
      // browser menolak / tidak mendukung fullscreen → biarkan normal
    }
  }

  function refullscreen() {
    document.documentElement.requestFullscreen().catch(() => {});
  }

  return (
    <>
      <button
        type="button"
        disabled={locked}
        onClick={lock}
        aria-label={locked ? 'Layar terkunci' : 'Kunci layar penuh'}
        title={locked ? 'Layar terkunci' : 'Layar penuh & kunci layar'}
        className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-default disabled:border-amber-300/40 disabled:bg-amber-400/10 disabled:text-amber-200"
      >
        <LockIcon open={!locked} />
        {locked ? 'Terkunci' : 'Kunci'}
      </button>

      {locked && !fullscreen && (
        <button
          type="button"
          onClick={refullscreen}
          className="fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center gap-3 bg-green-950/95 p-6 text-center select-none"
        >
          <LockIcon open={false} className="h-14 w-14 text-amber-400" />
          <span className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Layar Terkunci
          </span>
          <span className="text-sm text-green-200">Ketuk layar untuk kembali ke layar penuh.</span>
        </button>
      )}
    </>
  );
}

function LockIcon({ open, className = 'h-4 w-4' }: { open: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
      {open ? <path d="M8 10.5V7a4 4 0 0 1 7.5-1.8" /> : <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />}
    </svg>
  );
}
