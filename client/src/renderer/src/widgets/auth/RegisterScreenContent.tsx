import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@renderer/components/Button';
import { FieldShell, TextInput } from '@renderer/components/FieldShell';
import { Panel } from '@renderer/components/Panel';
import { useLauncherStore } from '@renderer/store/launcher-store';

export function RegisterScreenContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const { authBusy, authError, configured, registerMessage, session, signUp } = useLauncherStore(
    useShallow((state) => ({
      authBusy: state.authBusy,
      authError: state.authError,
      configured: state.configured,
      registerMessage: state.registerMessage,
      session: state.session,
      signUp: state.signUp,
    })),
  );

  if (session) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password should be at least 6 characters long.');
      return;
    }

    await signUp(email, password);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <Panel title="Register" kicker="Supabase auth">
        <p className="text-sm leading-7 text-slate-300">
          Create a player account directly in the launcher. If email confirmation is enabled in Supabase, follow the email flow before signing in.
        </p>

        {!configured ? <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">Missing <code>VITE_SUPABASE_URL</code> or <code>VITE_SUPABASE_ANON_KEY</code> in the client environment.</div> : null}

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <FieldShell label="Email"><TextInput value={email} onChange={(event) => setEmail(event.target.value)} type="email" /></FieldShell>
          <FieldShell label="Password"><TextInput value={password} onChange={(event) => setPassword(event.target.value)} type="password" /></FieldShell>
          <FieldShell label="Confirm password"><TextInput value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" /></FieldShell>
          {localError ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{localError}</div> : null}
          {authError ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{authError}</div> : null}
          {registerMessage ? <div className="rounded-2xl border border-accent-300/30 bg-accent-400/10 px-4 py-3 text-sm text-accent-300">{registerMessage}</div> : null}
          <Button disabled={authBusy || !configured} type="submit">{authBusy ? 'Creating account...' : 'Create account'}</Button>
        </form>
      </Panel>

      <Panel title="Route behavior" kicker="Launcher UX">
        <ul className="m-0 space-y-3 pl-5 text-sm leading-7 text-slate-300">
          <li>No session sends the player to login.</li>
          <li>Successful registration may sign in immediately or require email confirmation.</li>
          <li>Once authenticated, the launcher continues into the main shell.</li>
        </ul>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
          Already have an account? <Link className="font-medium text-accent-300 transition hover:text-accent-400" to="/login">Return to login</Link>.
        </div>
      </Panel>
    </div>
  );
}
