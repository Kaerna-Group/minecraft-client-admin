import { useEffect, useMemo, useState } from 'react';
import type { CursorValue } from '@shared/lib/cursor';

import { deleteRole, fetchRoles, upsertRole, type RoleQuery, type TableDensity, type UserRole } from '@entities/admin/api/admin-api';
import { useAuth } from '@features/auth/model/useAuth';
import { normalizeAdminErrorMessage } from '@shared/lib/admin-errors';
import { useCursorResource } from '@shared/lib/react/useCursorResource';
import { useDebouncedValue } from '@shared/lib/react/useDebouncedValue';
import { useManagedForm } from '@shared/lib/react/useManagedForm';
import { useUnsavedChangesGuard } from '@shared/lib/react/useUnsavedChangesGuard';
import { useRouteViewState } from '@shared/lib/url-state';
import { firstFieldError, validateRoleFields } from '@shared/lib/validation/admin-validation';
import { useToast } from '@shared/lib/react/toast/useToast';
import { Button } from '@shared/ui/Button';
import { CopyButton } from '@shared/ui/CopyButton';
import { EntityTable } from '@shared/ui/EntityTable';
import { Field, SelectInput, TextInput } from '@shared/ui/Field';
import { ConfirmDialog } from '@shared/ui/feedback/ConfirmDialog';
import { PaginationControls } from '@shared/ui/PaginationControls';
import { Panel } from '@shared/ui/Panel';
import { ReadonlyBadge } from '@shared/ui/ReadonlyBadge';
import { SectionHint } from '@shared/ui/SectionHint';

const PAGE_SIZE = 20;
const defaultView = {
  search: '',
  sortBy: 'created_at',
  sortDirection: 'desc',
  density: 'comfortable',
  selectedKey: '',
  cursor: null as CursorValue | null,
  history: [] as Array<CursorValue | null>,
};

const emptyForm = { user_id: '', role: 'player' };
const sortOptions: Array<{ value: NonNullable<RoleQuery['sortBy']>; label: string }> = [
  { value: 'user_id', label: 'User ID' },
  { value: 'email', label: 'Email' },
  { value: 'role', label: 'Role' },
  { value: 'created_at', label: 'Assigned at' },
];

export function RolesSection() {
  const { canManageRoles, isAdmin } = useAuth();
  const { pushToast } = useToast();
  const { state: view, setState } = useRouteViewState(defaultView);
  const [pendingDelete, setPendingDelete] = useState<UserRole | null>(null);
  const debouncedSearch = useDebouncedValue(view.search, 350);
  const density = view.density as TableDensity;
  const form = useManagedForm(emptyForm, validateRoleFields);
  const replaceForm = form.replace;
  useUnsavedChangesGuard(form.isDirty);

  const queryKey = useMemo(() => JSON.stringify({ search: debouncedSearch, sortBy: view.sortBy, sortDirection: view.sortDirection }), [debouncedSearch, view.sortBy, view.sortDirection]);
  const { data, error, loading, refresh, hasMore, hasPrevious, goNext, goPrevious } = useCursorResource(
    (afterCursor) => fetchRoles({ search: debouncedSearch, sortBy: view.sortBy as NonNullable<RoleQuery['sortBy']>, sortDirection: view.sortDirection as NonNullable<RoleQuery['sortDirection']>, pageSize: PAGE_SIZE, afterCursor }),
    queryKey,
    {
      restoredState: { currentCursor: view.cursor, history: view.history },
      restoreKey: JSON.stringify({ cursor: view.cursor, history: view.history }),
      onStateChange: ({ currentCursor, history }) => {
        if (JSON.stringify(currentCursor) === JSON.stringify(view.cursor) && JSON.stringify(history) === JSON.stringify(view.history)) {
          return;
        }
        setState({ cursor: currentCursor, history });
      },
    },
  );

  const selectedRole = data.find((row) => `${row.user_id}:${row.role}` === view.selectedKey) ?? null;

  useEffect(() => {
    if (!selectedRole) {
      replaceForm(emptyForm);
      return;
    }

    replaceForm({ user_id: selectedRole.user_id, role: selectedRole.role as typeof emptyForm.role });
  }, [replaceForm, selectedRole]);

  const handleEdit = (role: UserRole) => {
    if (form.isDirty && !window.confirm('You have unsaved changes. Open another role assignment anyway?')) {
      return;
    }

    setState({ selectedKey: `${role.user_id}:${role.role}` });
  };

  const handleReset = () => {
    if (form.isDirty && !window.confirm('Discard unsaved changes?')) {
      return;
    }
    form.reset();
  };

  const handleClose = () => {
    if (form.isDirty && !window.confirm('Discard unsaved changes and close this role editor?')) {
      return;
    }
    setState({ selectedKey: '' });
    replaceForm(emptyForm);
  };

  const handleSave = async () => {
    form.setSubmitAttempted(true);
    if (!canManageRoles || !form.isValid || !form.isDirty) {
      return;
    }

    try {
      await upsertRole(form.value);
      await refresh();
      form.markSaved({ user_id: form.value.user_id.trim(), role: form.value.role });
      pushToast({ title: 'Role saved', description: `${form.value.user_id} -> ${form.value.role}` });
    } catch (nextError) {
      pushToast({ title: 'Failed to save role', description: normalizeAdminErrorMessage(nextError), tone: 'error' });
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
      if (selectedRole && selectedRole.user_id === pendingDelete.user_id && selectedRole.role === pendingDelete.role) {
        handleClose();
      }
    } catch (nextError) {
      pushToast({ title: 'Failed to remove role', description: normalizeAdminErrorMessage(nextError), tone: 'error' });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_390px]">
        <Panel title="Roles" eyebrow="Cursor-paginated access matrix" action={<Button type="button" variant="secondary" onClick={() => void refresh()}>Refresh</Button>}>
          <div className="grid gap-4 lg:grid-cols-4">
            <Field label="Search"><TextInput placeholder="Email, UUID, role" value={view.search} onChange={(event) => setState({ search: event.target.value, cursor: null as CursorValue | null, history: [], selectedKey: '' })} /></Field>
            <Field label="Sort by"><SelectInput value={view.sortBy} onChange={(event) => setState({ sortBy: event.target.value, cursor: null as CursorValue | null, history: [] })}>{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectInput></Field>
            <Field label="Direction"><SelectInput value={view.sortDirection} onChange={(event) => setState({ sortDirection: event.target.value, cursor: null as CursorValue | null, history: [] })}><option value="desc">Descending</option><option value="asc">Ascending</option></SelectInput></Field>
            <Field label="Density"><SelectInput value={density} onChange={(event) => setState({ density: event.target.value as TableDensity })}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></SelectInput></Field>
          </div>
          {error ? <SectionHint tone="warning">{normalizeAdminErrorMessage(error)}</SectionHint> : null}
          <EntityTable
            columns={[
              { key: 'email', header: 'Email', render: (row) => <div className="flex items-center gap-2"><span>{row.email ?? '—'}</span>{row.email ? <CopyButton value={row.email} /> : null}</div> },
              { key: 'user_id', header: 'User ID', render: (row) => <div className="flex items-center gap-2"><span className="truncate">{row.user_id}</span><CopyButton value={row.user_id} /></div> },
              { key: 'role', header: 'Role', render: (row) => <span className="rounded-full border border-accent-300/30 bg-accent-300/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent-200">{row.role}</span> },
              { key: 'created_at', header: 'Assigned', render: (row) => row.created_at ?? '—' },
              { key: 'actions', header: 'Actions', render: (row) => <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => handleEdit(row)}>Inspect</Button><Button type="button" variant="danger" disabled={!canManageRoles} onClick={() => setPendingDelete(row)}>Remove</Button></div> },
            ]}
            density={density}
            emptyLabel="No roles found."
            getRowKey={(row) => `${row.user_id}:${row.role}`}
            loading={loading}
            rows={data}
          />
          <PaginationControls itemCount={data.length} hasPrevious={hasPrevious} hasMore={hasMore} loading={loading} onPrevious={goPrevious} onNext={goNext} />
        </Panel>

        <Panel title={selectedRole ? 'Edit role' : 'Assign role'} eyebrow={selectedRole ? 'Detail pane' : 'Create mode'}>
          {!isAdmin ? <SectionHint tone="warning">Moderators can inspect the access matrix, but only admins can grant or revoke roles.</SectionHint> : null}
          {selectedRole && !canManageRoles ? <ReadonlyBadge /> : null}
          <Field label="User ID" error={form.shouldShowError('user_id') ? form.errors.user_id : ''}><TextInput disabled={!canManageRoles} value={form.value.user_id} onChange={(event) => form.setField('user_id', event.target.value)} /></Field>
          <Field label="Role" error={form.shouldShowError('role') ? form.errors.role : ''}><SelectInput disabled={!canManageRoles} value={form.value.role} onChange={(event) => form.setField('role', event.target.value as typeof emptyForm.role)}><option value="player">Player</option><option value="moderator">Moderator</option><option value="admin">Admin</option></SelectInput></Field>
          {!form.isValid && form.submitAttempted ? <SectionHint tone="warning">{firstFieldError(form.errors)}</SectionHint> : null}
          <div className="flex flex-wrap gap-3">
            <Button disabled={!canManageRoles || !form.isDirty || !form.isValid} type="button" onClick={() => void handleSave()}>Save role</Button>
            <Button type="button" variant="secondary" onClick={handleReset}>Reset</Button>
            <Button type="button" variant="secondary" onClick={handleClose}>{selectedRole ? 'Close' : 'Clear'}</Button>
          </div>
        </Panel>
      </div>

      <ConfirmDialog open={Boolean(pendingDelete)} title="Remove role" description={pendingDelete ? `Remove ${pendingDelete.role} access from ${pendingDelete.email ?? pendingDelete.user_id}?` : ''} confirmLabel="Remove role" onCancel={() => setPendingDelete(null)} onConfirm={() => void handleDelete()} />
    </>
  );
}

