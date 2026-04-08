export function ReadonlyBadge({ children = 'Read only' }: { children?: string }) {
  return <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-amber-200">{children}</span>;
}
