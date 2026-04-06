import { useMemo, useState } from 'react';

import { deleteBan, fetchBans, upsertBan, type BanQuery, type UserBan } from '@entities/admin/api/admin-api';
import { useAuth } from '@features/auth/model/useAuth';
import { useToast } from '@shared/lib/react/toast/useToast';
import { useCursorResource } from '@shared/lib/react/useCursorResource';
import { Button } from '@shared/ui/Button';
import { EntityTable } from '@shared/ui/EntityTable';
import { Field, SelectInput, TextArea, TextInput } from '@shared/ui/Field';
import { ConfirmDialog } from '@shared/ui/feedback/ConfirmDialog';
import { PaginationControls } from '@shared/ui/PaginationControls';
import { Panel } from '@shared/ui/Panel';

type BanFormState = {
  id?: string;
  user_id: string;
  is_banned: boolean;
  reason: string;
  banned_until: string;
};

const PAGE_SIZE = 20;
const emptyForm: BanFormState = {
  user_id: '',
  is_banned: true,
  reason: '',
  banned_until: '',
};

const sortOptions: Array<{ value: NonNullable<BanQuery['sortBy']>; label: string }> = [
  { value: 'created_at', label: 'Created' },
  { value: 'email', label: 'Email' },
  { value: 'banned_until', label: 'Banned until' },
];

export function BansSection() {
  const { canManageBans } = useAuth();
  const { pushToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<NonNullable<BanQuery['statusFilter']>>('all');
  const [sortBy, setSortBy] = useState<NonNullable<BanQuery['sortBy']>>('created_at');
  const [sortDirection, setSortDirection] = useState<NonNullable<BanQuery['sortDirection']>>('desc');
  const [formState, setFormState] = useState<BanFormState>(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<UserBan | null>(null);
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);

  const queryKey = useMemo(
    () => JSON.stringify({ search, statusFilter, sortBy, sortDirection }),
    [search, sortBy, sortDirection, statusFilter],
  );
  const { data, error, loading, refresh, hasMore, hasPrevious, goNext, goPrevious } = useCursorResource(
    (afterCursor) => fetchBans({ search, statusFilter, sortBy, sortDirection, pageSize: PAGE_SIZE, afterCursor }),
    queryKey,
  );

  const handleEdit = (ban: UserBan) => {
    setFormState({
      id: ban.id,
      user_id: ban.user_id,
      is_banned: ban.is_banned,
      reason: ban.reason ?? '',
      banned_until: ban.banned_until ?? '',
    });
    setActionError('');
  };

  const resetForm = () => {
    setFormState(emptyForm);
    setActionError('');
  };

  const handleSave = async () => {
    if (!canManageBans) {
      return;
    }

    setSaving(true);
    setActionError('');

    try {
      await upsertBan({
        id: formState.id,
        user_id: formState.user_id,
        is_banned: formState.is_banned,
        reason: formState.reason || null,
        banned_until: formState.banned_until || null,
      });
      await refresh();
      pushToast({ title: formState.id ? 'Ban updated' : 'Ban created', description: formState.user_id });
      resetForm();
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Unknown error';
      setActionError(message);
      pushToast({ title: 'Failed to save ban', description: message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete || !canManageBans) {
      return;
    }

    try {
      await deleteBan(pendingDelete.id);
      await refresh();
      pushToast({ title: 'Ban removed', description: pendingDelete.email ?? pendingDelete.user_id });
      if (formState.id === pendingDelete.id) {
        resetForm();
      }
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Unknown error';
      pushToast({ title: 'Failed to delete ban', description: message, tone: 'error' });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_380px]">
        <Panel
          title="Bans"
          eyebrow="Cursor-paginated moderation queue"
          action={<Button type="button" variant="secondary" onClick={() => void refresh()}>Refresh</Button>}
        >
          <div className="grid gap-4 lg:grid-cols-4">
            <Field label="Search">
              <TextInput placeholder="Email, UUID, reason" value={search} onChange={(event) => setSearch(event.target.value)} />
            </Field>
            <Field label="State">
              <SelectInput value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                <option value="all">All</option>
                <option value="active">Active bans</option>
                <option value="inactive">Inactive records</option>
              </SelectInput>
            </Field>
            <Field label="Sort by">
              <SelectInput value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Direction">
              <SelectInput value={sortDirection} onChange={(event) => setSortDirection(event.target.value as typeof sortDirection)}>
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </SelectInput>
            </Field>
          </div>
          {loading ? <div className="text-sm text-slate-400">Loading bans...</div> : null}
          {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
          <EntityTable
            columns={[
              { key: 'email', header: 'Email', render: (row) => row.email ?? '—' },
              { key: 'user_id', header: 'User ID', render: (row) => row.user_id },
              { key: 'state', header: 'State', render: (row) => (row.is_banned ? 'Active' : 'Inactive') },
              { key: 'reason', header: 'Reason', render: (row) => row.reason ?? '—' },
              { key: 'banned_until', header: 'Until', render: (row) => row.banned_until ?? 'Permanent' },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" disabled={!canManageBans} onClick={() => handleEdit(row)}>
                      Edit
                    </Button>
                    <Button type="button" variant="danger" disabled={!canManageBans} onClick={() => setPendingDelete(row)}>
                      Delete
                    </Button>
                  </div>
                ),
              },
            ]}
            emptyLabel="No ban records found."
            getRowKey={(row) => row.id}
            rows={data}
          />
          <PaginationControls
            itemCount={data.length}
            hasPrevious={hasPrevious}
            hasMore={hasMore}
            loading={loading}
            onPrevious={goPrevious}
            onNext={goNext}
          />
        </Panel>

        <Panel title={formState.id ? 'Edit ban' : 'Create ban'} eyebrow={formState.id ? 'Edit mode' : 'Create mode'}>
          {!canManageBans ? (
            <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Your role can review bans, but only admins and moderators can change them.
            </div>
          ) : null}
          <Field label="User ID">
            <TextInput disabled={!canManageBans} value={formState.user_id} onChange={(event) => setFormState((current) => ({ ...current, user_id: event.target.value }))} />
          </Field>
          <Field label="Reason">
            <TextArea disabled={!canManageBans} value={formState.reason} onChange={(event) => setFormState((current) => ({ ...current, reason: event.target.value }))} />
          </Field>
          <Field label="Banned until (ISO or empty)">
            <TextInput disabled={!canManageBans} placeholder="2026-05-01T12:00:00Z" value={formState.banned_until} onChange={(event) => setFormState((current) => ({ ...current, banned_until: event.target.value }))} />
          </Field>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
            <input checked={formState.is_banned} className="h-4 w-4" disabled={!canManageBans} onChange={(event) => setFormState((current) => ({ ...current, is_banned: event.target.checked }))} type="checkbox" />
            <span>Mark record as active ban</span>
          </label>
          {actionError ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{actionError}</div> : null}
          <div className="flex flex-wrap gap-3">
            <Button disabled={!canManageBans || saving || !formState.user_id} type="button" onClick={() => void handleSave()}>
              {saving ? 'Saving...' : formState.id ? 'Save changes' : 'Create ban'}
            </Button>
            <Button type="button" variant="secondary" onClick={resetForm}>Reset</Button>
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete ban record"
        description={pendingDelete ? `Delete the moderation record for ${pendingDelete.email ?? pendingDelete.user_id}?` : ''}
        confirmLabel="Delete ban"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
