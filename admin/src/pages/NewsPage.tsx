import { useState } from 'react';

import { Button } from '../components/Button';
import { EntityTable } from '../components/EntityTable';
import { Field, TextArea, TextInput } from '../components/Field';
import { Panel } from '../components/Panel';
import { createNews, deleteNews, fetchNews, updateNewsPublish, type LauncherNews } from '../lib/admin-api';
import { useAsyncResource } from '../lib/useAsyncResource';

type NewsFormState = {
  title: string;
  body: string;
  is_published: boolean;
};

export function NewsPage() {
  const { data, error, loading, refresh } = useAsyncResource(fetchNews);
  const [formState, setFormState] = useState<NewsFormState>({ title: '', body: '', is_published: false });
  const [actionError, setActionError] = useState('');

  const handleCreate = async () => {
    setActionError('');

    try {
      await createNews(formState);
      setFormState({ title: '', body: '', is_published: false });
      await refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Unknown error');
    }
  };

  const handleToggle = async (row: LauncherNews) => {
    setActionError('');

    try {
      await updateNewsPublish(row.id, !row.is_published);
      await refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Unknown error');
    }
  };

  const handleDelete = async (row: LauncherNews) => {
    setActionError('');

    try {
      await deleteNews(row.id);
      await refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Unknown error');
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_360px]">
      <Panel title="Launcher news" eyebrow="Content management">
        {loading ? <div className="text-sm text-slate-400">Loading news...</div> : null}
        {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
        <EntityTable
          columns={[
            { key: 'title', header: 'Title', render: (row) => row.title },
            { key: 'published', header: 'Published', render: (row) => (row.is_published ? 'Yes' : 'No') },
            { key: 'created_at', header: 'Created', render: (row) => row.created_at ?? '—' },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <div className="flex gap-2">
                  <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100" onClick={() => void handleToggle(row)} type="button">
                    {row.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100" onClick={() => void handleDelete(row)} type="button">
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          emptyLabel="No launcher news found."
          rows={data ?? []}
        />
      </Panel>

      <Panel title="Create news" eyebrow="Mutation">
        <Field label="Title">
          <TextInput value={formState.title} onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))} />
        </Field>
        <Field label="Body">
          <TextArea value={formState.body} onChange={(event) => setFormState((current) => ({ ...current, body: event.target.value }))} />
        </Field>
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
          <input checked={formState.is_published} className="h-4 w-4" onChange={(event) => setFormState((current) => ({ ...current, is_published: event.target.checked }))} type="checkbox" />
          <span>Publish immediately</span>
        </label>
        {actionError ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{actionError}</div> : null}
        <Button onClick={() => void handleCreate()} type="button">Create news item</Button>
      </Panel>
    </div>
  );
}
