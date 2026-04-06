import { useMemo, useState } from 'react';

import { deleteRole, fetchRoles, upsertRole, type RoleQuery, type UserRole } from '@entities/admin/api/admin-api';
import { useAuth } from '@features/auth/model/useAuth';
import { useToast } from '@shared/lib/react/toast/useToast';
import { useCursorResource } from '@shared/lib/react/useCursorResource';
import { Button } from '@shared/ui/Button';
import { EntityTable } from '@shared/ui/EntityTable';
import { Field, SelectInput, TextInput } from '@shared/ui/Field';
import { ConfirmDialog } from '@shared/ui/feedback/ConfirmDialog';
import { PaginationControls } from '@shared/ui/PaginationControls';
import { Panel } from '@shared/ui/Panel';

type RoleFormState = {
  user_id: string;
  role: 'admin' | 'moderator' | 'player';
};

const PAGE_SIZE = 20;
const emptyForm: RoleFormState = {
  user_id: '',
  role: 'player',
};

const sortOptions: Array<{ value: NonNullable<RoleQuery['sortBy']>; label: string }> = [
  { value: 'user_id', label: 'User ID' },
  { value: 'email', label: 'Email' },
  { value: 'role', label: 'Role' },
  { value: 'created_at', label: 'Assigned at' },
];

export function RolesSection() {
  const { canManageRoles, isAdmin } = useAuth();
  const { pushToast } = useToast();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<NonNullable<RoleQuery['sortBy']>>('created_at');
  const [sortDirection, setSortDirection] = useState<NonNullable<RoleQuery['sortDirection']>>('desc');
  const [formState, setFormState] = useState<RoleFormState>(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<UserRole | null>(null);
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);

  const queryKey = useMemo(() => JSON.stringify({ search, sortBy, sortDirection }), [search, sortBy, sortDirection]);
  const { data, error, loading, refresh, hasMore, hasPrevious, goNext, goPrevious } = useCursorResource(
    (afterCursor) => fetchRoles({ search, sortBy, sortDirection, pageSize: PAGE_SIZE, afterCursor }),
    queryKey,
  );

  const handleEdit = (role: UserRole) => {
    setFormState({
      user_id: role.user_id,
      role: role.role as RoleFormState['role'],
    });
    setActionError('');
  };

  const resetForm = () => {
    setFormState(emptyForm);
    setActionError('');
  };

  const handleSave = async () => {
    if (!canManageRoles) {
      return;
    }

    setSaving(true);
    setActionError('');

    try {
      await upsertRole(formState);
      await refresh();
      pushToast({ title: 'Role saved', description: `${formState.user_id} -> ${formState.role}` });
      resetForm();
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Unknown error';
      setActionError(message);
      pushToast({ title: 'Failed to save role', description: message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete || !canManageRoles) {
      return;
    }

    try {
      await deleteRole(pendingDelete);
      await refresh();
      pushToast({ title: 'Role removed', description: `${pendingDelete.user_id} -> ${pendingDelete.role}` });
      if (formState.user_id === pendingDelete.user_id && formState.role === pendingDelete.role) {
        resetForm();
      }
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Unknown error';
      pushToast({ title: 'Failed to remove role', description: message, tone: 'error' });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_380px]">
        <Panel
          title="Roles"
          eyebrow="Cursor-paginated access matrix"
          action={<Button type="button" variant="secondary" onClick={() => void refresh()}>Refresh</Button>}
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Search">
              <TextInput placeholder="Email, UUID, role" value={search} onChange={(event) => setSearch(event.target.value)} />
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
          {loading ? <div className="text-sm text-slate-400">Loading roles...</div> : null}
          {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
          <EntityTable
            columns={[
              { key: 'email', header: 'Email', render: (row) => row.email ?? '—' },
              { key: 'user_id', header: 'User ID', render: (row) => row.user_id },
              {
                key: 'role',
                header: 'Role',
                render: (row) => (
                  <span className="rounded-full border border-accent-300/30 bg-accent-300/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent-200">
                    {row.role}
                  </span>
                ),
              },
              { key: 'created_at', header: 'Assigned', render: (row) => row.created_at ?? '—' },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" disabled={!isAdmin} onClick={() => handleEdit(row)}>
                      Edit
                    </Button>
                    <Button type="button" variant="danger" disabled={!canManageRoles} onClick={() => setPendingDelete(row)}>
                      Remove
                    </Button>
                  </div>
                ),
              },
            ]}
            emptyLabel="No roles found."
            getRowKey={(row) => `${row.user_id}:${row.role}`}
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

        <Panel title={formState.user_id ? 'Edit role' : 'Assign role'} eyebrow={formState.user_id ? 'Edit mode' : 'Create mode'}>
          {!canManageRoles ? (
            <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Moderators can review the access matrix, but only admins can grant or revoke roles.
            </div>
          ) : null}
          <Field label="User ID">
            <TextInput disabled={!canManageRoles} value={formState.user_id} onChange={(event) => setFormState((current) => ({ ...current, user_id: event.target.value }))} />
          </Field>
          <Field label="Role">
            <SelectInput disabled={!canManageRoles} value={formState.role} onChange={(event) => setFormState((current) => ({ ...current, role: event.target.value as RoleFormState['role'] }))}>
              <option value="player">Player</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </SelectInput>
          </Field>
          {actionError ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{actionError}</div> : null}
          <div className="flex flex-wrap gap-3">
            <Button disabled={!canManageRoles || saving || !formState.user_id} type="button" onClick={() => void handleSave()}>
              {saving ? 'Saving...' : 'Save role'}
            </Button>
            <Button type="button" variant="secondary" onClick={resetForm}>Reset</Button>
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Remove role"
        description={pendingDelete ? `Remove ${pendingDelete.role} access from ${pendingDelete.email ?? pendingDelete.user_id}?` : ''}
        confirmLabel="Remove role"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
