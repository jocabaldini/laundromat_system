'use client';

import { useEffect } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

const styles: Record<ToastVariant, { wrap: string; dot: string }> = {
  success: { wrap: 'bg-slate-900 text-white', dot: 'bg-emerald-400' },
  error: { wrap: 'bg-slate-900 text-white', dot: 'bg-rose-400' },
  info: { wrap: 'bg-slate-900 text-white', dot: 'bg-sky-400' },
};

export function Toast({
  open,
  message,
  onClose,
  variant = 'info',
  durationMs = 2500,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
  variant?: ToastVariant;
  durationMs?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, durationMs);
    return () => clearTimeout(t);
  }, [open, onClose, durationMs]);

  if (!open) return null;

  const s = styles[variant];

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <div
        className={[
          'flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg ring-1 ring-black/10',
          'animate-in fade-in slide-in-from-bottom-2 duration-200',
          s.wrap,
        ].join(' ')}
        role="status"
        aria-live="polite"
      >
        <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
        <span className="text-sm font-medium">{message}</span>

        <button
          onClick={onClose}
          className="ml-2 rounded-md px-2 py-1 text-xs text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="Fechar notificação"
          type="button"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
