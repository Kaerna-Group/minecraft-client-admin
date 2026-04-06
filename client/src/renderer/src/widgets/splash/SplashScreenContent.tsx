import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';

import { LinkButton } from '@renderer/components/Button';
import { useLauncherStore } from '@renderer/store/launcher-store';

export function SplashScreenContent() {
  const navigate = useNavigate();
  const { authError, bootstrapping, configured, initializeApp, platform, session, shellReady } = useLauncherStore(
    useShallow((state) => ({
      authError: state.authError,
      bootstrapping: state.bootstrapping,
      configured: state.configured,
      initializeApp: state.initializeApp,
      platform: state.platform,
      session: state.session,
      shellReady: state.shellReady,
    })),
  );

  useEffect(() => {
    void initializeApp();
  }, [initializeApp]);

  useEffect(() => {
    if (!shellReady || bootstrapping) {
      return;
    }

    navigate(session ? '/app' : '/login', { replace: true });
  }, [bootstrapping, navigate, session, shellReady]);

  return (
    <section className="space-y-8 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:p-10">
      <div className="space-y-4">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-accent-300/80">Startup</p>
        <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-white lg:text-5xl">Restoring launcher session and world state.</h2>
        <p className="max-w-3xl text-base leading-7 text-slate-300">The splash flow now restores Supabase auth, then boots launcher data in order: roles, bans, profile, published news, and the active build release.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[24px] border border-white/10 bg-[#09101d]/70 p-5"><span className="text-xs uppercase tracking-[0.22em] text-slate-500">Target</span><strong className="mt-2 block text-lg text-white">Windows-first MVP</strong></div>
        <div className="rounded-[24px] border border-white/10 bg-[#09101d]/70 p-5"><span className="text-xs uppercase tracking-[0.22em] text-slate-500">Runtime</span><strong className="mt-2 block text-lg text-white">{platform}</strong></div>
        <div className="rounded-[24px] border border-white/10 bg-[#09101d]/70 p-5"><span className="text-xs uppercase tracking-[0.22em] text-slate-500">Session</span><strong className="mt-2 block text-lg text-white">{bootstrapping ? 'Checking auth' : session ? 'Authenticated' : 'Needs sign-in'}</strong></div>
      </div>

      {!configured ? <div className="rounded-[24px] border border-amber-300/30 bg-amber-500/10 px-5 py-4 text-sm leading-6 text-amber-100">Missing <code>VITE_SUPABASE_URL</code> or <code>VITE_SUPABASE_ANON_KEY</code> in the client environment.</div> : null}
      {authError ? <div className="rounded-[24px] border border-rose-400/30 bg-rose-500/10 px-5 py-4 text-sm leading-6 text-rose-100">{authError}</div> : null}

      <div className="flex flex-wrap gap-3">
        <LinkButton to="/login">Open login</LinkButton>
        <LinkButton to="/register" variant="secondary">Create account</LinkButton>
      </div>
    </section>
  );
}
