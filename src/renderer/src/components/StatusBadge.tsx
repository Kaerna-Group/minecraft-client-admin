type StatusBadgeProps = {
  label: string;
  tone?: 'live' | 'warn' | 'muted';
};

const toneMap = {
  live: 'bg-accent-300 shadow-[0_0_0_6px_rgba(158,246,95,0.10)]',
  warn: 'bg-amber-300 shadow-[0_0_0_6px_rgba(252,211,77,0.10)]',
  muted: 'bg-slate-500 shadow-[0_0_0_6px_rgba(100,116,139,0.12)]',
};

export function StatusBadge({ label, tone = 'muted' }: StatusBadgeProps) {
  return (
    <span className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
      <span className={['h-2.5 w-2.5 rounded-full', toneMap[tone]].join(' ')} />
      {label}
    </span>
  );
}
