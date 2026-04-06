import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

const baseClassName =
  'inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-sm font-semibold tracking-[0.02em] transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060916]';

const variantClassName = {
  primary:
    'border-accent-300/60 bg-gradient-to-br from-accent-300 via-accent-400 to-lime-300 text-slate-950 shadow-[0_0_0_1px_rgba(158,246,95,0.16),0_0_32px_rgba(158,246,95,0.10)] hover:-translate-y-0.5 hover:brightness-105',
  secondary:
    'border-white/10 bg-white/5 text-slate-100 hover:-translate-y-0.5 hover:border-accent-300/30 hover:bg-white/10',
  danger:
    'border-rose-400/50 bg-rose-500/10 text-rose-100 hover:-translate-y-0.5 hover:bg-rose-500/20',
};

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: keyof typeof variantClassName;
  }
>;

export function Button({ children, className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={[baseClassName, variantClassName[variant], className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
