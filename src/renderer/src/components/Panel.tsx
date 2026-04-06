import type { PropsWithChildren, ReactNode } from 'react';

type PanelProps = PropsWithChildren<{
  title: string;
  kicker?: string;
  action?: ReactNode;
}>;

export function Panel({ title, kicker, action, children }: PanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          {kicker ? <p className="eyebrow">{kicker}</p> : null}
          <h2>{title}</h2>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="panel-content">{children}</div>
    </section>
  );
}
