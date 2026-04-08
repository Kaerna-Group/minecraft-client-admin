import type { InputHTMLAttributes, PropsWithChildren, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type FieldProps = PropsWithChildren<{
  label: string;
  error?: string;
  hint?: string;
}>;

export function Field({ label, error, hint, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</span>
      {children}
      {error ? <span className="text-xs text-rose-300">{error}</span> : hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

const inputClassName =
  'h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-white/15 focus:border-accent-300/60 focus:bg-white/[0.07]';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClassName} {...props} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputClassName} {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="min-h-32 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-white/15 focus:border-accent-300/60 focus:bg-white/[0.07]" {...props} />;
}
