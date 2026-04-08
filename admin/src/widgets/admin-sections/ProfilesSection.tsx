import { useEffect, useMemo } from 'react';
import type { CursorValue } from '@shared/lib/cursor';

import { fetchProfiles, updateProfile, type Profile, type TableDensity } from '@entities/admin/api/admin-api';
import { useAuth } from '@features/auth/model/useAuth';
import { normalizeAdminErrorMessage } from '@shared/lib/admin-errors';
import { useCursorResource } from '@shared/lib/react/useCursorResource';
import { useDebouncedValue } from '@shared/lib/react/useDebouncedValue';
import { useManagedForm } from '@shared/lib/react/useManagedForm';
import { useUnsavedChangesGuard } from '@shared/lib/react/useUnsavedChangesGuard';
import { buildViewHref, useRouteViewState } from '@shared/lib/url-state';
import { firstFieldError, validateProfileFields } from '@shared/lib/validation/admin-validation';
import { useToast } from '@shared/lib/react/toast/useToast';
import { Button } from '@shared/ui/Button';
import { CopyButton } from '@shared/ui/CopyButton';
import { EntityTable } from '@shared/ui/EntityTable';
import { Field, SelectInput, TextInput } from '@shared/ui/Field';
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
  selectedId: '',
  cursor: null as CursorValue | null,
  history: [] as Array<CursorValue | null>,
};

export function ProfilesSection() {
  const { canManageProfiles } = useAuth();
  const { pushToast } = useToast();
  const { state: view, setState } = useRouteViewState(defaultView);
  const debouncedSearch = useDebouncedValue(view.search, 350);
  const density = view.density as TableDensity;
  const form = useManagedForm({ nickname: '', avatar_url: '' }, validateProfileFields);
  const replaceForm = form.replace;
  useUnsavedChangesGuard(form.isDirty);

  const queryKey = useMemo(() => JSON.stringify({ search: debouncedSearch, sortBy: view.sortBy, sortDirection: view.sortDirection }), [debouncedSearch, view.sortBy, view.sortDirection]);
  const { data, error, loading, refresh, hasMore, hasPrevious, goNext, goPrevious } = useCursorResource(
    (afterCursor) => fetchProfiles({ search: debouncedSearch, sortBy: view.sortBy as 'created_at' | 'email' | 'nickname' | 'last_login_at', sortDirection: view.sortDirection as 'asc' | 'desc', pageSize: PAGE_SIZE, afterCursor }),
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

  const selectedProfile = data.find((profile) => profile.id === view.selectedId) ?? null;

  useEffect(() => {
    if (!selectedProfile) {
      replaceForm({ nickname: '', avatar_url: '' });
      return;
    }

    replaceForm({ nickname: selectedProfile.nickname ?? '', avatar_url: selectedProfile.avatar_url ?? '' });
  }, [replaceForm, selectedProfile]);

  const handleSelect = (profile: Profile) => {
    if (form.isDirty && !window.confirm('You have unsaved changes. Open another profile anyway?')) {
      return;
    }

    setState({ selectedId: profile.id });
  };

  const handleReset = () => {
    if (form.isDirty && !window.confirm('Discard unsaved changes?')) {
      return;
    }

    form.reset();
  };

  const handleClose = () => {
    if (form.isDirty && !window.confirm('Discard unsaved changes and close this profile?')) {
      return;
    }

    setState({ selectedId: '' });
    replaceForm({ nickname: '', avatar_url: '' });
  };

  const handleSave = async () => {
    if (!selectedProfile || !canManageProfiles || !form.isValid || !form.isDirty) {
      form.setSubmitAttempted(true);
      return;
    }

    try {
      await updateProfile({
        id: selectedProfile.id,
        nickname: form.value.nickname.trim() || null,
        avatar_url: form.value.avatar_url.trim() || null,
      });
      const nextValue = { nickname: form.value.nickname.trim(), avatar_url: form.value.avatar_url.trim() };
      form.markSaved(nextValue);
      await refresh();
      pushToast({ title: 'Profile updated', description: selectedProfile.email ?? selectedProfile.id });
    } catch (nextError) {
      const message = normalizeAdminErrorMessage(nextError);
      pushToast({ title: 'Failed to update profile', description: message, tone: 'error' });
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_390px]">
      <Panel title="Profiles" eyebrow="Cursor-paginated" action={<Button type="button" variant="secondary" onClick={() => void refresh()}>Refresh</Button>}>
        <div className="grid gap-4 lg:grid-cols-4">
          <Field label="Search"><TextInput placeholder="Email, nickname, UUID" value={view.search} onChange={(event) => setState({ search: event.target.value, cursor: null, history: [], selectedId: '' })} /></Field>
          <Field label="Sort by"><SelectInput value={view.sortBy} onChange={(event) => setState({ sortBy: event.target.value, cursor: null, history: [] })}><option value="created_at">Created</option><option value="email">Email</option><option value="nickname">Nickname</option><option value="last_login_at">Last login</option></SelectInput></Field>
          <Field label="Direction"><SelectInput value={view.sortDirection} onChange={(event) => setState({ sortDirection: event.target.value, cursor: null, history: [] })}><option value="desc">Descending</option><option value="asc">Ascending</option></SelectInput></Field>
          <Field label="Density"><SelectInput value={density} onChange={(event) => setState({ density: event.target.value as TableDensity })}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></SelectInput></Field>
        </div>
        {error ? <SectionHint tone="warning">{normalizeAdminErrorMessage(error)}</SectionHint> : null}
        <EntityTable
          columns={[
            { key: 'email', header: 'Email', render: (row) => <div className="flex items-center gap-2"><span>{row.email ?? '—'}</span>{row.email ? <CopyButton label="Copy" value={row.email} /> : null}</div> },
            { key: 'nickname', header: 'Nickname', render: (row) => row.nickname ?? '—' },
            { key: 'id', header: 'UUID', render: (row) => <div className="flex items-center gap-2"><span className="truncate">{row.id}</span><CopyButton label="Copy" value={row.id} /></div> },
            { key: 'last_login_at', header: 'Last login', render: (row) => row.last_login_at ?? '—' },
            { key: 'actions', header: 'Actions', render: (row) => <div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => handleSelect(row)}>{view.selectedId === row.id ? 'Open' : 'Inspect'}</Button><a className="text-sm text-accent-200 hover:text-accent-100" href={buildViewHref('/profiles', { ...defaultView, selectedId: row.id })}>Link</a></div> },
          ]}
          density={density}
          emptyLabel="No profiles returned by Supabase."
          getRowKey={(row) => row.id}
          loading={loading}
          rows={data}
        />
        <PaginationControls itemCount={data.length} hasPrevious={hasPrevious} hasMore={hasMore} loading={loading} onPrevious={goPrevious} onNext={goNext} />
      </Panel>

      <Panel title={selectedProfile ? 'Edit profile' : 'Profile details'} eyebrow={selectedProfile ? 'Detail pane' : 'Select a row'}>
        {!selectedProfile && !loading ? <SectionHint>Pick a profile to inspect metadata and optionally edit nickname/avatar fields.</SectionHint> : null}
        {selectedProfile ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              <div className="flex items-center justify-between gap-3"><div className="font-medium text-white">{selectedProfile.email ?? selectedProfile.id}</div>{!canManageProfiles ? <ReadonlyBadge /> : null}</div>
              <div className="mt-2 flex items-center gap-2 text-slate-400"><span>{selectedProfile.id}</span><CopyButton label="Copy UUID" value={selectedProfile.id} /></div>
            </div>
            {!canManageProfiles ? <SectionHint tone="warning">Only admins can edit profile metadata. Moderators can inspect this record in read-only mode.</SectionHint> : null}
            <Field label="Nickname"><TextInput disabled={!canManageProfiles} value={form.value.nickname} onChange={(event) => form.setField('nickname', event.target.value)} /></Field>
            <Field label="Avatar URL" error={form.shouldShowError('avatar_url') ? form.errors.avatar_url : ''}><TextInput disabled={!canManageProfiles} value={form.value.avatar_url} onChange={(event) => form.setField('avatar_url', event.target.value)} /></Field>
            {!form.isValid && form.submitAttempted ? <SectionHint tone="warning">{firstFieldError(form.errors)}</SectionHint> : null}
            <div className="flex flex-wrap gap-3">
              <Button disabled={!canManageProfiles || !form.isDirty || !form.isValid} type="button" onClick={() => void handleSave()}>Save changes</Button>
              <Button type="button" variant="secondary" onClick={handleReset}>Reset</Button>
              <Button type="button" variant="secondary" onClick={handleClose}>Close</Button>
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
