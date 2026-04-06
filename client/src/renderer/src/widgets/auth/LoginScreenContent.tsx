import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@renderer/components/Button';
import { FieldShell, TextInput } from '@renderer/components/FieldShell';
import { Panel } from '@renderer/components/Panel';
import { useLauncherStore } from '@renderer/store/launcher-store';

export function LoginScreenContent() {
  const [email, setEmail] = useState('player@kaerna.local');
  const [password, setPassword] = useState('');
  const { authBusy, authError, configured, session, signIn } = useLauncherStore(
    useShallow((state) => ({
      authBusy: state.authBusy,
      authError: state.authError,
      configured: state.configured,
      session: state.session,
      signIn: state.signIn,
    })),
  );

  if (session) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await signIn(email, password);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <Panel title="Login" kicker="Supabase auth">
        <p className="text-sm leading-7 text-slate-300">
          Sign in with your launcher account to restore profile data, published news, active build metadata, and any current ban state.
        </p>

        {!configured ? (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Missing <code>VITE_SUPABASE_URL</code> or <code>VITE_SUPABASE_ANON_KEY</code> in the client environment.
          </div>
        ) : null}

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <FieldShell label="Email">
            <TextInput value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </FieldShell>
          <FieldShell label="Password">
            <TextInput value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </FieldShell>
          {authError ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{authError}</div> : null}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button disabled={authBusy || !configured} type="submit">{authBusy ? 'Signing in...' : 'Sign in'}</Button>
          </div>
        </form>
      </Panel>

      <Panel title="Access flow" kicker="Session state">
        <ul className="m-0 space-y-3 pl-5 text-sm leading-7 text-slate-300">
          <li>Registration lives in the launcher.</li>
          <li>Session restore happens on splash before route access.</li>
          <li>Authenticated players reach the main shell regardless of staff role.</li>
          <li>Active bans block Play, not the launcher shell itself.</li>
        </ul>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
          Need an account? <Link className="font-medium text-accent-300 transition hover:text-accent-400" to="/register">Create one here</Link>.
        </div>
      </Panel>
    </div>
  );
}
