import { useEffect, useMemo, useState } from 'react';
import type { CursorValue } from '@shared/lib/cursor';

import { deleteBan, fetchBans, upsertBan, type BanQuery, type TableDensity, type UserBan } from '@entities/admin/api/admin-api';
import { useAuth } from '@features/auth/model/useAuth';
import { normalizeAdminErrorMessage } from '@shared/lib/admin-errors';
import { useCursorResource } from '@shared/lib/react/useCursorResource';
import { useDebouncedValue } from '@shared/lib/react/useDebouncedValue';
import { useManagedForm } from '@shared/lib/react/useManagedForm';
import { useUnsavedChangesGuard } from '@shared/lib/react/useUnsavedChangesGuard';
import { useRouteViewState } from '@shared/lib/url-state';
import { firstFieldError, validateBanFields } from '@shared/lib/validation/admin-validation';
import { useToast } from '@shared/lib/react/toast/useToast';
import { Button } from '@shared/ui/Button';
import { CopyButton } from '@shared/ui/CopyButton';
import { EntityTable } from '@shared/ui/EntityTable';
import { Field, SelectInput, TextArea, TextInput } from '@shared/ui/Field';
import { ConfirmDialog } from '@shared/ui/feedback/ConfirmDialog';
import { PaginationControls } from '@shared/ui/PaginationControls';
import { Panel } from '@shared/ui/Panel';
import { SectionHint } from '@shared/ui/SectionHint';

const PAGE_SIZE = 20;
const sortOptions: Array<{ value: NonNullable<BanQuery['sortBy']>; label: string }> = [
  { value: 'created_at', label: 'Created' },
  { value: 'email', label: 'Email' },
  { value: 'banned_until', label: 'Banned until' },
];
const emptyForm = { user_id: '', is_banned: true, reason: '', banned_until: '' };
const defaultView = {
  search: '',
  statusFilter: 'all',
  sortBy: 'created_at',
  sortDirection: 'desc',
  density: 'comfortable',
  selectedId: '',
  cursor: null as CursorValue | null,
  history: [] as Array<CursorValue | null>,
};

export function BansSection() {
  const { canManageBans } = useAuth();
  const { pushToast } = useToast();
  const { state: view, setState } = useRouteViewState(defaultView);
  const [pendingDelete, setPendingDelete] = useState<UserBan | null>(null);
  const debouncedSearch = useDebouncedValue(view.search, 350);
  const density = view.density as TableDensity;
  const form = useManagedForm(emptyForm, validateBanFields);
  const replaceForm = form.replace;
  useUnsavedChangesGuard(form.isDirty);

  const queryKey = useMemo(() => JSON.stringify({ search: debouncedSearch, statusFilter: view.statusFilter, sortBy: view.sortBy, sortDirection: view.sortDirection }), [debouncedSearch, view.sortBy, view.sortDirection, view.statusFilter]);
  const { data, error, loading, refresh, hasMore, hasPrevious, goNext, goPrevious } = useCursorResource(
    (afterCursor) => fetchBans({ search: debouncedSearch, statusFilter: view.statusFilter as NonNullable<BanQuery['statusFilter']>, sortBy: view.sortBy as NonNullable<BanQuery['sortBy']>, sortDirection: view.sortDirection as NonNullable<BanQuery['sortDirection']>, pageSize: PAGE_SIZE, afterCursor }),
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

  const selectedBan = data.find((row) => row.id === view.selectedId) ?? null;

  useEffect(() => {
    if (!selectedBan) {
      replaceForm(emptyForm);
      return;
    }

    replaceForm({ user_id: selectedBan.user_id, is_banned: selectedBan.is_banned, reason: selectedBan.reason ?? '', banned_until: selectedBan.banned_until ?? '' });
  }, [replaceForm, selectedBan]);

  const handleEdit = (ban: UserBan) => {
    if (form.isDirty && !window.confirm('You have unsaved changes. Open another moderation record anyway?')) {
      return;
    }

    setState({ selectedId: ban.id });
  };

  const handleReset = () => {
    if (form.isDirty && !window.confirm('Discard unsaved changes?')) {
      return;
    }
    form.reset();
  };

  const handleClose = () => {
    if (form.isDirty && !window.confirm('Discard unsaved changes and close this moderation record?')) {
      return;
    }
    setState({ selectedId: '' });
    replaceForm(emptyForm);
  };

  const handleSave = async () => {
    form.setSubmitAttempted(true);
    if (!canManageBans || !form.isValid || !form.isDirty) {
      return;
    }

    try {
      await upsertBan({
        id: selectedBan?.id,
        user_id: form.value.user_id.trim(),
        is_banned: form.value.is_banned,
        reason: form.value.reason.trim() || null,
        banned_until: form.value.banned_until.trim() || null,
      });
      await refresh();
      form.markSaved({ ...form.value, user_id: form.value.user_id.trim(), reason: form.value.reason.trim(), banned_until: form.value.banned_until.trim() });
      pushToast({ title: selectedBan ? 'Ban updated' : 'Ban created', description: form.value.user_id.trim() });
    } catch (nextError) {
      pushToast({ title: 'Failed to save ban', description: normalizeAdminErrorMessage(nextError), tone: 'error' });
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
      if (selectedBan?.id === pendingDelete.id) {
        handleClose();
      }
    } catch (nextError) {
      pushToast({ title: 'Failed to delete ban', description: normalizeAdminErrorMessage(nextError), tone: 'error' });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_390px]">
        <Panel title="Bans" eyebrow="Cursor-paginated moderation queue" action={<Button type="button" variant="secondary" onClick={() => void refresh()}>Refresh</Button>}>
          <div className="grid gap-4 lg:grid-cols-5">
            <Field label="Search"><TextInput placeholder="Email, UUID, reason" value={view.search} onChange={(event) => setState({ search: event.target.value, cursor: null as CursorValue | null, history: [], selectedId: '' })} /></Field>
            <Field label="State"><SelectInput value={view.statusFilter} onChange={(event) => setState({ statusFilter: event.target.value, cursor: null as CursorValue | null, history: [], selectedId: '' })}><option value="all">All</option><option value="active">Active bans</option><option value="inactive">Inactive records</option></SelectInput></Field>
            <Field label="Sort by"><SelectInput value={view.sortBy} onChange={(event) => setState({ sortBy: event.target.value, cursor: null as CursorValue | null, history: [] })}>{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectInput></Field>
            <Field label="Direction"><SelectInput value={view.sortDirection} onChange={(event) => setState({ sortDirection: event.target.value, cursor: null as CursorValue | null, history: [] })}><option value="desc">Descending</option><option value="asc">Ascending</option></SelectInput></Field>
            <Field label="Density"><SelectInput value={density} onChange={(event) => setState({ density: event.target.value as TableDensity })}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></SelectInput></Field>
          </div>
          {error ? <SectionHint tone="warning">{normalizeAdminErrorMessage(error)}</SectionHint> : null}
          <EntityTable
            columns={[
              { key: 'email', header: 'Email', render: (row) => <div className="flex items-center gap-2"><span>{row.email ?? '—'}</span>{row.email ? <CopyButton value={row.email} /> : null}</div> },
              { key: 'user_id', header: 'User ID', render: (row) => <div className="flex items-center gap-2"><span className="truncate">{row.user_id}</span><CopyButton value={row.user_id} /></div> },
              { key: 'state', header: 'State', render: (row) => (row.is_banned ? 'Active' : 'Inactive') },
              { key: 'reason', header: 'Reason', render: (row) => row.reason ?? '—' },
              { key: 'actions', header: 'Actions', render: (row) => <div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => handleEdit(row)}>Inspect</Button><Button type="button" variant="danger" disabled={!canManageBans} onClick={() => setPendingDelete(row)}>Delete</Button></div> },
            ]}
            density={density}
            emptyLabel="No ban records found."
            getRowKey={(row) => row.id}
            loading={loading}
            rows={data}
          />
          <PaginationControls itemCount={data.length} hasPrevious={hasPrevious} hasMore={hasMore} loading={loading} onPrevious={goPrevious} onNext={goNext} />
        </Panel>

        <Panel title={selectedBan ? 'Edit ban' : 'Create ban'} eyebrow={selectedBan ? 'Detail pane' : 'Create mode'}>
          {!canManageBans ? <SectionHint tone="warning">Your role can review bans, but only admins and moderators can change them.</SectionHint> : null}
          <Field label="User ID" error={form.shouldShowError('user_id') ? form.errors.user_id : ''}><TextInput disabled={!canManageBans} value={form.value.user_id} onChange={(event) => form.setField('user_id', event.target.value)} /></Field>
          <Field label="Reason"><TextArea disabled={!canManageBans} value={form.value.reason} onChange={(event) => form.setField('reason', event.target.value)} /></Field>
          <Field label="Banned until (ISO or empty)" error={form.shouldShowError('banned_until') ? form.errors.banned_until : ''}><TextInput disabled={!canManageBans} placeholder="2026-05-01T12:00:00Z" value={form.value.banned_until} onChange={(event) => form.setField('banned_until', event.target.value)} /></Field>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200"><input checked={form.value.is_banned} className="h-4 w-4" disabled={!canManageBans} onChange={(event) => form.setField('is_banned', event.target.checked)} type="checkbox" /><span>Mark record as active ban</span></label>
          {!form.isValid && form.submitAttempted ? <SectionHint tone="warning">{firstFieldError(form.errors)}</SectionHint> : null}
          <div className="flex flex-wrap gap-3"><Button disabled={!canManageBans || !form.isDirty || !form.isValid} type="button" onClick={() => void handleSave()}>{selectedBan ? 'Save changes' : 'Create ban'}</Button><Button type="button" variant="secondary" onClick={handleReset}>Reset</Button><Button type="button" variant="secondary" onClick={handleClose}>{selectedBan ? 'Close' : 'Clear'}</Button></div>
        </Panel>
      </div>

      <ConfirmDialog open={Boolean(pendingDelete)} title="Delete ban record" description={pendingDelete ? `Delete the moderation record for ${pendingDelete.email ?? pendingDelete.user_id}?` : ''} confirmLabel="Delete ban" onCancel={() => setPendingDelete(null)} onConfirm={() => void handleDelete()} />
    </>
  );
}

