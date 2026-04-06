import { useState } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';
import { Button } from '../components/Button';
import { Field, TextInput } from '../components/Field';
import { Panel } from '../components/Panel';

export function LoginPage() {
  const { configured, loading, session, signIn } = useAuth();
  const [email, setEmail] = useState('admin@kaerna.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (session) {
    return <Navigate to="/profiles" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const result = await signIn(email, password);

    if (result.error) {
      setError(result.error);
    }

    setSubmitting(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <Panel title="Admin login" eyebrow="Supabase Auth">
          <p className="text-sm leading-7 text-slate-300">
            Sign in with an authorized admin account to manage profiles, roles,
            bans, launcher news, and active build releases.
          </p>

          {!configured ? (
            <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Missing <code>VITE_SUPABASE_URL</code> or <code>VITE_SUPABASE_ANON_KEY</code>.
              Add them in the admin environment before using login.
            </div>
          ) : null}

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <Field label="Email">
              <TextInput value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
            </Field>
            <Field label="Password">
              <TextInput value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
            </Field>

            {error ? (
              <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <Button disabled={loading || submitting || !configured} type="submit">
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}

