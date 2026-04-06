import { useState } from 'react';

import { deleteRole, fetchRoles, upsertRole, type UserRole } from '@entities/admin/api/admin-api';
import { useAuth } from '@features/auth/model/useAuth';
import { useAsyncResource } from '@shared/lib/react/useAsyncResource';
import { Button } from '@shared/ui/Button';
import { EntityTable } from '@shared/ui/EntityTable';
import { Field, TextInput } from '@shared/ui/Field';
import { Panel } from '@shared/ui/Panel';

export function RolesSection() {
  const { canManageRoles } = useAuth();
  const { data, error, loading, refresh } = useAsyncResource(fetchRoles);
  const [formState, setFormState] = useState<UserRole>({ user_id: '', role: '' });
  const [actionError, setActionError] = useState('');

  const handleSave = async () => {
    if (!canManageRoles) return;

    setActionError('');

    try {
      await upsertRole(formState);
      setFormState({ user_id: '', role: '' });
      await refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Unknown error');
    }
  };

  const handleDelete = async (row: UserRole) => {
    if (!canManageRoles) return;

    setActionError('');

    try {
      await deleteRole(row);
      await refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Unknown error');
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
      <Panel title="Roles" eyebrow="Protected entity">
        {loading ? <div className="text-sm text-slate-400">Loading roles...</div> : null}
        {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
        <EntityTable
          columns={[
            { key: 'user_id', header: 'User ID', render: (row) => row.user_id },
            { key: 'role', header: 'Role', render: (row) => row.role },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) =>
                canManageRoles ? (
                  <button className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100" onClick={() => void handleDelete(row)} type="button">
                    Remove
                  </button>
                ) : (
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Read only</span>
                ),
            },
          ]}
          emptyLabel="No roles found."
          rows={data ?? []}
        />
      </Panel>

      <Panel title="Add or update role" eyebrow={canManageRoles ? 'Mutation' : 'Admin only'}>
        {!canManageRoles ? (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Only admins can grant or revoke roles. Moderators stay read-only here.
          </div>
        ) : null}
        <Field label="User ID">
          <TextInput disabled={!canManageRoles} value={formState.user_id} onChange={(event) => setFormState((current) => ({ ...current, user_id: event.target.value }))} />
        </Field>
        <Field label="Role">
          <TextInput disabled={!canManageRoles} value={formState.role} onChange={(event) => setFormState((current) => ({ ...current, role: event.target.value }))} />
        </Field>
        {actionError ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{actionError}</div> : null}
        <Button disabled={!canManageRoles} onClick={() => void handleSave()} type="button">Save role</Button>
      </Panel>
    </div>
  );
}
