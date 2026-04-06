import { useEffect, useState } from 'react';

import { LinkButton } from '../components/Button';
import { launcherApi } from '../lib/launcher-api';
import { useLauncherStore } from '../store/launcher-store';

export function SplashScreen() {
  const [platform, setPlatform] = useState('loading...');
  const setShellReady = useLauncherStore((state) => state.setShellReady);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const appInfo = await launcherApi.getAppInfo();

      if (active) {
        setPlatform(appInfo?.platform ?? 'unknown');
        setShellReady(true);
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [setShellReady]);

  return (
    <section className="space-y-8 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:p-10">
      <div className="space-y-4">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-accent-300/80">
          Startup
        </p>
        <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-white lg:text-5xl">
          Launcher shell is visually ready for the next phases.
        </h2>
        <p className="max-w-3xl text-base leading-7 text-slate-300">
          This splash route stands in for initialization, local config loading,
          update checks, startup diagnostics, and future release handshakes.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[24px] border border-white/10 bg-[#09101d]/70 p-5">
          <span className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Target
          </span>
          <strong className="mt-2 block text-lg text-white">Windows-first MVP</strong>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-[#09101d]/70 p-5">
          <span className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Runtime
          </span>
          <strong className="mt-2 block text-lg text-white">{platform}</strong>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-[#09101d]/70 p-5">
          <span className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Phase
          </span>
          <strong className="mt-2 block text-lg text-white">Launcher shell</strong>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <LinkButton to="/login">Continue to login</LinkButton>
        <LinkButton to="/app" variant="secondary">
          Open main screen
        </LinkButton>
      </div>
    </section>
  );
}
