import { useEffect, useMemo, useState } from 'react';

import { deleteBuildRelease, fetchBuildReleases, upsertBuildRelease, type BuildRelease } from '@entities/admin/api/admin-api';
import { useAuth } from '@features/auth/model/useAuth';
import { useToast } from '@shared/lib/react/toast/useToast';
import { useCursorResource } from '@shared/lib/react/useCursorResource';
import { Button } from '@shared/ui/Button';
import { EntityTable } from '@shared/ui/EntityTable';
import { Field, SelectInput, TextArea, TextInput } from '@shared/ui/Field';
import { ConfirmDialog } from '@shared/ui/feedback/ConfirmDialog';
import { PaginationControls } from '@shared/ui/PaginationControls';
import { Panel } from '@shared/ui/Panel';

type ReleaseFormState = {
  id?: string;
  version: string;
  manifest_url: string;
  changelog: string;
  is_active: boolean;
};

const PAGE_SIZE = 20;
const emptyForm: ReleaseFormState = {
  version: '',
  manifest_url: '',
  changelog: '',
  is_active: false,
};

export function ReleasesSection() {
  const { canManageReleases } = useAuth();
  const { pushToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'version'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [editingRelease, setEditingRelease] = useState<BuildRelease | null>(null);
  const [formState, setFormState] = useState<ReleaseFormState>(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<BuildRelease | null>(null);
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);

  const queryKey = useMemo(
    () => JSON.stringify({ search, statusFilter, sortBy, sortDirection }),
    [search, sortBy, sortDirection, statusFilter],
  );
  const { data, error, loading, refresh, hasMore, hasPrevious, goNext, goPrevious } = useCursorResource(
    (afterCursor) => fetchBuildReleases({ search, statusFilter, sortBy, sortDirection, pageSize: PAGE_SIZE, afterCursor }),
    queryKey,
  );

  useEffect(() => {
    if (!editingRelease) {
      setFormState(emptyForm);
      return;
    }

    const freshRelease = data.find((release) => release.id === editingRelease.id) ?? editingRelease;

    setFormState({
      id: freshRelease.id,
      version: freshRelease.version,
      manifest_url: freshRelease.manifest_url ?? '',
      changelog: freshRelease.changelog ?? '',
      is_active: freshRelease.is_active,
    });
  }, [data, editingRelease]);

  const handleSave = async () => {
    if (!canManageReleases) return;

    setSaving(true);
    setActionError('');

    try {
      await upsertBuildRelease(formState);
      await refresh();
      pushToast({ title: formState.id ? 'Release updated' : 'Release created', description: formState.version });
      setEditingRelease(null);
      setFormState(emptyForm);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Unknown error';
      setActionError(message);
      pushToast({ title: 'Failed to save release', description: message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete || !canManageReleases) return;

    try {
      await deleteBuildRelease(pendingDelete.id);
      await refresh();
      pushToast({ title: 'Release removed', description: pendingDelete.version });
      if (editingRelease?.id === pendingDelete.id) {
        setEditingRelease(null);
        setFormState(emptyForm);
      }
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Unknown error';
      pushToast({ title: 'Failed to delete release', description: message, tone: 'error' });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_380px]">
        <Panel title="Build releases" eyebrow="Cursor-paginated read and edit">
          <div className="grid gap-4 lg:grid-cols-4">
            <Field label="Search"><TextInput placeholder="Version, URL, changelog" value={search} onChange={(event) => setSearch(event.target.value)} /></Field>
            <Field label="State"><SelectInput value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></SelectInput></Field>
            <Field label="Sort by"><SelectInput value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="created_at">Created</option><option value="updated_at">Updated</option><option value="version">Version</option></SelectInput></Field>
            <Field label="Direction"><SelectInput value={sortDirection} onChange={(event) => setSortDirection(event.target.value as typeof sortDirection)}><option value="desc">Descending</option><option value="asc">Ascending</option></SelectInput></Field>
          </div>
          {loading ? <div className="text-sm text-slate-400">Loading build releases...</div> : null}
          {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
          <EntityTable
            columns={[
              { key: 'version', header: 'Version', render: (row) => row.version },
              { key: 'active', header: 'State', render: (row) => (row.is_active ? 'Active' : 'Inactive') },
              { key: 'updated_at', header: 'Updated', render: (row) => row.updated_at ?? row.created_at ?? '—' },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => setEditingRelease(row)}>Edit</Button>
                    <Button type="button" variant="danger" disabled={!canManageReleases} onClick={() => setPendingDelete(row)}>Delete</Button>
                  </div>
                ),
              },
            ]}
            emptyLabel="No build releases found."
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

        <Panel title={editingRelease ? 'Edit release' : 'Create release'} eyebrow={editingRelease ? 'Edit mode' : 'Create mode'}>
          {!canManageReleases ? <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">Only admins can manage build releases.</div> : null}
          <Field label="Version"><TextInput disabled={!canManageReleases} value={formState.version} onChange={(event) => setFormState((current) => ({ ...current, version: event.target.value }))} /></Field>
          <Field label="Manifest URL"><TextInput disabled={!canManageReleases} value={formState.manifest_url} onChange={(event) => setFormState((current) => ({ ...current, manifest_url: event.target.value }))} /></Field>
          <Field label="Changelog"><TextArea disabled={!canManageReleases} value={formState.changelog} onChange={(event) => setFormState((current) => ({ ...current, changelog: event.target.value }))} /></Field>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
            <input checked={formState.is_active} className="h-4 w-4" disabled={!canManageReleases} onChange={(event) => setFormState((current) => ({ ...current, is_active: event.target.checked }))} type="checkbox" />
            <span>Active release</span>
          </label>
          {actionError ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{actionError}</div> : null}
          <div className="flex flex-wrap gap-3">
            <Button disabled={!canManageReleases || saving} type="button" onClick={() => void handleSave()}>{saving ? 'Saving...' : editingRelease ? 'Save changes' : 'Create release'}</Button>
            <Button type="button" variant="secondary" onClick={() => { setEditingRelease(null); setFormState(emptyForm); }}>Reset</Button>
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete release"
        description={pendingDelete ? `Delete release ${pendingDelete.version}? This cannot be undone.` : ''}
        confirmLabel="Delete release"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
