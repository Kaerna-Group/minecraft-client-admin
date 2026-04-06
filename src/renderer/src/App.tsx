import { NavLink, Route, Routes } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';

import { useLauncherStore } from './store/launcher-store';
import { LoginScreen } from './screens/LoginScreen';
import { MainScreen } from './screens/MainScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SplashScreen } from './screens/SplashScreen';

const navigationItems = [
  { to: '/', label: 'Splash' },
  { to: '/login', label: 'Login' },
  { to: '/app', label: 'Main' },
  { to: '/settings', label: 'Settings' },
];

export default function App() {
  const { shellReady, mockSession } = useLauncherStore(
    useShallow((state) => ({
      shellReady: state.shellReady,
      mockSession: state.mockSession,
    })),
  );

  return (
    <div className="app-shell">
      <aside className="side-rail">
        <div>
          <p className="eyebrow">Phase 2</p>
          <h1>Kaerna Launcher</h1>
          <p className="muted">
            Desktop shell for the Minecraft server launcher MVP.
          </p>
        </div>

        <nav className="nav-stack" aria-label="Launcher navigation">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link-active' : 'nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <section className="status-card">
          <span className={`status-dot ${shellReady ? 'is-live' : ''}`} />
          <div>
            <strong>{shellReady ? 'Shell ready' : 'Booting shell'}</strong>
            <p className="muted">
              {mockSession.isAuthenticated
                ? `Signed in as ${mockSession.email}`
                : 'Using local-only placeholder session'}
            </p>
          </div>
        </section>
      </aside>

      <main className="main-panel">
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/app" element={<MainScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </main>
    </div>
  );
}
