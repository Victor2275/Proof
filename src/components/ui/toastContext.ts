import { createContext, useContext } from 'react';

/** How long a toast stays: long enough to read it and reach Undo. */
export const TOAST_MS = 6000;

export interface ToastOptions {
  message: string;
  /** One action, typically Undo. */
  action?: { label: string; onAction: () => void };
  /** `fault` for a report that something failed; never the accent. */
  tone?: 'ink' | 'fault';
  duration?: number;
}

export interface ToastApi {
  show: (options: ToastOptions) => number;
  dismiss: (id?: number) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

const NO_TOASTS: ToastApi = { show: () => 0, dismiss: () => undefined };

/** Shows a toast. Outside a provider it is a no-op, so a screen tested alone does not need one. */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NO_TOASTS;
}
