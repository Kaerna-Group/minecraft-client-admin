import { useState } from 'react';

import { Button } from '../components/Button';
import { EntityTable } from '../components/EntityTable';
import { Field, TextInput } from '../components/Field';
import { Panel } from '../components/Panel';
import { createBan, deleteBan, fetchBans, type UserBan } from '../lib/admin-api';
import { useAsyncResource } from '../lib/useAsyncResource';

type BanFormState = {
  user_id: string;
  is_banned: boolean;
  reason: string;
  banned_until: string;
};

export function BansPage() {
  const { data, error, loading, refresh } = useAsyncResource(fetchBans);
  const [formState, setFormState] = useState<BanFormState>({
    user_id: '',
    is_banned: true,
    reason: '',
    banned_until: '',
  });
  const [actionError, setActionError] = useState('');

  const handleCreate = async () => {
    setActionError('');

    try {
      await createBan({
        user_id: formState.user_id,
        is_banned: formState.is_banned,
        reason: formState.reason || null,
        banned_until: formState.banned_until || null,
      });
      setFormState({ user_id: '', is_banned: true, reason: '', banned_until: '' });
      await refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Unknown error');
    }
  };

  const handleDelete = async (row: UserBan) => {
    setActionError('');

    try {
      await deleteBan(row.id);
      await refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Unknown error');
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
      <Panel title="Bans" eyebrow="Protected entity">
        {loading ? <div className="text-sm text-slate-400">Loading bans...</div> : null}
        {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
        <EntityTable
          columns={[
            { key: 'user_id', header: 'User ID', render: (row) => row.user_id },
            { key: 'reason', header: 'Reason', render: (row) => row.reason ?? '—' },
            { key: 'banned_until', header: 'Until', render: (row) => row.banned_until ?? 'Permanent' },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <button className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100" onClick={() => void handleDelete(row)} type="button">
                  Delete
                </button>
              ),
            },
          ]}
          emptyLabel="No bans found."
          rows={data ?? []}
        />
      </Panel>

      <Panel title="Create ban" eyebrow="Mutation">
        <Field label="User ID">
          <TextInput value={formState.user_id} onChange={(event) => setFormState((current) => ({ ...current, user_id: event.target.value }))} />
        </Field>
        <Field label="Reason">
          <TextInput value={formState.reason} onChange={(event) => setFormState((current) => ({ ...current, reason: event.target.value }))} />
        </Field>
        <Field label="Banned until (ISO or empty)">
          <TextInput value={formState.banned_until} onChange={(event) => setFormState((current) => ({ ...current, banned_until: event.target.value }))} />
        </Field>
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
          <input checked={formState.is_banned} className="h-4 w-4" onChange={(event) => setFormState((current) => ({ ...current, is_banned: event.target.checked }))} type="checkbox" />
          <span>Mark as banned</span>
        </label>
        {actionError ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{actionError}</div> : null}
        <Button onClick={() => void handleCreate()} type="button">Create ban</Button>
      </Panel>
    </div>
  );
}
