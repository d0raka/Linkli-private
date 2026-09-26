"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react/ssr";

type Toast = { id: number; message: string; tone?: "danger" };
type ToastApi = { show: (message: string, options?: { tone?: "danger"; duration?: number }) => void };

const ToastContext = createContext<ToastApi | null>(null);

/**
 * For results with no on-screen origin (a save that happened in the background, a copied link).
 * Actions that have a visible control should confirm in place instead.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const show = useCallback<ToastApi["show"]>((message, options = {}) => {
    const id = ++nextId.current;
    setToasts((current) => [...current.slice(-2), { id, message, tone: options.tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), options.duration ?? 4200);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="ui-toast-region" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div className="ui-toast" data-tone={toast.tone} key={toast.id}>
            {toast.tone === "danger" ? <WarningCircle aria-hidden="true" weight="fill" /> : <CheckCircle aria-hidden="true" weight="fill" />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
