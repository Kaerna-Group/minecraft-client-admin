import type { PropsWithChildren, ReactNode } from 'react';

type PanelProps = PropsWithChildren<{
  title: string;
  kicker?: string;
  action?: ReactNode;
}>;

export function Panel({ title, kicker, action, children }: PanelProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl transition duration-300 hover:border-accent-300/20">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          {kicker ? (
            <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-accent-300/80">
              {kicker}
            </p>
          ) : null}
          <h2 className="text-2xl font-semibold text-slate-100">{title}</h2>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

