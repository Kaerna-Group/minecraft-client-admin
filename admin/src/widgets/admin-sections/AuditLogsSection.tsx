import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchAuditLogs, type TableDensity } from '@entities/admin/api/admin-api';
import type { CursorValue } from '@shared/lib/cursor';
import { useAuth } from '@features/auth/model/useAuth';
import { getAuditDiffBlocks, getAuditTargetHref } from '@shared/lib/audit-log';
import { normalizeAdminErrorMessage } from '@shared/lib/admin-errors';
import { useCursorResource } from '@shared/lib/react/useCursorResource';
import { useDebouncedValue } from '@shared/lib/react/useDebouncedValue';
import { useRouteViewState } from '@shared/lib/url-state';
import { CopyButton } from '@shared/ui/CopyButton';
import { EntityTable } from '@shared/ui/EntityTable';
import { Field, SelectInput, TextInput } from '@shared/ui/Field';
import { PaginationControls } from '@shared/ui/PaginationControls';
import { Panel } from '@shared/ui/Panel';
import { SectionHint } from '@shared/ui/SectionHint';

const PAGE_SIZE = 20;
const defaultView = {
  search: '',
  actorFilter: '',
  entityFilter: 'all',
  actionFilter: 'all',
  presetFilter: 'all',
  timeFrom: '',
  timeTo: '',
  sortDirection: 'desc',
  density: 'comfortable',
  selectedId: '',
  cursor: null as CursorValue | null,
  history: [] as Array<CursorValue | null>,
};

function DetailBlock({ title, content }: { title: string; content: Record<string, unknown> | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{title}</div>
      {content && Object.keys(content).length > 0 ? (
        <div className="mt-3 space-y-2 text-sm text-slate-300">
          {Object.entries(content).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-white/5 bg-[#0b1220]/60 px-3 py-2">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{key}</div>
              <div className="mt-1 break-words text-slate-200">{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 text-sm text-slate-500">No structured data recorded.</div>
      )}
    </div>
  );
}

export function AuditLogsSection() {
  const { canViewAuditLogs } = useAuth();
  const { state: view, setState } = useRouteViewState(defaultView);
  const [showRawJson, setShowRawJson] = useState(false);
  const debouncedSearch = useDebouncedValue(view.search, 350);
  const debouncedActor = useDebouncedValue(view.actorFilter, 350);
  const density = view.density as TableDensity;

  const queryKey = useMemo(
    () =>
      JSON.stringify({
        search: debouncedSearch,
        actorFilter: debouncedActor,
        entityFilter: view.entityFilter,
        actionFilter: view.actionFilter,
        presetFilter: view.presetFilter,
        timeFrom: view.timeFrom,
        timeTo: view.timeTo,
        sortDirection: view.sortDirection,
      }),
    [debouncedActor, debouncedSearch, view.actionFilter, view.entityFilter, view.presetFilter, view.sortDirection, view.timeFrom, view.timeTo],
  );

  const { data, error, loading, hasMore, hasPrevious, goNext, goPrevious } = useCursorResource(
    (afterCursor) =>
      fetchAuditLogs({
        search: debouncedSearch,
        actorFilter: debouncedActor,
        entityFilter: view.entityFilter as 'all' | 'profile' | 'user_role' | 'user_ban' | 'launcher_news' | 'build_release',
        actionFilter: view.actionFilter as 'all' | 'created' | 'updated' | 'deleted' | 'upserted' | 'activated',
        presetFilter: view.presetFilter as 'all' | 'roles' | 'bans' | 'releases',
        timeFrom: view.timeFrom || undefined,
        timeTo: view.timeTo || undefined,
        sortDirection: view.sortDirection as 'asc' | 'desc',
        pageSize: PAGE_SIZE,
        afterCursor,
      }),
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

  const selectedLog = data.find((item) => item.id === view.selectedId) ?? null;
  const detailBlocks = selectedLog ? getAuditDiffBlocks(selectedLog) : [];
  const targetHref = selectedLog ? getAuditTargetHref(selectedLog) : null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_420px]">
      <Panel title="Audit logs" eyebrow="Read-only security trail">
        <div className="grid gap-4 lg:grid-cols-4">
          <Field label="Search"><TextInput placeholder="Summary, entity, action" value={view.search} onChange={(event) => setState({ search: event.target.value, cursor: null as CursorValue | null, history: [], selectedId: '' })} /></Field>
          <Field label="Actor"><TextInput placeholder="Email or UUID" value={view.actorFilter} onChange={(event) => setState({ actorFilter: event.target.value, cursor: null as CursorValue | null, history: [], selectedId: '' })} /></Field>
          <Field label="Preset"><SelectInput value={view.presetFilter} onChange={(event) => setState({ presetFilter: event.target.value, cursor: null as CursorValue | null, history: [], selectedId: '' })}><option value="all">All</option><option value="roles">Roles</option><option value="bans">Bans</option><option value="releases">Releases</option></SelectInput></Field>
          <Field label="Density"><SelectInput value={density} onChange={(event) => setState({ density: event.target.value as TableDensity })}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></SelectInput></Field>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          <Field label="Entity"><SelectInput value={view.entityFilter} onChange={(event) => setState({ entityFilter: event.target.value, cursor: null as CursorValue | null, history: [], selectedId: '' })}><option value="all">All</option><option value="profile">Profiles</option><option value="user_role">Roles</option><option value="user_ban">Bans</option><option value="launcher_news">News</option><option value="build_release">Releases</option></SelectInput></Field>
          <Field label="Action"><SelectInput value={view.actionFilter} onChange={(event) => setState({ actionFilter: event.target.value, cursor: null as CursorValue | null, history: [], selectedId: '' })}><option value="all">All</option><option value="created">Created</option><option value="updated">Updated</option><option value="deleted">Deleted</option><option value="upserted">Upserted</option><option value="activated">Activated</option></SelectInput></Field>
          <Field label="From"><TextInput type="datetime-local" value={view.timeFrom} onChange={(event) => setState({ timeFrom: event.target.value, cursor: null as CursorValue | null, history: [], selectedId: '' })} /></Field>
          <Field label="To"><TextInput type="datetime-local" value={view.timeTo} onChange={(event) => setState({ timeTo: event.target.value, cursor: null as CursorValue | null, history: [], selectedId: '' })} /></Field>
        </div>
        {!canViewAuditLogs ? <SectionHint tone="warning">Only admins can view audit logs.</SectionHint> : null}
        {error ? <SectionHint tone="warning">{normalizeAdminErrorMessage(error)}</SectionHint> : null}
        <EntityTable
          columns={[
            { key: 'created_at', header: 'Time', render: (row) => row.created_at },
            { key: 'actor_email', header: 'Actor', render: (row) => row.actor_email ?? row.actor_user_id ?? 'Unknown' },
            { key: 'entity_type', header: 'Entity', render: (row) => row.entity_type },
            { key: 'action_type', header: 'Action', render: (row) => row.action_type },
            {
              key: 'actions',
              header: 'Inspect',
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <button className="text-accent-300 transition hover:text-accent-200" onClick={() => setState({ selectedId: row.id })} type="button">
                    {view.selectedId === row.id ? 'Open' : 'Inspect'}
                  </button>
                  <CopyButton label="Copy ID" value={row.id} />
                </div>
              ),
            },
          ]}
          density={density}
          emptyLabel="No audit log entries found."
          getRowKey={(row) => row.id}
          loading={loading}
          rows={data}
        />
        <PaginationControls itemCount={data.length} hasPrevious={hasPrevious} hasMore={hasMore} loading={loading} onPrevious={goPrevious} onNext={goNext} />
      </Panel>

      <Panel title="Audit log details" eyebrow={selectedLog ? 'Readable diff' : 'Select a row'}>
        {selectedLog ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              <div className="font-medium text-white">{selectedLog.summary}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                <span>{selectedLog.created_at}</span>
                <span>{selectedLog.entity_type}</span>
                <span>{selectedLog.action_type}</span>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <div className="flex items-center justify-between gap-3"><span>Actor</span><span>{selectedLog.actor_email ?? selectedLog.actor_user_id ?? 'Unknown actor'}</span></div>
              <div className="flex items-center justify-between gap-3"><span>Target</span><span>{selectedLog.target_id ?? '—'}</span></div>
              {targetHref ? <Link className="text-accent-200 hover:text-accent-100" to={targetHref}>Open related entity</Link> : null}
            </div>

            <div className="space-y-3">
              {detailBlocks.map((block) => (
                <DetailBlock key={block.title} title={block.title} content={block.content} />
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <button className="text-sm text-accent-200 hover:text-accent-100" type="button" onClick={() => setShowRawJson((current) => !current)}>
                {showRawJson ? 'Hide raw JSON' : 'Show raw JSON'}
              </button>
              {showRawJson ? (
                <textarea className="mt-3 min-h-64 w-full rounded-2xl border border-white/10 bg-[#0b1220]/70 px-4 py-3 font-mono text-xs text-slate-200" readOnly value={JSON.stringify(selectedLog.payload ?? {}, null, 2)} />
              ) : null}
            </div>
          </div>
        ) : (
          <SectionHint>Pick an audit row to inspect the actor, target, and readable before/after data.</SectionHint>
        )}
      </Panel>
    </div>
  );
}

