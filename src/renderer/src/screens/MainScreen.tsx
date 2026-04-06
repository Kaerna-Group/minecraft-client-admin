import { useShallow } from 'zustand/react/shallow';

import { Panel } from '../components/Panel';
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
    <div className="screen-grid">
      <section className="hero compact-hero">
        <p className="eyebrow">Launcher overview</p>
        <h2>Main control surface</h2>
        <p className="hero-copy">
          This screen hosts the MVP placeholders for Play, news, server status,
          updates, logs, and basic user information.
        </p>
        <div className="button-row">
          <button className="button button-primary" type="button">
            Play (placeholder)
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setLogsVisible(!logsVisible)}
          >
            {logsVisible ? 'Hide logs' : 'Show logs'}
          </button>
        </div>
      </section>

      <Panel title="User" kicker="Profile placeholder">
        <ul className="detail-list">
          <li>Identity: {mockSession.email}</li>
          <li>Role: player</li>
          <li>Ban status: not connected</li>
        </ul>
      </Panel>

      <Panel title="Server status" kicker="Status placeholder">
        <ul className="detail-list">
          <li>Cluster state: {serverStatus}</li>
          <li>Player count: hidden until backend arrives</li>
          <li>MOTD: managed in later phase</li>
        </ul>
      </Panel>

      <Panel title="News feed" kicker="Content placeholder">
        <p className="muted">
          Latest server news, release notes, and announcements will appear here
          after backend integration.
        </p>
      </Panel>

      <Panel title="Version status" kicker="Release placeholder">
        <ul className="detail-list">
          <li>Launcher version: {appVersion}</li>
          <li>{updateStatus}</li>
          <li>{buildStatus}</li>
        </ul>
      </Panel>

      {logsVisible ? (
        <Panel title="Launcher logs" kicker="Runtime placeholder">
          <pre className="log-box">
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
