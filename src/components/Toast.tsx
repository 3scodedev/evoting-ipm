'use client';

import { useCallback, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastTone = 'success' | 'error';
export type ToastItem = { id: number; tone: ToastTone; text: string };

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, text: string) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-2), { id, tone, text }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return { toasts, push, dismiss };
}

export function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-24 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2.5 md:bottom-5" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'flex items-start gap-2.5 rounded-2xl border-2 border-ink bg-white px-4 py-3 text-sm font-semibold text-ink shadow-hard',
            t.tone === 'error' && 'bg-[#fff3f1]'
          )}
        >
          {t.tone === 'success' ? (
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-ink bg-brand-sky">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          ) : (
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-ink bg-brand-red text-white">
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          )}
          <span className="flex-1">{t.text}</span>
          <button
            onClick={() => onDismiss(t.id)}
            aria-label="Tutup notifikasi"
            className="rounded-full p-0.5 text-ink/50 transition hover:bg-brand-yellow hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
