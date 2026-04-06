import type { InputHTMLAttributes, PropsWithChildren, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type FieldProps = PropsWithChildren<{
  label: string;
}>;

export function Field({ label, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-white/15 focus:border-accent-300/60 focus:bg-white/[0.07]" {...props} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-100 outline-none transition hover:border-white/15 focus:border-accent-300/60 focus:bg-white/[0.07]" {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="min-h-32 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-white/15 focus:border-accent-300/60 focus:bg-white/[0.07]" {...props} />;
}
