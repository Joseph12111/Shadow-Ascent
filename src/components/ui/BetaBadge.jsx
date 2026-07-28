import { Sparkles } from 'lucide-react';

export default function BetaBadge({ compact = false, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-shadow-purple/35 bg-shadow-purple/10 font-semibold uppercase text-shadow-purpleLight ${
        compact ? 'px-2 py-1 text-[0.6rem]' : 'px-3 py-1.5 text-xs'
      } ${className}`}
    >
      <Sparkles className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden="true" />
      Beta
    </span>
  );
}
