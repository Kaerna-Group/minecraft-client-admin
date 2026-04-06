import { useState } from 'react';

import { Button } from '../components/Button';
import { EntityTable } from '../components/EntityTable';
import { Field, TextArea, TextInput } from '../components/Field';
import { Panel } from '../components/Panel';
import { createBuildRelease, deleteBuildRelease, fetchBuildReleases, updateBuildReleaseActive, type BuildRelease } from '../lib/admin-api';
import { useAsyncResource } from '../lib/useAsyncResource';

type ReleaseFormState = {
  version: string;
  manifest_url: string;
  changelog: string;
  is_active: boolean;
};

export function ReleasesPage() {
  const { data, error, loading, refresh } = useAsyncResource(fetchBuildReleases);
  const [formState, setFormState] = useState<ReleaseFormState>({
    version: '',
    manifest_url: '',
    changelog: '',
    is_active: false,
  });
  const [actionError, setActionError] = useState('');

  const handleCreate = async () => {
    setActionError('');

    try {
      await createBuildRelease({
        version: formState.version,
        manifest_url: formState.manifest_url || null,
        changelog: formState.changelog || null,
        is_active: formState.is_active,
      });
      setFormState({ version: '', manifest_url: '', changelog: '', is_active: false });
      await refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Unknown error');
    }
  };

  const handleToggle = async (row: BuildRelease) => {
    setActionError('');

    try {
      await updateBuildReleaseActive(row.id, !row.is_active);
      await refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Unknown error');
    }
  };

  const handleDelete = async (row: BuildRelease) => {
    setActionError('');

    try {
      await deleteBuildRelease(row.id);
      await refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Unknown error');
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_360px]">
      <Panel title="Build releases" eyebrow="Release management">
        {loading ? <div className="text-sm text-slate-400">Loading build releases...</div> : null}
        {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
        <EntityTable
          columns={[
            { key: 'version', header: 'Version', render: (row) => row.version },
            { key: 'manifest_url', header: 'Manifest URL', render: (row) => row.manifest_url ?? '—' },
            { key: 'active', header: 'Active', render: (row) => (row.is_active ? 'Yes' : 'No') },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <div className="flex gap-2">
                  <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100" onClick={() => void handleToggle(row)} type="button">
                    {row.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100" onClick={() => void handleDelete(row)} type="button">
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          emptyLabel="No build releases found."
          rows={data ?? []}
        />
      </Panel>

      <Panel title="Create release" eyebrow="Mutation">
        <Field label="Version">
          <TextInput value={formState.version} onChange={(event) => setFormState((current) => ({ ...current, version: event.target.value }))} />
        </Field>
        <Field label="Manifest URL">
          <TextInput value={formState.manifest_url} onChange={(event) => setFormState((current) => ({ ...current, manifest_url: event.target.value }))} />
        </Field>
        <Field label="Changelog">
          <TextArea value={formState.changelog} onChange={(event) => setFormState((current) => ({ ...current, changelog: event.target.value }))} />
        </Field>
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
          <input checked={formState.is_active} className="h-4 w-4" onChange={(event) => setFormState((current) => ({ ...current, is_active: event.target.checked }))} type="checkbox" />
          <span>Mark as active release</span>
        </label>
        {actionError ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{actionError}</div> : null}
        <Button onClick={() => void handleCreate()} type="button">Create release</Button>
      </Panel>
    </div>
  );
}
