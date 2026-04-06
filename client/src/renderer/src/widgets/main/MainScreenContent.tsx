import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@renderer/components/Button';
import { Panel } from '@renderer/components/Panel';
import { StatusBadge } from '@renderer/components/StatusBadge';
import { useLauncherStore } from '@renderer/store/launcher-store';

export function MainScreenContent() {
  const {
    activeBan,
    activeRelease,
    appVersion,
    dataError,
    dataLoading,
    logsVisible,
    news,
    profile,
    roles,
    serverStatus,
    session,
    setLogsVisible,
  } = useLauncherStore(
    useShallow((state) => ({
      activeBan: state.activeBan,
      activeRelease: state.activeRelease,
      appVersion: state.appVersion,
      dataError: state.dataError,
      dataLoading: state.dataLoading,
      logsVisible: state.logsVisible,
      news: state.news,
      profile: state.profile,
      roles: state.roles,
      serverStatus: state.serverStatus,
      session: state.session,
      setLogsVisible: state.setLogsVisible,
    })),
  );

  const playDisabled = Boolean(activeBan) || !activeRelease || dataLoading;
  const playLabel = activeBan ? 'Play blocked by ban' : activeRelease ? 'Play (runtime wiring next)' : 'Play unavailable';
  const roleLabel = roles.length > 0 ? roles.join(', ') : 'player';
  const nickname = profile?.nickname?.trim() || 'No nickname set';

  const logLines = useMemo(
    () => [
      `[info] session: ${session?.user.email ?? 'none'}`,
      `[info] roles: ${roleLabel}`,
      `[info] active ban: ${activeBan ? 'yes' : 'no'}`,
      `[info] release: ${activeRelease?.version ?? 'missing'}`,
      `[info] news items: ${news.length}`,
      '[info] installer/runtime remain for the next implementation phase',
    ].join('\n'),
    [activeBan, activeRelease?.version, news.length, roleLabel, session?.user.email],
  );

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="xl:col-span-2 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="space-y-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-accent-300/80">Launcher overview</p>
          <h2 className="text-4xl font-semibold tracking-tight text-white">Main control surface</h2>
          <p className="max-w-3xl text-base leading-7 text-slate-300">
            This screen now reflects live auth and backend data. Launcher install and Minecraft runtime are still intentionally deferred, but bans, news, and release metadata are real.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button disabled={playDisabled} type="button">{playLabel}</Button>
          <Button variant="secondary" type="button" onClick={() => setLogsVisible(!logsVisible)}>{logsVisible ? 'Hide logs' : 'Show logs'}</Button>
          <StatusBadge label={serverStatus === 'online' ? 'Backend reachable' : serverStatus === 'degraded' ? 'Data degraded' : 'Offline'} tone={serverStatus === 'online' ? 'live' : serverStatus === 'degraded' ? 'warn' : 'muted'} />
          {activeBan ? <StatusBadge label="Ban active" tone="warn" /> : null}
        </div>
        {dataError ? <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{dataError}</div> : null}
      </section>

      <Panel title="User" kicker="Live account">
        <ul className="m-0 space-y-3 pl-5 text-sm leading-7 text-slate-300">
          <li>Identity: {session?.user.email ?? 'Unknown user'}</li>
          <li>Nickname: {nickname}</li>
          <li>Roles: {roleLabel}</li>
          <li>Profile created: {profile?.created_at ?? 'Not available'}</li>
        </ul>
      </Panel>

      <Panel title="Play access" kicker="Ban and release state">
        <ul className="m-0 space-y-3 pl-5 text-sm leading-7 text-slate-300">
          <li>Ban status: {activeBan ? 'active' : 'clear'}</li>
          <li>Ban reason: {activeBan?.reason ?? 'No active ban record'}</li>
          <li>Ban until: {activeBan?.banned_until ?? 'Not scheduled / permanent not active'}</li>
          <li>Active release: {activeRelease?.version ?? 'No active release published yet'}</li>
        </ul>
      </Panel>

      <Panel title="News feed" kicker="Published content">
        {news.length > 0 ? (
          <div className="grid gap-3">
            {news.slice(0, 4).map((entry) => (
              <article key={entry.id} className="rounded-[24px] border border-white/10 bg-[#060916]/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{entry.created_at ?? 'Unknown date'}</div>
                <h3 className="mt-2 text-lg font-semibold text-white">{entry.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{entry.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-7 text-slate-300">No published news items are available yet.</p>
        )}
      </Panel>

      <Panel title="Version status" kicker="Release metadata">
        <ul className="m-0 space-y-3 pl-5 text-sm leading-7 text-slate-300">
          <li>Launcher version: {appVersion}</li>
          <li>Active build version: {activeRelease?.version ?? 'none'}</li>
          <li>Manifest URL: {activeRelease?.manifest_url ?? 'not provided'}</li>
          <li>Changelog: {activeRelease?.changelog ?? 'No changelog yet'}</li>
        </ul>
      </Panel>

      {logsVisible ? (
        <Panel title="Launcher logs" kicker="Runtime status">
          <pre className="m-0 overflow-auto rounded-[24px] border border-white/10 bg-[#060916]/90 p-5 text-sm leading-7 text-emerald-200">{logLines}</pre>
        </Panel>
      ) : null}
    </div>
  );
}
