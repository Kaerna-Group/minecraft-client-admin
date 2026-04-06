import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type SharedProps = {
  variant?: 'primary' | 'secondary';
  className?: string;
};

type ButtonProps = PropsWithChildren<
  SharedProps & ButtonHTMLAttributes<HTMLButtonElement>
>;

type LinkButtonProps = PropsWithChildren<SharedProps & LinkProps>;

const baseClassName =
  'inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-sm font-semibold tracking-[0.02em] transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060916]';

const variantClassName = {
  primary:
    'border-accent-300/60 bg-gradient-to-br from-accent-300 via-accent-400 to-lime-300 text-slate-950 shadow-[0_0_0_1px_rgba(158,246,95,0.16),0_0_32px_rgba(158,246,95,0.10)] hover:-translate-y-0.5 hover:brightness-105',
  secondary:
    'border-white/10 bg-white/5 text-slate-100 hover:-translate-y-0.5 hover:border-accent-300/30 hover:bg-white/10',
};

function getClassName(variant: 'primary' | 'secondary', className?: string) {
  return [baseClassName, variantClassName[variant], className]
    .filter(Boolean)
    .join(' ');
}

export function Button({
  children,
  variant = 'primary',
  className,
  ...props
}: ButtonProps) {
  return (
    <button className={getClassName(variant, className)} {...props}>
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  variant = 'primary',
  className,
  ...props
}: LinkButtonProps) {
  return (
    <Link className={getClassName(variant, className)} {...props}>
      {children}
    </Link>
  );
}
