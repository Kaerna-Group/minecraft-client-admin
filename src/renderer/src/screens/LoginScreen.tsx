import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../components/Button';
import { FieldShell, TextInput } from '../components/FieldShell';
import { Panel } from '../components/Panel';
import { useLauncherStore } from '../store/launcher-store';

export function LoginScreen() {
  const [email, setEmail] = useState('player@kaerna.local');
  const signInPlaceholder = useLauncherStore((state) => state.signInPlaceholder);
  const signOutPlaceholder = useLauncherStore((state) => state.signOutPlaceholder);
  const mockSession = useLauncherStore((state) => state.mockSession);
  const navigate = useNavigate();

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <Panel title="Login" kicker="Mock auth">
        <p className="text-sm leading-7 text-slate-300">
          Phase 2 keeps auth local-only. This screen exists to lock the launcher
          flow before Supabase integration.
        </p>

        <div className="grid gap-4">
          <FieldShell label="Email">
            <TextInput
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
            />
          </FieldShell>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="button"
            onClick={() => {
              signInPlaceholder(email);
              navigate('/app');
            }}
          >
            Sign in placeholder
          </Button>
          <Button variant="secondary" type="button" onClick={signOutPlaceholder}>
            Reset session
          </Button>
        </div>
      </Panel>

      <Panel title="Session state" kicker="Status">
        <ul className="m-0 space-y-3 pl-5 text-sm leading-7 text-slate-300">
          <li>Authenticated: {mockSession.isAuthenticated ? 'yes' : 'no'}</li>
          <li>Identity: {mockSession.email}</li>
          <li>Backend: not connected in this phase</li>
        </ul>
      </Panel>
    </div>
  );
}
