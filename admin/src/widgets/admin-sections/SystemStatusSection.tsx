import { Link } from 'react-router-dom';

import { fetchSystemStatus } from '@entities/admin/api/admin-api';
import { useAuth } from '@features/auth/model/useAuth';
import { normalizeAdminErrorMessage } from '@shared/lib/admin-errors';
import { useAsyncResource } from '@shared/lib/react/useAsyncResource';
import { CopyButton } from '@shared/ui/CopyButton';
import { Panel } from '@shared/ui/Panel';
import { ReadonlyBadge } from '@shared/ui/ReadonlyBadge';
import { SectionHint } from '@shared/ui/SectionHint';

const countLabels = [
  ['profiles', 'Profiles'],
  ['user_roles', 'Roles'],
  ['user_bans', 'Bans'],
  ['launcher_news', 'News'],
  ['build_releases', 'Releases'],
  ['audit_logs', 'Audit logs'],
] as const;

export function SystemStatusSection() {
  const { configured, session, roles, isAdmin, isModerator, canViewAuditLogs } = useAuth();
  const { data, error, loading, refresh } = useAsyncResource(fetchSystemStatus);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_420px]">
      <div className="space-y-5">
        <Panel title="System status" eyebrow="Operational board">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Environment</div>
              <div className="mt-2 text-lg font-semibold text-white">{configured ? 'Configured' : 'Missing env'}</div>
              <div className="mt-2 text-sm text-slate-400">Supabase client configuration for the admin app.</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Current user</div>
              <div className="mt-2 text-lg font-semibold text-white">{session?.user.email ?? 'Unknown'}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {roles.map((role) => (
                  <span key={role} className="rounded-full border border-accent-300/30 bg-accent-300/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-accent-200">{role}</span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Backend time</div>
              <div className="mt-2 text-lg font-semibold text-white">{data?.backend_timestamp ?? '—'}</div>
              <div className="mt-2 text-sm text-slate-400">Server-reported UTC timestamp from Supabase RPC.</div>
            </div>
          </div>
        </Panel>

        <Panel title="Entity counts" eyebrow="Current data footprint">
          {loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />)}</div> : null}
          {error ? <SectionHint tone="warning">{normalizeAdminErrorMessage(error)}</SectionHint> : null}
          {data ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {countLabels.map(([key, label]) => (
                <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
                  <div className="mt-3 text-3xl font-semibold text-white">{data.entity_counts[key]}</div>
                </div>
              ))}
            </div>
          ) : null}
        </Panel>

        <Panel title="Recent audit activity" eyebrow="Latest security trail" action={canViewAuditLogs ? <Link className="text-sm text-accent-200 hover:text-accent-100" to="/audit-logs">Open audit logs</Link> : undefined}>
          {!canViewAuditLogs ? <SectionHint tone="warning">Only admins can open the full audit trail. Moderators see this board without audit log data.</SectionHint> : null}
          {loading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />)}</div> : null}
          {data?.recent_audit_logs?.length ? (
            <div className="space-y-3">
              {data.recent_audit_logs.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                    <span>{item.entity_type}</span>
                    <span>{item.action_type}</span>
                    <span>{item.created_at}</span>
                  </div>
                  <div className="mt-2 text-sm font-medium text-white">{item.summary}</div>
                  <div className="mt-2 text-sm text-slate-400">{item.actor_email ?? item.actor_user_id ?? 'Unknown actor'}</div>
                </div>
              ))}
            </div>
          ) : !loading && !error ? (
            <SectionHint>No recent audit activity is available for this role.</SectionHint>
          ) : null}
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel title="Operational summary" eyebrow="Role-aware access">
          {isAdmin ? <SectionHint>Admin access includes roles, releases, profiles, bans, news, audit logs, and system visibility.</SectionHint> : null}
          {isModerator ? <SectionHint tone="warning">Moderator access is operationally limited: bans and news are writable, while roles, releases, profiles, and audit logs stay restricted.</SectionHint> : null}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
            <div className="flex items-center justify-between gap-3">
              <span>Audit trail</span>
              {canViewAuditLogs ? <span className="text-accent-200">Available</span> : <ReadonlyBadge />}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span>Roles and releases</span>
              {isAdmin ? <span className="text-accent-200">Writable</span> : <ReadonlyBadge />}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span>Bans and news</span>
              <span className="text-accent-200">{isAdmin || isModerator ? 'Writable' : 'Restricted'}</span>
            </div>
          </div>
        </Panel>

        <Panel title="Active release" eyebrow="Current live build" action={<button className="text-sm text-accent-200 hover:text-accent-100" type="button" onClick={() => void refresh()}>Refresh</button>}>
          {data?.active_release ? (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Version</div>
                <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-white">
                  <span>{data.active_release.version}</span>
                  <CopyButton label="Copy version" value={data.active_release.version} />
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Manifest URL</div>
                <div className="mt-2 break-all text-slate-300">{data.active_release.manifest_url ?? 'No manifest URL'}</div>
              </div>
              <div className="text-slate-400">Updated: {data.active_release.updated_at ?? data.active_release.created_at ?? '—'}</div>
            </div>
          ) : (
            <SectionHint tone="warning">No active release is currently marked on the backend.</SectionHint>
          )}
        </Panel>
      </div>
    </div>
  );
}
