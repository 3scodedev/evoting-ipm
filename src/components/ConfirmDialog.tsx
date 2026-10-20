'use client';

import { useEffect, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/Button';
import { cn } from '@/lib/utils';

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  danger = false,
  busy = false,
  requirePassword = false,
  passwordLabel = 'Password',
  passwordPlaceholder,
  passwordHint,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  requirePassword?: boolean;
  passwordLabel?: string;
  passwordPlaceholder?: string;
  passwordHint?: string;
  error?: string;
  onCancel: () => void;
  onConfirm: (password?: string) => void;
}) {
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!open) setPassword('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4 backdrop-blur-sm"
      onClick={onCancel}
      aria-hidden={false}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby="confirm-dialog-desc"
        className="w-full max-w-sm overflow-hidden rounded-[24px] border-2 border-ink bg-white text-ink shadow-hard-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn('h-2', danger ? 'bg-brand-red' : 'bg-brand-sky')} aria-hidden />
        <div className="p-6">
          <div
            className={cn(
              'mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-ink shadow-hard-sm',
              danger ? 'bg-brand-red text-white' : 'bg-brand-yellow text-ink'
            )}
          >
            <TriangleAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-center font-[family-name:var(--font-display)] text-xl font-extrabold tracking-tight">
            {title}
          </h2>
          <p id="confirm-dialog-desc" className="mt-1.5 text-center text-sm font-medium leading-relaxed text-ink/60">
            {message}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (busy) return;
              onConfirm(requirePassword ? password : undefined);
            }}
          >
            {requirePassword && (
              <div className="mt-4 text-left">
                <label className="app-label" htmlFor="confirm-password">
                  {passwordLabel}
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="app-input mt-1.5"
                  placeholder={passwordPlaceholder}
                  autoComplete="current-password"
                  autoFocus
                  required
                  disabled={busy}
                />
                {passwordHint && (
                  <p className="mt-1.5 text-[11px] font-medium text-ink/50">{passwordHint}</p>
                )}
              </div>
            )}
            {error && (
              <p
                role="alert"
                className="mt-3 rounded-xl border-2 border-brand-red/30 bg-brand-red/5 px-3 py-2 text-center text-xs font-bold text-brand-red"
              >
                {error}
              </p>
            )}
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <Button type="button" variant="secondary" onClick={onCancel} disabled={busy} autoFocus={!requirePassword}>
                {cancelLabel}
              </Button>
              <Button type="submit" variant={danger ? 'danger' : 'primary'} loading={busy}>
                {confirmLabel}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
