import { useEffect, useMemo, useState } from 'react';

import { fetchProfiles, updateProfile, type Profile } from '@entities/admin/api/admin-api';
import { useAuth } from '@features/auth/model/useAuth';
import { useToast } from '@shared/lib/react/toast/useToast';
import { useCursorResource } from '@shared/lib/react/useCursorResource';
import { Button } from '@shared/ui/Button';
import { EntityTable } from '@shared/ui/EntityTable';
import { Field, SelectInput, TextInput } from '@shared/ui/Field';
import { PaginationControls } from '@shared/ui/PaginationControls';
import { Panel } from '@shared/ui/Panel';

const PAGE_SIZE = 20;

export function ProfilesSection() {
  const { canManageProfiles } = useAuth();
  const { pushToast } = useToast();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'email' | 'nickname' | 'last_login_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [formState, setFormState] = useState({ nickname: '', avatar_url: '' });
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);

  const queryKey = useMemo(() => JSON.stringify({ search, sortBy, sortDirection }), [search, sortBy, sortDirection]);
  const { data, error, loading, refresh, hasMore, hasPrevious, goNext, goPrevious } = useCursorResource(
    (afterCursor) => fetchProfiles({ search, sortBy, sortDirection, pageSize: PAGE_SIZE, afterCursor }),
    queryKey,
  );

  useEffect(() => {
    if (!selectedProfile) {
      setFormState({ nickname: '', avatar_url: '' });
      return;
    }

    const freshProfile = data.find((profile) => profile.id === selectedProfile.id) ?? selectedProfile;

    setFormState({
      nickname: freshProfile.nickname ?? '',
      avatar_url: freshProfile.avatar_url ?? '',
    });
  }, [data, selectedProfile]);

  const handleSave = async () => {
    if (!selectedProfile || !canManageProfiles) {
      return;
    }

    setSaving(true);
    setActionError('');

    try {
      await updateProfile({
        id: selectedProfile.id,
        nickname: formState.nickname,
        avatar_url: formState.avatar_url,
      });
      await refresh();
      pushToast({ title: 'Profile updated', description: selectedProfile.email ?? selectedProfile.id });
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Unknown error';
      setActionError(message);
      pushToast({ title: 'Failed to update profile', description: message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_380px]">
      <Panel
        title="Profiles"
        eyebrow="Cursor-paginated"
        action={<Button type="button" variant="secondary" onClick={() => void refresh()}>Refresh</Button>}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Field label="Search">
            <TextInput placeholder="Email, nickname, UUID" value={search} onChange={(event) => setSearch(event.target.value)} />
          </Field>
          <Field label="Sort by">
            <SelectInput value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
              <option value="created_at">Created</option>
              <option value="email">Email</option>
              <option value="nickname">Nickname</option>
              <option value="last_login_at">Last login</option>
            </SelectInput>
          </Field>
          <Field label="Direction">
            <SelectInput value={sortDirection} onChange={(event) => setSortDirection(event.target.value as typeof sortDirection)}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </SelectInput>
          </Field>
        </div>
        {loading ? <div className="text-sm text-slate-400">Loading profiles...</div> : null}
        {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
        <EntityTable
          columns={[
            { key: 'email', header: 'Email', render: (row) => row.email ?? '—' },
            { key: 'nickname', header: 'Nickname', render: (row) => row.nickname ?? '—' },
            { key: 'last_login_at', header: 'Last login', render: (row) => row.last_login_at ?? '—' },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <Button type="button" variant="secondary" onClick={() => setSelectedProfile(row)}>
                  {selectedProfile?.id === row.id ? 'Editing' : 'Inspect'}
                </Button>
              ),
            },
          ]}
          emptyLabel="No profiles returned by Supabase."
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

      <Panel title={selectedProfile ? 'Edit profile' : 'Profile details'} eyebrow={selectedProfile ? 'Edit mode' : 'Select a row'}>
        {selectedProfile ? (
          <>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              <div className="font-medium text-white">{selectedProfile.email ?? selectedProfile.id}</div>
              <div className="mt-1 text-slate-400">{selectedProfile.id}</div>
            </div>
            <Field label="Nickname">
              <TextInput disabled={!canManageProfiles} value={formState.nickname} onChange={(event) => setFormState((current) => ({ ...current, nickname: event.target.value }))} />
            </Field>
            <Field label="Avatar URL">
              <TextInput disabled={!canManageProfiles} value={formState.avatar_url} onChange={(event) => setFormState((current) => ({ ...current, avatar_url: event.target.value }))} />
            </Field>
            {!canManageProfiles ? <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">Only admins can edit profile metadata.</div> : null}
            {actionError ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{actionError}</div> : null}
            <div className="flex flex-wrap gap-3">
              <Button disabled={!canManageProfiles || saving} type="button" onClick={() => void handleSave()}>{saving ? 'Saving...' : 'Save changes'}</Button>
              <Button type="button" variant="secondary" onClick={() => setSelectedProfile(null)}>Close</Button>
            </div>
          </>
        ) : (
          <p className="text-sm leading-7 text-slate-300">Pick a profile from the table to inspect identity data or edit nickname and avatar metadata.</p>
        )}
      </Panel>
    </div>
  );
}
