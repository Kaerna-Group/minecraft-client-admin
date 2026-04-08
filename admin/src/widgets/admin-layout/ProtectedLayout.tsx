import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '@features/auth/model/useAuth';
import { Button } from '@shared/ui/Button';
import { ReadonlyBadge } from '@shared/ui/ReadonlyBadge';

const navItems = [
  { to: '/system-status', label: 'System Status' },
  { to: '/profiles', label: 'Profiles', adminOnly: true },
  { to: '/roles', label: 'Roles', adminOnly: true },
  { to: '/bans', label: 'Bans' },
  { to: '/news', label: 'News' },
  { to: '/releases', label: 'Releases', adminOnly: true },
  { to: '/audit-logs', label: 'Audit Logs', adminOnly: true },
];

export function ProtectedLayout() {
  const { canViewAuditLogs, isAdmin, isModerator, roles, session, signOut } = useAuth();

  return (
    <div className="relative grid min-h-screen grid-cols-1 gap-5 p-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:p-6">
      <aside className="flex flex-col gap-6 rounded-[28px] border border-white/10 bg-[#060916]/70 p-6 shadow-shell backdrop-blur-xl">
        <div className="space-y-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-accent-300/80">Admin console</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Kaerna Admin</h1>
          <p className="text-sm leading-6 text-slate-400">
            Operational control surface for protected launcher data, release flow, moderation, and audit visibility.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <div className="font-medium text-white">{session?.user.email ?? 'Unknown admin'}</div>
          <div className="mt-1 text-slate-400">Supabase-authenticated admin session</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {roles.map((role) => (
              <span key={role} className="rounded-full border border-accent-300/30 bg-accent-300/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent-300">
                {role}
              </span>
            ))}
            {roles.length === 0 ? <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-amber-200">no role</span> : null}
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            if (item.to === '/audit-logs' && !canViewAuditLogs) {
              return null;
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => [
                  'rounded-2xl border px-4 py-3 text-sm font-medium transition duration-200',
                  isActive
                    ? 'border-accent-300/30 bg-accent-300/10 text-white'
                    : 'border-transparent bg-white/[0.03] text-slate-300 hover:border-white/10 hover:bg-white/[0.07] hover:text-white',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{item.label}</span>
                  {item.adminOnly && !isAdmin ? <ReadonlyBadge>Restricted</ReadonlyBadge> : null}
                </div>
              </NavLink>
            );
          })}
        </nav>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-slate-300">
          {isAdmin ? <span>Admin can operate the full console, including profiles, roles, releases, audit logs, exports, and system visibility.</span> : isModerator ? <span>Moderator mode prioritizes bans and news. Restricted areas stay hidden or read-only with explicit capability hints.</span> : <span>Access is authenticated but not role-granted.</span>}
        </div>

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
