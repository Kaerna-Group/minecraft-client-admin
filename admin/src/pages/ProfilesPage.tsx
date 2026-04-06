import { EntityTable } from '../components/EntityTable';
import { Panel } from '../components/Panel';
import { fetchProfiles } from '../lib/admin-api';
import { useAsyncResource } from '../lib/useAsyncResource';

export function ProfilesPage() {
  const { data, error, loading, refresh } = useAsyncResource(fetchProfiles);

  return (
    <div className="grid gap-5">
      <Panel title="Profiles" eyebrow="Read-only overview">
        <p className="text-sm leading-7 text-slate-300">
          View launcher user profiles and current account metadata. Profile editing can be added later once the final moderation flow is locked.
        </p>
        <div className="flex gap-3">
          <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100" onClick={() => void refresh()} type="button">
            Refresh
          </button>
        </div>
        {loading ? <div className="text-sm text-slate-400">Loading profiles...</div> : null}
        {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
        <EntityTable
          columns={[
            { key: 'id', header: 'User ID', render: (row) => row.id },
            { key: 'nickname', header: 'Nickname', render: (row) => row.nickname ?? '—' },
            { key: 'avatar_url', header: 'Avatar', render: (row) => row.avatar_url ?? '—' },
            { key: 'last_login_at', header: 'Last login', render: (row) => row.last_login_at ?? '—' },
          ]}
          emptyLabel="No profiles returned by Supabase."
          rows={data ?? []}
        />
      </Panel>
    </div>
  );
}
