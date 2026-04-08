import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class AdminErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unknown admin error.',
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error('Admin UI crashed', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-3xl rounded-[28px] border border-rose-400/30 bg-[#09101d]/90 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-rose-200/80">Admin error</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">The admin panel crashed</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Reload the page. If it still fails, check the browser console and use the message below to trace the broken screen.
          </p>
          <pre className="mt-6 overflow-auto rounded-2xl border border-white/10 bg-[#060916]/90 p-5 text-sm leading-7 text-rose-100">
            {this.state.message || 'Unknown admin error.'}
          </pre>
        </div>
      </div>
    );
  }
}
