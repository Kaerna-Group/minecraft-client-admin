import type { InputHTMLAttributes, PropsWithChildren } from 'react';

type FieldShellProps = PropsWithChildren<{
  label: string;
  wide?: boolean;
}>;

export function FieldShell({ label, wide, children }: FieldShellProps) {
  return (
    <label
      className={['flex flex-col gap-2', wide ? 'md:col-span-2' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-white/15 focus:border-accent-300/60 focus:bg-white/[0.07]"
      {...props}
    />
  );
}

