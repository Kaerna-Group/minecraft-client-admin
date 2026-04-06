import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@renderer/components/Button';
import { StatusBadge } from '@renderer/components/StatusBadge';
import { LoginScreen } from '@renderer/screens/LoginScreen';
import { MainScreen } from '@renderer/screens/MainScreen';
import { RegisterScreen } from '@renderer/screens/RegisterScreen';
import { SettingsScreen } from '@renderer/screens/SettingsScreen';
import { SplashScreen } from '@renderer/screens/SplashScreen';
import { useLauncherStore } from '@renderer/store/launcher-store';

function GuestRoute() {
  const { bootstrapping, session } = useLauncherStore(
    useShallow((state) => ({ bootstrapping: state.bootstrapping, session: state.session })),
  );

  if (bootstrapping) {
    return <div className="flex min-h-[60vh] items-center justify-center text-slate-300">Restoring launcher session...</div>;
  }

  if (session) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}

function ProtectedRoute() {
  const { bootstrapping, session, shellReady } = useLauncherStore(
    useShallow((state) => ({ bootstrapping: state.bootstrapping, session: state.session, shellReady: state.shellReady })),
  );

  if (bootstrapping || !shellReady) {
    return <div className="flex min-h-[60vh] items-center justify-center text-slate-300">Preparing launcher shell...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default function App() {
  const location = useLocation();
  const { activeBan, bootstrapping, initializeApp, roles, session, shellReady, signOut } = useLauncherStore(
    useShallow((state) => ({
      activeBan: state.activeBan,
      bootstrapping: state.bootstrapping,
      initializeApp: state.initializeApp,
      roles: state.roles,
      session: state.session,
      shellReady: state.shellReady,
      signOut: state.signOut,
    })),
  );

  useEffect(() => {
    void initializeApp();
  }, [initializeApp]);

  const navigationItems = session
    ? [
        { to: '/', label: 'Splash' },
        { to: '/app', label: 'Main' },
        { to: '/settings', label: 'Settings' },
      ]
    : [
        { to: '/', label: 'Splash' },
        { to: '/login', label: 'Login' },
        { to: '/register', label: 'Register' },
      ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_0%,rgba(158,246,95,0.14),transparent_24%),radial-gradient(circle_at_100%_0%,rgba(56,189,248,0.14),transparent_24%)]" />
      <div className="relative grid min-h-screen grid-cols-1 gap-5 p-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:p-6">
        <aside className="flex flex-col gap-6 rounded-[28px] border border-white/10 bg-[#060916]/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-accent-300/80">Launcher MVP</p>
              <h1 className="text-4xl font-semibold tracking-tight text-white">Kaerna Launcher</h1>
            </div>
            <p className="max-w-xs text-sm leading-6 text-slate-400">Supabase-backed shell for a single Minecraft server, with live auth, role-aware state, news, bans, and release metadata.</p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-sky-300/80">Shell state</p>
            <div className="flex flex-wrap gap-3">
              <StatusBadge label={shellReady ? 'Shell ready' : 'Booting shell'} tone={shellReady ? 'live' : 'warn'} />
              <StatusBadge label={session ? 'Session restored' : 'Awaiting sign-in'} tone={session ? 'live' : 'muted'} />
              {activeBan ? <StatusBadge label="Play blocked" tone="warn" /> : null}
            </div>
          </div>

          <nav className="flex flex-col gap-2" aria-label="Launcher navigation">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => [
                  'group rounded-2xl border px-4 py-3 transition duration-200',
                  isActive
                    ? 'border-accent-300/30 bg-accent-300/10 text-white shadow-[0_0_0_1px_rgba(158,246,95,0.16),0_0_32px_rgba(158,246,95,0.10)]'
                    : 'border-transparent bg-white/[0.03] text-slate-300 hover:border-white/10 hover:bg-white/[0.07] hover:text-white',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-500 transition group-hover:text-slate-300">route</span>
                </div>
              </NavLink>
            ))}
          </nav>

          <section className="mt-auto rounded-[24px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent p-5">
            <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-accent-300/80">Current profile</p>
            <strong className="block text-base text-white">{session?.user.email ?? 'Guest session'}</strong>
            <p className="mt-2 text-sm leading-6 text-slate-400">{session ? `Roles: ${roles.length > 0 ? roles.join(', ') : 'player'}` : 'Sign in to restore launcher data, bans, news, and active build metadata.'}</p>
            {session ? <Button className="mt-4 w-full" onClick={() => void signOut()} type="button" variant="secondary">Sign out</Button> : null}
          </section>
        </aside>

        <main className="min-w-0">
          <div className="rounded-[28px] border border-white/[0.08] bg-[#09101d]/40 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md lg:p-6">
            <Routes>
              <Route path="/" element={<SplashScreen />} />
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginScreen />} />
                <Route path="/register" element={<RegisterScreen />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route path="/app" element={<MainScreen />} />
                <Route path="/settings" element={<SettingsScreen />} />
              </Route>
              <Route path="*" element={<Navigate replace to={location.pathname === '/' ? '/' : '/'} />} />
            </Routes>
            {bootstrapping ? <div className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-500">Refreshing session and launcher data...</div> : null}
          </div>
        </main>
      </div>
    </div>
  );
}
