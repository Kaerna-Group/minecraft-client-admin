import { useEffect, useMemo, useState } from 'react';

import { deleteNews, fetchNews, upsertNews, type LauncherNews } from '@entities/admin/api/admin-api';
import { useAuth } from '@features/auth/model/useAuth';
import { useToast } from '@shared/lib/react/toast/useToast';
import { useCursorResource } from '@shared/lib/react/useCursorResource';
import { Button } from '@shared/ui/Button';
import { EntityTable } from '@shared/ui/EntityTable';
import { Field, SelectInput, TextArea, TextInput } from '@shared/ui/Field';
import { ConfirmDialog } from '@shared/ui/feedback/ConfirmDialog';
import { PaginationControls } from '@shared/ui/PaginationControls';
import { Panel } from '@shared/ui/Panel';

type NewsFormState = {
  id?: string;
  title: string;
  body: string;
  is_published: boolean;
};

const PAGE_SIZE = 20;
const emptyForm: NewsFormState = {
  title: '',
  body: '',
  is_published: false,
};

export function NewsSection() {
  const { canManageNews } = useAuth();
  const { pushToast } = useToast();
  const [search, setSearch] = useState('');
  const [publicationFilter, setPublicationFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'title'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [editingNews, setEditingNews] = useState<LauncherNews | null>(null);
  const [formState, setFormState] = useState<NewsFormState>(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<LauncherNews | null>(null);
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);

  const queryKey = useMemo(
    () => JSON.stringify({ search, publicationFilter, sortBy, sortDirection }),
    [publicationFilter, search, sortBy, sortDirection],
  );
  const { data, error, loading, refresh, hasMore, hasPrevious, goNext, goPrevious } = useCursorResource(
    (afterCursor) => fetchNews({ search, publicationFilter, sortBy, sortDirection, pageSize: PAGE_SIZE, afterCursor }),
    queryKey,
  );

  useEffect(() => {
    if (!editingNews) {
      setFormState(emptyForm);
      return;
    }

    const freshNews = data.find((entry) => entry.id === editingNews.id) ?? editingNews;

    setFormState({
      id: freshNews.id,
      title: freshNews.title,
      body: freshNews.body,
      is_published: freshNews.is_published,
    });
  }, [data, editingNews]);

  const handleSave = async () => {
    if (!canManageNews) return;

    setSaving(true);
    setActionError('');

    try {
      await upsertNews(formState);
      await refresh();
      pushToast({ title: formState.id ? 'News updated' : 'News created', description: formState.title });
      setEditingNews(null);
      setFormState(emptyForm);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Unknown error';
      setActionError(message);
      pushToast({ title: 'Failed to save news', description: message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete || !canManageNews) return;

    try {
      await deleteNews(pendingDelete.id);
      await refresh();
      pushToast({ title: 'News removed', description: pendingDelete.title });
      if (editingNews?.id === pendingDelete.id) {
        setEditingNews(null);
        setFormState(emptyForm);
      }
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Unknown error';
      pushToast({ title: 'Failed to delete news', description: message, tone: 'error' });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_380px]">
        <Panel title="Launcher news" eyebrow="Cursor-paginated read and edit">
          <div className="grid gap-4 lg:grid-cols-4">
            <Field label="Search"><TextInput placeholder="Title or body" value={search} onChange={(event) => setSearch(event.target.value)} /></Field>
            <Field label="State"><SelectInput value={publicationFilter} onChange={(event) => setPublicationFilter(event.target.value as typeof publicationFilter)}><option value="all">All</option><option value="published">Published</option><option value="draft">Drafts</option></SelectInput></Field>
            <Field label="Sort by"><SelectInput value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="created_at">Created</option><option value="updated_at">Updated</option><option value="title">Title</option></SelectInput></Field>
            <Field label="Direction"><SelectInput value={sortDirection} onChange={(event) => setSortDirection(event.target.value as typeof sortDirection)}><option value="desc">Descending</option><option value="asc">Ascending</option></SelectInput></Field>
          </div>
          {loading ? <div className="text-sm text-slate-400">Loading news...</div> : null}
          {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
          <EntityTable
            columns={[
              { key: 'title', header: 'Title', render: (row) => row.title },
              { key: 'published', header: 'State', render: (row) => (row.is_published ? 'Published' : 'Draft') },
              { key: 'updated_at', header: 'Updated', render: (row) => row.updated_at ?? row.created_at ?? '—' },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => setEditingNews(row)}>Edit</Button>
                    <Button type="button" variant="danger" disabled={!canManageNews} onClick={() => setPendingDelete(row)}>Delete</Button>
                  </div>
                ),
              },
            ]}
            emptyLabel="No launcher news found."
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

        <Panel title={editingNews ? 'Edit news item' : 'Create news item'} eyebrow={editingNews ? 'Edit mode' : 'Create mode'}>
          {!canManageNews ? <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">Only admins and moderators can edit launcher news.</div> : null}
          <Field label="Title"><TextInput disabled={!canManageNews} value={formState.title} onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))} /></Field>
          <Field label="Body"><TextArea disabled={!canManageNews} value={formState.body} onChange={(event) => setFormState((current) => ({ ...current, body: event.target.value }))} /></Field>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
            <input checked={formState.is_published} className="h-4 w-4" disabled={!canManageNews} onChange={(event) => setFormState((current) => ({ ...current, is_published: event.target.checked }))} type="checkbox" />
            <span>Published</span>
          </label>
          {actionError ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{actionError}</div> : null}
          <div className="flex flex-wrap gap-3">
            <Button disabled={!canManageNews || saving} type="button" onClick={() => void handleSave()}>{saving ? 'Saving...' : editingNews ? 'Save changes' : 'Create news item'}</Button>
            <Button type="button" variant="secondary" onClick={() => { setEditingNews(null); setFormState(emptyForm); }}>Reset</Button>
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete news item"
        description={pendingDelete ? `Remove "${pendingDelete.title}" from the launcher news feed?` : ''}
        confirmLabel="Delete news"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
