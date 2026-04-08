import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { CursorValue } from '@shared/lib/cursor';

import { deleteBuildRelease, downloadJsonFile, exportReleasePackage, fetchBuildReleases, importReleasePackage, parseJsonFile, upsertBuildRelease, type BuildRelease, type ExportEnvelope, type TableDensity } from '@entities/admin/api/admin-api';
import { useAuth } from '@features/auth/model/useAuth';
import { normalizeAdminErrorMessage } from '@shared/lib/admin-errors';
import { useCursorResource } from '@shared/lib/react/useCursorResource';
import { useDebouncedValue } from '@shared/lib/react/useDebouncedValue';
import { useManagedForm } from '@shared/lib/react/useManagedForm';
import { useUnsavedChangesGuard } from '@shared/lib/react/useUnsavedChangesGuard';
import { useRouteViewState } from '@shared/lib/url-state';
import { firstFieldError, validateReleaseFields } from '@shared/lib/validation/admin-validation';
import { useToast } from '@shared/lib/react/toast/useToast';
import { Button } from '@shared/ui/Button';
import { CopyButton } from '@shared/ui/CopyButton';
import { EntityTable } from '@shared/ui/EntityTable';
import { Field, SelectInput, TextArea, TextInput } from '@shared/ui/Field';
import { ConfirmDialog } from '@shared/ui/feedback/ConfirmDialog';
import { PaginationControls } from '@shared/ui/PaginationControls';
import { Panel } from '@shared/ui/Panel';
import { ReadonlyBadge } from '@shared/ui/ReadonlyBadge';
import { SectionHint } from '@shared/ui/SectionHint';

const PAGE_SIZE = 20;
const emptyForm = { version: '', manifest_url: '', changelog: '', is_active: false };
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

export function ReleasesSection() {
  const { canManageReleases } = useAuth();
  const { pushToast } = useToast();
  const { state: view, setState } = useRouteViewState(defaultView);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BuildRelease | null>(null);
  const [importPreview, setImportPreview] = useState<ExportEnvelope<BuildRelease> | null>(null);
  const debouncedSearch = useDebouncedValue(view.search, 350);
  const density = view.density as TableDensity;
  const form = useManagedForm(emptyForm, validateReleaseFields);
  const replaceForm = form.replace;
  useUnsavedChangesGuard(form.isDirty);

  const queryKey = useMemo(() => JSON.stringify({ search: debouncedSearch, statusFilter: view.statusFilter, sortBy: view.sortBy, sortDirection: view.sortDirection }), [debouncedSearch, view.sortBy, view.sortDirection, view.statusFilter]);
  const { data, error, loading, refresh, hasMore, hasPrevious, goNext, goPrevious } = useCursorResource(
    (afterCursor) => fetchBuildReleases({ search: debouncedSearch, statusFilter: view.statusFilter as 'all' | 'active' | 'inactive', sortBy: view.sortBy as 'created_at' | 'updated_at' | 'version', sortDirection: view.sortDirection as 'asc' | 'desc', pageSize: PAGE_SIZE, afterCursor }),
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

  const selectedRelease = data.find((row) => row.id === view.selectedId) ?? null;

  useEffect(() => {
    if (!selectedRelease) {
      replaceForm(emptyForm);
      return;
    }

    replaceForm({ version: selectedRelease.version, manifest_url: selectedRelease.manifest_url ?? '', changelog: selectedRelease.changelog ?? '', is_active: selectedRelease.is_active });
  }, [replaceForm, selectedRelease]);

  const handleSelect = (entry: BuildRelease) => {
    if (form.isDirty && !window.confirm('You have unsaved changes. Open another release anyway?')) {
      return;
    }

    setState({ selectedId: entry.id });
  };

  const handleReset = () => {
    if (form.isDirty && !window.confirm('Discard unsaved changes?')) {
      return;
    }
    form.reset();
  };

  const handleClose = () => {
    if (form.isDirty && !window.confirm('Discard unsaved changes and close this editor?')) {
      return;
    }
    setState({ selectedId: '' });
    replaceForm(emptyForm);
  };

  const handleSave = async () => {
    form.setSubmitAttempted(true);
    if (!canManageReleases || !form.isValid || !form.isDirty) {
      return;
    }

    try {
      await upsertBuildRelease({ id: selectedRelease?.id, version: form.value.version.trim(), manifest_url: form.value.manifest_url.trim() || null, changelog: form.value.changelog.trim() || null, is_active: form.value.is_active });
      await refresh();
      form.markSaved({ version: form.value.version.trim(), manifest_url: form.value.manifest_url.trim(), changelog: form.value.changelog.trim(), is_active: form.value.is_active });
      pushToast({ title: selectedRelease ? 'Release updated' : 'Release created', description: form.value.version.trim() });
    } catch (nextError) {
      pushToast({ title: 'Failed to save release', description: normalizeAdminErrorMessage(nextError), tone: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete || !canManageReleases) {
      return;
    }

    try {
      await deleteBuildRelease(pendingDelete.id);
      await refresh();
      pushToast({ title: 'Release removed', description: pendingDelete.version });
      if (selectedRelease?.id === pendingDelete.id) {
        handleClose();
      }
    } catch (nextError) {
      pushToast({ title: 'Failed to delete release', description: normalizeAdminErrorMessage(nextError), tone: 'error' });
    } finally {
      setPendingDelete(null);
    }
  };

  const handleExport = async () => {
    const payload = await exportReleasePackage({
      search: debouncedSearch,
      statusFilter: view.statusFilter as 'all' | 'active' | 'inactive',
      sortBy: view.sortBy as 'created_at' | 'updated_at' | 'version',
      sortDirection: view.sortDirection as 'asc' | 'desc',
    });

    downloadJsonFile(`kaerna-releases-export-${new Date().toISOString().slice(0, 10)}.json`, payload);
    pushToast({ title: 'Releases exported', description: `${payload.items.length} releases exported.` });
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const payload = await parseJsonFile<ExportEnvelope<BuildRelease>>(file);
      setImportPreview(payload);
    } catch {
      pushToast({ title: 'Import failed', description: 'The selected file is not a valid JSON export package.', tone: 'error' });
    } finally {
      event.target.value = '';
    }
  };

  const handleImportConfirm = async () => {
    if (!importPreview || !canManageReleases) {
      return;
    }

    try {
      await importReleasePackage(importPreview);
      await refresh();
      pushToast({ title: 'Releases imported', description: `${importPreview.items.length} releases imported.` });
      setImportPreview(null);
    } catch (nextError) {
      pushToast({ title: 'Import failed', description: normalizeAdminErrorMessage(nextError), tone: 'error' });
    }
  };

  return (
    <>
      <input ref={fileInputRef} accept="application/json" className="hidden" type="file" onChange={(event) => void handleImportFile(event)} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_390px]">
        <Panel title="Build releases" eyebrow="Cursor-paginated read and edit" action={<div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => void handleExport()}>Export JSON</Button><Button type="button" variant="secondary" disabled={!canManageReleases} onClick={() => fileInputRef.current?.click()}>Import JSON</Button></div>}>
          <div className="grid gap-4 lg:grid-cols-5">
            <Field label="Search"><TextInput placeholder="Version, URL, changelog" value={view.search} onChange={(event) => setState({ search: event.target.value, cursor: null as CursorValue | null, history: [], selectedId: '' })} /></Field>
            <Field label="State"><SelectInput value={view.statusFilter} onChange={(event) => setState({ statusFilter: event.target.value, cursor: null as CursorValue | null, history: [], selectedId: '' })}><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></SelectInput></Field>
            <Field label="Sort by"><SelectInput value={view.sortBy} onChange={(event) => setState({ sortBy: event.target.value, cursor: null as CursorValue | null, history: [] })}><option value="created_at">Created</option><option value="updated_at">Updated</option><option value="version">Version</option></SelectInput></Field>
            <Field label="Direction"><SelectInput value={view.sortDirection} onChange={(event) => setState({ sortDirection: event.target.value, cursor: null as CursorValue | null, history: [] })}><option value="desc">Descending</option><option value="asc">Ascending</option></SelectInput></Field>
            <Field label="Density"><SelectInput value={density} onChange={(event) => setState({ density: event.target.value as TableDensity })}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></SelectInput></Field>
          </div>
          {error ? <SectionHint tone="warning">{normalizeAdminErrorMessage(error)}</SectionHint> : null}
          <EntityTable columns={[
            { key: 'version', header: 'Version', render: (row) => <div className="flex items-center gap-2"><span>{row.version}</span><CopyButton label="Copy version" value={row.version} /></div> },
            { key: 'active', header: 'State', render: (row) => (row.is_active ? 'Active' : 'Inactive') },
            { key: 'manifest_url', header: 'Manifest', render: (row) => row.manifest_url ? <div className="flex items-center gap-2"><span className="truncate">{row.manifest_url}</span><CopyButton label="Copy URL" value={row.manifest_url} /></div> : '—' },
            { key: 'updated_at', header: 'Updated', render: (row) => row.updated_at ?? row.created_at ?? '—' },
            { key: 'actions', header: 'Actions', render: (row) => <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => handleSelect(row)}>Inspect</Button><Button type="button" variant="danger" disabled={!canManageReleases} onClick={() => setPendingDelete(row)}>Delete</Button></div> },
          ]} density={density} emptyLabel="No build releases found." getRowKey={(row) => row.id} loading={loading} rows={data} />
          <PaginationControls itemCount={data.length} hasPrevious={hasPrevious} hasMore={hasMore} loading={loading} onPrevious={goPrevious} onNext={goNext} />
        </Panel>

        <Panel title={selectedRelease ? 'Edit release' : 'Create release'} eyebrow={selectedRelease ? 'Detail pane' : 'Create mode'}>
          {!canManageReleases ? <SectionHint tone="warning">Only admins can manage build releases. Moderators can inspect this data in read-only mode.</SectionHint> : null}
          {selectedRelease && !canManageReleases ? <ReadonlyBadge /> : null}
          <SectionHint>Setting a release as active will automatically deactivate all other active releases on the server.</SectionHint>
          <Field label="Version" error={form.shouldShowError('version') ? form.errors.version : ''}><TextInput disabled={!canManageReleases} value={form.value.version} onChange={(event) => form.setField('version', event.target.value)} /></Field>
          <Field label="Manifest URL" error={form.shouldShowError('manifest_url') ? form.errors.manifest_url : ''}><TextInput disabled={!canManageReleases} value={form.value.manifest_url} onChange={(event) => form.setField('manifest_url', event.target.value)} /></Field>
          <Field label="Changelog"><TextArea disabled={!canManageReleases} value={form.value.changelog} onChange={(event) => form.setField('changelog', event.target.value)} /></Field>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200"><input checked={form.value.is_active} className="h-4 w-4" disabled={!canManageReleases} onChange={(event) => form.setField('is_active', event.target.checked)} type="checkbox" /><span>Active release</span></label>
          {!form.isValid && form.submitAttempted ? <SectionHint tone="warning">{firstFieldError(form.errors)}</SectionHint> : null}
          <div className="flex flex-wrap gap-3"><Button disabled={!canManageReleases || !form.isDirty || !form.isValid} type="button" onClick={() => void handleSave()}>{selectedRelease ? 'Save changes' : 'Create release'}</Button><Button type="button" variant="secondary" onClick={handleReset}>Reset</Button><Button type="button" variant="secondary" onClick={handleClose}>{selectedRelease ? 'Close' : 'Clear'}</Button></div>
        </Panel>
      </div>

      <ConfirmDialog open={Boolean(pendingDelete)} title="Delete release" description={pendingDelete ? `Delete release ${pendingDelete.version}? Active releases must be deactivated first.` : ''} confirmLabel="Delete release" onCancel={() => setPendingDelete(null)} onConfirm={() => void handleDelete()} />
      <ConfirmDialog open={Boolean(importPreview)} title="Import release package" description={importPreview ? `Import ${importPreview.items.length} releases from the selected JSON package?` : ''} confirmLabel="Import JSON" onCancel={() => setImportPreview(null)} onConfirm={() => void handleImportConfirm()} />
    </>
  );
}

