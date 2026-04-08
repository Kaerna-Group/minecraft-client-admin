import type { PropsWithChildren } from 'react';

type SectionHintProps = PropsWithChildren<{
  tone?: 'info' | 'warning';
}>;

export function SectionHint({ children, tone = 'info' }: SectionHintProps) {
  const className = tone === 'warning'
    ? 'border-amber-300/30 bg-amber-500/10 text-amber-100'
    : 'border-accent-300/20 bg-accent-300/5 text-slate-200';

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${className}`}>{children}</div>;
}
