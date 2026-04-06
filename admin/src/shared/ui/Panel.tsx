import type { PropsWithChildren } from 'react';

type PanelProps = PropsWithChildren<{
  title: string;
  eyebrow?: string;
}>;

export function Panel({ title, eyebrow, children }: PanelProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-shell backdrop-blur-xl">
      <div className="mb-5">
        {eyebrow ? (
          <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-accent-300/80">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-semibold text-slate-100">{title}</h2>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}
