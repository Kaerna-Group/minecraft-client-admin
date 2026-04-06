import { Link, Navigate } from 'react-router-dom';
import { useState } from 'react';

import { useAuth } from '@features/auth/model/useAuth';
import { Button } from '@shared/ui/Button';
import { Field, TextInput } from '@shared/ui/Field';
import { Panel } from '@shared/ui/Panel';

export function RegisterPageContent() {
  const { configured, hasAdminAccess, loading, roleLoading, session, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (session && (loading || roleLoading)) {
    return <div className="flex min-h-screen items-center justify-center text-slate-300">Checking access...</div>;
  }

  if (session) {
    return <Navigate to={hasAdminAccess ? '/profiles' : '/access-denied'} replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters long.');
      setSubmitting(false);
      return;
    }

    const result = await signUp(email, password);

    if (result.error) {
      setError(result.error);
    } else if (result.message) {
      setMessage(result.message);
    }

    setSubmitting(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <Panel title="Admin registration" eyebrow="Supabase Auth">
          <p className="text-sm leading-7 text-slate-300">Create an account first, then give that user the proper role in <code>user_roles</code> so access to admin routes and mutations is actually granted.</p>
          {!configured ? <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">Missing <code>VITE_SUPABASE_URL</code> or <code>VITE_SUPABASE_ANON_KEY</code>. Add them in the admin environment before using registration.</div> : null}
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <Field label="Email"><TextInput value={email} onChange={(event) => setEmail(event.target.value)} type="email" /></Field>
            <Field label="Password"><TextInput value={password} onChange={(event) => setPassword(event.target.value)} type="password" /></Field>
            <Field label="Confirm password"><TextInput value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" /></Field>
            {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
            {message ? <div className="rounded-2xl border border-accent-300/30 bg-accent-400/10 px-4 py-3 text-sm text-accent-300">{message}</div> : null}
            <Button disabled={loading || roleLoading || submitting || !configured} type="submit">{submitting ? 'Creating account...' : 'Create account'}</Button>
          </form>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
            <span>Already have an account?</span>
            <Link className="font-medium text-accent-300 transition hover:text-accent-400" to="/login">Go to login</Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
