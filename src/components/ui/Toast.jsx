import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Award, CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';

export const ToastContext = createContext(null);

const toastStyles = {
  success: {
    icon: CheckCircle2,
    className: 'border-shadow-green/30 bg-shadow-green/15 text-shadow-green',
  },
  error: {
    icon: XCircle,
    className: 'border-shadow-red/30 bg-shadow-red/15 text-shadow-red',
  },
  warning: {
    icon: TriangleAlert,
    className: 'border-shadow-gold/30 bg-shadow-gold/15 text-shadow-gold',
  },
  achievement: {
    icon: Award,
    className: 'border-shadow-purple/40 bg-shadow-purple/20 text-shadow-purpleLight shadow-purpleGlow',
  },
  info: {
    icon: Info,
    className: 'border-shadow-cyan/30 bg-shadow-cyan/10 text-shadow-cyan',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const dismissToast = useCallback((toastId) => {
    setToasts((currentToasts) => currentToasts?.filter((toast) => toast?.id !== toastId));
  }, []);

  const showToast = useCallback((toast) => {
    counterRef.current += 1;
    const nextToast = {
      id: `toast-${Date.now()}-${counterRef?.current}`,
      type: toast?.type || 'info',
      title: toast?.title || 'Shadow Ascent',
      message: toast?.message || '',
      duration: Number.isFinite(Number(toast?.duration)) ? Number(toast?.duration) : 4200,
    };

    setToasts((currentToasts) => [nextToast, ...(currentToasts || [])].slice(0, 5));
    return nextToast?.id;
  }, []);

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      dismissToast,
      success: (message, title = 'Victory') => showToast({ type: 'success', title, message }),
      error: (message, title = 'Ward Interrupted') => showToast({ type: 'error', title, message }),
      warning: (message, title = 'Caution') => showToast({ type: 'warning', title, message }),
      achievement: (message, title = 'Achievement Unlocked') => showToast({ type: 'achievement', title, message, duration: 5600 }),
    }),
    [dismissToast, showToast, toasts],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport dismissToast={dismissToast} toasts={toasts} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts = [], dismissToast }) {
  const empty = !toasts?.length;

  if (empty) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
      {toasts?.map((toast) => (
        <ToastItem dismissToast={dismissToast} key={toast?.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, dismissToast }) {
  const style = toastStyles?.[toast?.type] || toastStyles?.info;
  const Icon = style?.icon || Info;

  useEffect(() => {
    if (!toast?.duration) {
      return undefined;
    }

    const timer = globalThis?.setTimeout?.(() => {
      dismissToast?.(toast?.id);
    }, toast?.duration);

    return () => {
      globalThis?.clearTimeout?.(timer);
    };
  }, [dismissToast, toast?.duration, toast?.id]);

  return (
    <article className={`pointer-events-auto glass-card border p-4 ${style?.className}`} role="status">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-sm font-bold text-shadow-gold">{toast?.title}</h3>
          {toast?.message ? <p className="mt-1 text-sm leading-5 text-shadow-textSecondary">{toast?.message}</p> : null}
        </div>
        <button
          aria-label="Dismiss notification"
          className="rounded-lg border border-white/10 p-1 text-shadow-textMuted transition hover:border-shadow-gold/30 hover:text-shadow-gold"
          onClick={() => dismissToast?.(toast?.id)}
          type="button"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

export { ToastViewport };
