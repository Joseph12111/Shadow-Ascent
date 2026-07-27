import { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button.jsx';

export default function Modal({
  open = false,
  title,
  description,
  children,
  onClose,
  loading = false,
  error = null,
  empty = false,
  emptyText = 'Nothing to review yet.',
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    globalThis.__shadowAscentOverlayCount = Number(globalThis?.__shadowAscentOverlayCount || 0) + 1;
    globalThis?.dispatchEvent?.(new CustomEvent('shadowAscentOverlayChange', { detail: { count: globalThis?.__shadowAscentOverlayCount } }));

    return () => {
      globalThis.__shadowAscentOverlayCount = Math.max(0, Number(globalThis?.__shadowAscentOverlayCount || 0) - 1);
      globalThis?.dispatchEvent?.(new CustomEvent('shadowAscentOverlayChange', { detail: { count: globalThis?.__shadowAscentOverlayCount } }));
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-hidden bg-black/70 px-4 py-4 backdrop-blur-sm sm:items-center sm:py-8" role="dialog" aria-modal="true">
      <section className="glass-card max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-hidden sm:max-h-[90vh]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-3 sm:py-4">
          <div>
            {title ? <h2 className="font-heading text-2xl font-bold text-shadow-gold">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-shadow-textSecondary">{description}</p> : null}
          </div>
          <Button aria-label="Close modal" onClick={onClose} size="icon" variant="ghost">
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </header>

        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto p-4 sm:max-h-[70vh] sm:p-5">
          {loading ? <div className="py-10 text-center text-sm text-shadow-textSecondary">Loading...</div> : null}
          {!loading && error ? <div className="rounded-xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm text-shadow-textSecondary">This window could not be loaded.</div> : null}
          {!loading && !error && empty ? <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-shadow-textSecondary">{emptyText}</div> : null}
          {!loading && !error && !empty ? children : null}
        </div>
      </section>
    </div>
  );
}
