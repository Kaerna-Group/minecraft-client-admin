import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';
import { Button } from '../components/Button';

const navItems = [
  { to: '/profiles', label: 'Profiles' },
  { to: '/roles', label: 'Roles' },
  { to: '/bans', label: 'Bans' },
  { to: '/news', label: 'News' },
  { to: '/releases', label: 'Releases' },
];

export function ProtectedLayout() {
  const { session, signOut } = useAuth();

  return (
    <div className="relative grid min-h-screen grid-cols-1 gap-5 p-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:p-6">
      <aside className="flex flex-col gap-6 rounded-[28px] border border-white/10 bg-[#060916]/70 p-6 shadow-shell backdrop-blur-xl">
        <div className="space-y-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-accent-300/80">
            Admin console
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Kaerna Admin</h1>
          <p className="text-sm leading-6 text-slate-400">
            Manage protected operational entities without exposing unrestricted database access.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <div className="font-medium text-white">{session?.user.email ?? 'Unknown admin'}</div>
          <div className="mt-1 text-slate-400">Supabase-authenticated admin session</div>
        </div>

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'rounded-2xl border px-4 py-3 text-sm font-medium transition duration-200',
                  isActive
                    ? 'border-accent-300/30 bg-accent-300/10 text-white'
                    : 'border-transparent bg-white/[0.03] text-slate-300 hover:border-white/10 hover:bg-white/[0.07] hover:text-white',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Button className="mt-auto" variant="secondary" onClick={() => void signOut()} type="button">
          Sign out
        </Button>
      </aside>

      <main className="min-w-0 rounded-[28px] border border-white/[0.08] bg-[#09101d]/40 p-4 shadow-shell backdrop-blur-md lg:p-6">
        <Outlet />
      </main>
    </div>
  );
}

