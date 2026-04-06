import { useShallow } from 'zustand/react/shallow';

import { Button } from '../components/Button';
import { Panel } from '../components/Panel';
import { StatusBadge } from '../components/StatusBadge';
import { useLauncherStore } from '../store/launcher-store';

export function MainScreen() {
  const {
    appVersion,
    buildStatus,
    logsVisible,
    mockSession,
    serverStatus,
    setLogsVisible,
    updateStatus,
  } = useLauncherStore(
    useShallow((state) => ({
      appVersion: state.appVersion,
      buildStatus: state.buildStatus,
      logsVisible: state.logsVisible,
      mockSession: state.mockSession,
      serverStatus: state.serverStatus,
      setLogsVisible: state.setLogsVisible,
      updateStatus: state.updateStatus,
    })),
  );

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="xl:col-span-2 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="space-y-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-accent-300/80">
            Launcher overview
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-white">
            Main control surface
          </h2>
          <p className="max-w-3xl text-base leading-7 text-slate-300">
            This screen hosts the MVP placeholders for Play, news, server status,
            updates, logs, and basic user information.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button type="button">Play (placeholder)</Button>
          <Button variant="secondary" type="button" onClick={() => setLogsVisible(!logsVisible)}>
            {logsVisible ? 'Hide logs' : 'Show logs'}
          </Button>
          <StatusBadge
            label={serverStatus === 'online' ? 'Server responsive' : 'Server status mocked'}
            tone={serverStatus === 'online' ? 'live' : 'warn'}
          />
        </div>
      </section>

      <Panel title="User" kicker="Profile placeholder">
        <ul className="m-0 space-y-3 pl-5 text-sm leading-7 text-slate-300">
          <li>Identity: {mockSession.email}</li>
          <li>Role: player</li>
          <li>Ban status: not connected</li>
        </ul>
      </Panel>

      <Panel title="Server status" kicker="Status placeholder">
        <ul className="m-0 space-y-3 pl-5 text-sm leading-7 text-slate-300">
          <li>Cluster state: {serverStatus}</li>
          <li>Player count: hidden until backend arrives</li>
          <li>MOTD: managed in later phase</li>
        </ul>
      </Panel>

      <Panel title="News feed" kicker="Content placeholder">
        <p className="text-sm leading-7 text-slate-300">
          Latest server news, release notes, and announcements will appear here
          after backend integration.
        </p>
      </Panel>

      <Panel title="Version status" kicker="Release placeholder">
        <ul className="m-0 space-y-3 pl-5 text-sm leading-7 text-slate-300">
          <li>Launcher version: {appVersion}</li>
          <li>{updateStatus}</li>
          <li>{buildStatus}</li>
        </ul>
      </Panel>

      {logsVisible ? (
        <Panel title="Launcher logs" kicker="Runtime placeholder">
          <pre className="m-0 overflow-auto rounded-[24px] border border-white/10 bg-[#060916]/90 p-5 text-sm leading-7 text-emerald-200">
{`[info] shell mounted
[info] navigation ready
[info] build updater mocked
[info] launch runtime not connected`}
          </pre>
        </Panel>
      ) : null}
    </div>
  );
}
