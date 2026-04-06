import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Panel } from '../components/Panel';
import { useLauncherStore } from '../store/launcher-store';

export function LoginScreen() {
  const [email, setEmail] = useState('player@kaerna.local');
  const signInPlaceholder = useLauncherStore((state) => state.signInPlaceholder);
  const signOutPlaceholder = useLauncherStore((state) => state.signOutPlaceholder);
  const mockSession = useLauncherStore((state) => state.mockSession);
  const navigate = useNavigate();

  return (
    <div className="screen-grid">
      <Panel title="Login" kicker="Mock auth">
        <p className="muted">
          Phase 2 keeps auth local-only. This screen exists to lock the launcher
          flow before Supabase integration.
        </p>

        <label className="field">
          <span>Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
          />
        </label>

        <div className="button-row">
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              signInPlaceholder(email);
              navigate('/app');
            }}
          >
            Sign in placeholder
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={signOutPlaceholder}
          >
            Reset session
          </button>
        </div>
      </Panel>

      <Panel title="Session state" kicker="Status">
        <ul className="detail-list">
          <li>Authenticated: {mockSession.isAuthenticated ? 'yes' : 'no'}</li>
          <li>Identity: {mockSession.email}</li>
          <li>Backend: not connected in this phase</li>
        </ul>
      </Panel>
    </div>
  );
}
