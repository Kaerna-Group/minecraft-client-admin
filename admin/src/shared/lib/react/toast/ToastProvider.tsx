import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { ToastContext, type ToastInput, type ToastTone } from './context';

type ToastRecord = ToastInput & {
  id: string;
  tone: ToastTone;
};

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const pushToast = useCallback((toast: ToastInput) => {
    const nextToast: ToastRecord = {
      id: crypto.randomUUID(),
      tone: toast.tone ?? 'success',
      title: toast.title,
      description: toast.description,
    };

    setToasts((current) => [...current, nextToast]);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const latestToast = toasts[toasts.length - 1];
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== latestToast.id));
    }, 3500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toasts]);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              'pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl',
              toast.tone === 'success'
                ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-50'
                : 'border-rose-400/30 bg-rose-500/10 text-rose-50',
            ].join(' ')}
          >
            <div className="text-sm font-semibold">{toast.title}</div>
            {toast.description ? <div className="mt-1 text-sm opacity-90">{toast.description}</div> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
