import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { CursorValue } from '@shared/lib/cursor';

import { deleteNews, downloadJsonFile, exportNewsPackage, fetchNews, importNewsPackage, parseJsonFile, upsertNews, type ExportEnvelope, type LauncherNews, type TableDensity } from '@entities/admin/api/admin-api';
import { useAuth } from '@features/auth/model/useAuth';
import { normalizeAdminErrorMessage } from '@shared/lib/admin-errors';
import { useCursorResource } from '@shared/lib/react/useCursorResource';
import { useDebouncedValue } from '@shared/lib/react/useDebouncedValue';
import { useManagedForm } from '@shared/lib/react/useManagedForm';
import { useUnsavedChangesGuard } from '@shared/lib/react/useUnsavedChangesGuard';
import { useRouteViewState } from '@shared/lib/url-state';
import { firstFieldError, validateNewsFields } from '@shared/lib/validation/admin-validation';
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
const emptyForm = { title: '', body: '', is_published: false };
const defaultView = {
  search: '',
  publicationFilter: 'all',
  sortBy: 'created_at',
  sortDirection: 'desc',
  density: 'comfortable',
  selectedId: '',
  cursor: null as CursorValue | null,
  history: [] as Array<CursorValue | null>,
};

export function NewsSection() {
  const { canManageNews } = useAuth();
  const { pushToast } = useToast();
  const { state: view, setState } = useRouteViewState(defaultView);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LauncherNews | null>(null);
  const [importPreview, setImportPreview] = useState<ExportEnvelope<LauncherNews> | null>(null);
  const debouncedSearch = useDebouncedValue(view.search, 350);
  const density = view.density as TableDensity;
  const form = useManagedForm(emptyForm, validateNewsFields);
  const replaceForm = form.replace;
  useUnsavedChangesGuard(form.isDirty);

  const queryKey = useMemo(() => JSON.stringify({ search: debouncedSearch, publicationFilter: view.publicationFilter, sortBy: view.sortBy, sortDirection: view.sortDirection }), [debouncedSearch, view.publicationFilter, view.sortBy, view.sortDirection]);
  const { data, error, loading, refresh, hasMore, hasPrevious, goNext, goPrevious } = useCursorResource(
    (afterCursor) => fetchNews({ search: debouncedSearch, publicationFilter: view.publicationFilter as 'all' | 'published' | 'draft', sortBy: view.sortBy as 'created_at' | 'updated_at' | 'title', sortDirection: view.sortDirection as 'asc' | 'desc', pageSize: PAGE_SIZE, afterCursor }),
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

  const selectedNews = data.find((row) => row.id === view.selectedId) ?? null;

  useEffect(() => {
    if (!selectedNews) {
      replaceForm(emptyForm);
      return;
    }

    replaceForm({ title: selectedNews.title, body: selectedNews.body, is_published: selectedNews.is_published });
  }, [replaceForm, selectedNews]);

  const handleSelect = (entry: LauncherNews) => {
    if (form.isDirty && !window.confirm('You have unsaved changes. Open another news item anyway?')) {
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
    if (!canManageNews || !form.isValid || !form.isDirty) {
      return;
    }

    try {
      await upsertNews({ id: selectedNews?.id, title: form.value.title.trim(), body: form.value.body.trim(), is_published: form.value.is_published });
      await refresh();
      form.markSaved({ title: form.value.title.trim(), body: form.value.body.trim(), is_published: form.value.is_published });
      pushToast({ title: selectedNews ? 'News updated' : 'News created', description: form.value.title.trim() });
    } catch (nextError) {
      pushToast({ title: 'Failed to save news', description: normalizeAdminErrorMessage(nextError), tone: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete || !canManageNews) {
      return;
    }

    try {
      await deleteNews(pendingDelete.id);
      await refresh();
      pushToast({ title: 'News removed', description: pendingDelete.title });
      if (selectedNews?.id === pendingDelete.id) {
        handleClose();
      }
    } catch (nextError) {
      pushToast({ title: 'Failed to delete news', description: normalizeAdminErrorMessage(nextError), tone: 'error' });
    } finally {
      setPendingDelete(null);
    }
  };

  const handleExport = async () => {
    const payload = await exportNewsPackage({
      search: debouncedSearch,
      publicationFilter: view.publicationFilter as 'all' | 'published' | 'draft',
      sortBy: view.sortBy as 'created_at' | 'updated_at' | 'title',
      sortDirection: view.sortDirection as 'asc' | 'desc',
    });

    downloadJsonFile(`kaerna-news-export-${new Date().toISOString().slice(0, 10)}.json`, payload);
    pushToast({ title: 'News exported', description: `${payload.items.length} entries exported.` });
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const payload = await parseJsonFile<ExportEnvelope<LauncherNews>>(file);
      setImportPreview(payload);
    } catch {
      pushToast({ title: 'Import failed', description: 'The selected file is not a valid JSON export package.', tone: 'error' });
    } finally {
      event.target.value = '';
    }
  };

  const handleImportConfirm = async () => {
    if (!importPreview || !canManageNews) {
      return;
    }

    try {
      await importNewsPackage(importPreview);
      await refresh();
      pushToast({ title: 'News imported', description: `${importPreview.items.length} entries imported.` });
      setImportPreview(null);
    } catch (nextError) {
      pushToast({ title: 'Import failed', description: normalizeAdminErrorMessage(nextError), tone: 'error' });
    }
  };

  return (
    <>
      <input ref={fileInputRef} accept="application/json" className="hidden" type="file" onChange={(event) => void handleImportFile(event)} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_390px]">
        <Panel title="Launcher news" eyebrow="Cursor-paginated read and edit" action={<div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => void handleExport()}>Export JSON</Button><Button type="button" variant="secondary" disabled={!canManageNews} onClick={() => fileInputRef.current?.click()}>Import JSON</Button></div>}>
          <div className="grid gap-4 lg:grid-cols-5">
            <Field label="Search"><TextInput placeholder="Title or body" value={view.search} onChange={(event) => setState({ search: event.target.value, cursor: null as CursorValue | null, history: [], selectedId: '' })} /></Field>
            <Field label="State"><SelectInput value={view.publicationFilter} onChange={(event) => setState({ publicationFilter: event.target.value, cursor: null as CursorValue | null, history: [], selectedId: '' })}><option value="all">All</option><option value="published">Published</option><option value="draft">Drafts</option></SelectInput></Field>
            <Field label="Sort by"><SelectInput value={view.sortBy} onChange={(event) => setState({ sortBy: event.target.value, cursor: null as CursorValue | null, history: [] })}><option value="created_at">Created</option><option value="updated_at">Updated</option><option value="title">Title</option></SelectInput></Field>
            <Field label="Direction"><SelectInput value={view.sortDirection} onChange={(event) => setState({ sortDirection: event.target.value, cursor: null as CursorValue | null, history: [] })}><option value="desc">Descending</option><option value="asc">Ascending</option></SelectInput></Field>
            <Field label="Density"><SelectInput value={density} onChange={(event) => setState({ density: event.target.value as TableDensity })}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></SelectInput></Field>
          </div>
          {error ? <SectionHint tone="warning">{normalizeAdminErrorMessage(error)}</SectionHint> : null}
          <EntityTable columns={[
            { key: 'title', header: 'Title', render: (row) => row.title },
            { key: 'published', header: 'State', render: (row) => (row.is_published ? 'Published' : 'Draft') },
            { key: 'id', header: 'ID', render: (row) => <div className="flex items-center gap-2"><span className="truncate">{row.id}</span><CopyButton value={row.id} /></div> },
            { key: 'updated_at', header: 'Updated', render: (row) => row.updated_at ?? row.created_at ?? '—' },
            { key: 'actions', header: 'Actions', render: (row) => <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => handleSelect(row)}>Inspect</Button><Button type="button" variant="danger" disabled={!canManageNews} onClick={() => setPendingDelete(row)}>Delete</Button></div> },
          ]} density={density} emptyLabel="No launcher news found." getRowKey={(row) => row.id} loading={loading} rows={data} />
          <PaginationControls itemCount={data.length} hasPrevious={hasPrevious} hasMore={hasMore} loading={loading} onPrevious={goPrevious} onNext={goNext} />
        </Panel>

        <Panel title={selectedNews ? 'Edit news item' : 'Create news item'} eyebrow={selectedNews ? 'Detail pane' : 'Create mode'}>
          {!canManageNews ? <SectionHint tone="warning">Only admins and moderators can edit launcher news.</SectionHint> : null}
          {selectedNews && !canManageNews ? <ReadonlyBadge /> : null}
          <Field label="Title" error={form.shouldShowError('title') ? form.errors.title : ''}><TextInput disabled={!canManageNews} value={form.value.title} onChange={(event) => form.setField('title', event.target.value)} /></Field>
          <Field label="Body" error={form.shouldShowError('body') ? form.errors.body : ''}><TextArea disabled={!canManageNews} value={form.value.body} onChange={(event) => form.setField('body', event.target.value)} /></Field>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200"><input checked={form.value.is_published} className="h-4 w-4" disabled={!canManageNews} onChange={(event) => form.setField('is_published', event.target.checked)} type="checkbox" /><span>Published</span></label>
          {!form.isValid && form.submitAttempted ? <SectionHint tone="warning">{firstFieldError(form.errors)}</SectionHint> : null}
          <div className="flex flex-wrap gap-3"><Button disabled={!canManageNews || !form.isDirty || !form.isValid} type="button" onClick={() => void handleSave()}>{selectedNews ? 'Save changes' : 'Create news item'}</Button><Button type="button" variant="secondary" onClick={handleReset}>Reset</Button><Button type="button" variant="secondary" onClick={handleClose}>{selectedNews ? 'Close' : 'Clear'}</Button></div>
        </Panel>
      </div>

      <ConfirmDialog open={Boolean(pendingDelete)} title="Delete news item" description={pendingDelete ? `Remove "${pendingDelete.title}" from the launcher news feed?` : ''} confirmLabel="Delete news" onCancel={() => setPendingDelete(null)} onConfirm={() => void handleDelete()} />
      <ConfirmDialog open={Boolean(importPreview)} title="Import news package" description={importPreview ? `Import ${importPreview.items.length} news entries from the selected JSON package?` : ''} confirmLabel="Import JSON" onCancel={() => setImportPreview(null)} onConfirm={() => void handleImportConfirm()} />
    </>
  );
}

