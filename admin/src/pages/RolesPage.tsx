import { useState } from 'react';

import { Button } from '../components/Button';
import { EntityTable } from '../components/EntityTable';
import { Field, TextInput } from '../components/Field';
import { Panel } from '../components/Panel';
import { deleteRole, fetchRoles, upsertRole, type UserRole } from '../lib/admin-api';
import { useAsyncResource } from '../lib/useAsyncResource';

export function RolesPage() {
  const { data, error, loading, refresh } = useAsyncResource(fetchRoles);
  const [formState, setFormState] = useState<UserRole>({ user_id: '', role: '' });
  const [actionError, setActionError] = useState('');

  const handleSave = async () => {
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
              render: (row) => (
                <button className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100" onClick={() => void handleDelete(row)} type="button">
                  Remove
                </button>
              ),
            },
          ]}
          emptyLabel="No roles found."
          rows={data ?? []}
        />
      </Panel>

      <Panel title="Add or update role" eyebrow="Mutation">
        <Field label="User ID">
          <TextInput value={formState.user_id} onChange={(event) => setFormState((current) => ({ ...current, user_id: event.target.value }))} />
        </Field>
        <Field label="Role">
          <TextInput value={formState.role} onChange={(event) => setFormState((current) => ({ ...current, role: event.target.value }))} />
        </Field>
        {actionError ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{actionError}</div> : null}
        <Button onClick={() => void handleSave()} type="button">Save role</Button>
      </Panel>
    </div>
  );
}
