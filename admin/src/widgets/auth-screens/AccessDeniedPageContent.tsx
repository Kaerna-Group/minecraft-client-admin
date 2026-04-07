import { Link, Navigate } from 'react-router-dom';

import { useAuth } from '@features/auth/model/useAuth';
import { Button } from '@shared/ui/Button';
import { Panel } from '@shared/ui/Panel';

export function AccessDeniedPageContent() {
  const { hasAdminAccess, loading, roleError, roleLoading, session, signOut } = useAuth();

  if (loading || roleLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-300">Checking access...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (hasAdminAccess) {
    return <Navigate to="/profiles" replace />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <Panel title="Access denied" eyebrow="Missing role">
          <p className="text-sm leading-7 text-slate-300">This account is authenticated, but it does not have the required <code>admin</code> or <code>moderator</code> role in <code>user_roles</code>.</p>
          {roleError ? <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">Role lookup did not complete cleanly: {roleError}</div> : null}
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10" to="/login">Back to login</Link>
            <Button type="button" variant="secondary" onClick={() => void signOut()}>Sign out</Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
