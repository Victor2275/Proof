import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { TOAST_MS, ToastContext, type ToastOptions } from './toastContext';

/*
 * A one-line report of something that just happened, with a way back.
 *
 * "Recipe deleted · Undo". It replaces the confirmation that used to stand in
 * front of a destructive action: the action happens at once, and the toast
 * holds the door open for six seconds. The timer pauses while the pointer is
 * over the toast or focus is inside it, so reaching for Undo never races it.
 *
 * It is announced politely: it reports, it does not interrupt. It sits above
 * the phone's tab bar, and one toast at a time — a newer report replaces the
 * older one rather than stacking a tower of them over the page.
 */

interface ToastEntry extends ToastOptions {
  id: number;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastEntry | null>(null);
  const nextId = useRef(1);

  const show = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    setToast({ ...options, id });
    return id;
  }, []);

  const dismiss = useCallback((id?: number) => {
    setToast((current) => (id === undefined || current?.id === id ? null : current));
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        // The live region is always present, so a screen reader is already
        // listening when the first report arrives.
        <div
          role="status"
          aria-live="polite"
          className="toast-dock pointer-events-none fixed inset-x-0 z-[90] flex justify-center px-4 md:justify-start md:px-6 print:hidden"
        >
          {toast ? <ToastView key={toast.id} toast={toast} onDone={() => dismiss(toast.id)} /> : null}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDone }: { toast: ToastEntry; onDone: () => void }) {
  const [held, setHeld] = useState(false);
  const [shown, setShown] = useState(false);
  // What is left of the six seconds, kept across pauses.
  const remaining = useRef(toast.duration ?? TOAST_MS);
  const startedAt = useRef(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (held) return;
    startedAt.current = Date.now();
    const timer = setTimeout(onDone, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [held, onDone]);

  return (
    <div
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false);
      }}
      className={cn(
        'pointer-events-auto flex min-h-12 w-full max-w-md items-center gap-2 rounded-panel bg-ink py-1 pl-4 pr-1 text-paper shadow-[var(--lift-sheet)]',
        'transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
      )}
    >
      <p className={cn('min-w-0 flex-1 py-2 text-[0.9375rem]', toast.tone === 'fault' && 'font-medium')}>
        {toast.tone === 'fault' ? <span className="sr-only">Problem: </span> : null}
        {toast.message}
      </p>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action?.onAction();
            onDone();
          }}
          className="pressable min-h-11 shrink-0 rounded-control px-3 font-sans text-[0.9375rem] font-semibold text-paper underline-offset-4 hover:bg-paper/10 focus-visible:outline-paper"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onDone}
        aria-label="Dismiss"
        className="pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-paper/80 hover:bg-paper/10 hover:text-paper"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
