import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@renderer/components/Button';
import { Panel } from '@renderer/components/Panel';
import { StatusBadge } from '@renderer/components/StatusBadge';
import { useLauncherStore } from '@renderer/store/launcher-store';

function getBuildActionLabel(phase: string, installedVersion: string | null) {
  if (phase === 'failed') {
    return 'Retry install';
  }

  if (phase === 'ready') {
    return 'Build ready';
  }

  if (phase === 'bootstrapping_minecraft') {
    return 'Bootstrap Minecraft';
  }

  if (phase === 'bootstrapping_neoforge') {
    return 'Bootstrap NeoForge';
  }

  if (phase === 'applying_modpack') {
    return 'Apply modpack';
  }

  if (phase === 'update_available') {
    return installedVersion ? 'Update build' : 'Install build';
  }

  if (phase === 'checking') {
    return 'Checking build';
  }

  return installedVersion ? 'Check build' : 'Install build';
}

function getRuntimeActionLabel(phase: string) {
  if (phase === 'running') {
    return 'Stop game';
  }

  if (phase === 'launching') {
    return 'Launching...';
  }

  if (phase === 'stopping') {
    return 'Stopping...';
  }

  if (phase === 'ready_to_launch') {
    return 'Play';
  }

  if (phase === 'validating') {
    return 'Validating runtime';
  }

  return 'Validate runtime';
}

export function MainScreenContent() {
  const {
    activeBan,
    activeRelease,
    appVersion,
    dataError,
    dataLoading,
    installActiveRelease,
    installState,
    launchGame,
    logsVisible,
    news,
    profile,
    refreshInstallState,
    retryInstall,
    roles,
    runtimeState,
    serverStatus,
    session,
    setLogsVisible,
    stopGame,
    validateRuntime,
  } = useLauncherStore(
    useShallow((state) => ({
      activeBan: state.activeBan,
      activeRelease: state.activeRelease,
      appVersion: state.appVersion,
      dataError: state.dataError,
      dataLoading: state.dataLoading,
      installActiveRelease: state.installActiveRelease,
      installState: state.installState,
      launchGame: state.launchGame,
      logsVisible: state.logsVisible,
      news: state.news,
      profile: state.profile,
      refreshInstallState: state.refreshInstallState,
      retryInstall: state.retryInstall,
      roles: state.roles,
      runtimeState: state.runtimeState,
      serverStatus: state.serverStatus,
      session: state.session,
      setLogsVisible: state.setLogsVisible,
      stopGame: state.stopGame,
      validateRuntime: state.validateRuntime,
    })),
  );

  const installBusy =
    installState.phase === 'bootstrapping_minecraft' ||
    installState.phase === 'bootstrapping_neoforge' ||
    installState.phase === 'applying_modpack' ||
    installState.phase === 'checking';
  const runtimeBusy =
    runtimeState.phase === 'validating' ||
    runtimeState.phase === 'launching' ||
    runtimeState.phase === 'stopping';
  const roleLabel = roles.length > 0 ? roles.join(', ') : 'player';
  const nickname = profile?.nickname?.trim() || 'No nickname set';
  const buildActionLabel = getBuildActionLabel(
    installState.phase,
    installState.installedVersion,
  );
  const runtimeActionLabel = getRuntimeActionLabel(runtimeState.phase);
  const installReady = installState.phase === 'ready';
  const playBlockedByBan = Boolean(activeBan);
  const hasZipRelease = Boolean(activeRelease?.zip_url);
  const canPlay =
    installReady &&
    runtimeState.phase === 'ready_to_launch' &&
    !playBlockedByBan &&
    !dataLoading;

  const buildDisabledReason = installBusy
    ? 'Build install is already in progress.'
    : !activeRelease
      ? 'No active release is published in Supabase yet.'
      : !hasZipRelease
        ? 'The active release does not have a ZIP URL yet.'
        : installState.phase === 'ready'
          ? 'Build is already installed and ready.'
          : '';

  const validateDisabledReason = !installReady
    ? 'Install the active build before validating runtime.'
    : runtimeBusy
      ? 'Runtime validation or launch is already in progress.'
      : runtimeState.phase === 'running'
        ? 'Stop Minecraft before validating runtime again.'
        : '';

  const playDisabledReason = playBlockedByBan
    ? `Play is blocked by ban: ${activeBan?.reason ?? 'active restriction'}`
    : dataLoading
      ? 'Launcher data is still loading.'
      : installState.phase !== 'ready'
        ? 'Install or update the build before playing.'
        : runtimeState.phase !== 'ready_to_launch'
          ? 'Validate runtime before starting Minecraft.'
          : '';

  const launcherLogLines = useMemo(
    () =>
      [
        `[info] session: ${session?.user.email ?? 'none'}`,
        `[info] roles: ${roleLabel}`,
        `[info] active ban: ${activeBan ? 'yes' : 'no'}`,
        `[info] remote release: ${activeRelease?.version ?? 'missing'}`,
        `[info] release zip url: ${activeRelease?.zip_url ?? 'missing'}`,
        `[info] installed version: ${installState.installedVersion ?? 'missing'}`,
        `[info] install phase: ${installState.phase}`,
        `[info] install message: ${installState.message}`,
        `[info] runtime phase: ${runtimeState.phase}`,
        `[info] runtime java: ${runtimeState.javaPath ?? 'missing'}`,
        `[info] runtime message: ${runtimeState.message}`,
        `[info] news items: ${news.length}`,
      ].join('\n'),
    [
      activeBan,
      activeRelease?.version,
      activeRelease?.zip_url,
      installState.installedVersion,
      installState.message,
      installState.phase,
      news.length,
      roleLabel,
      runtimeState.javaPath,
      runtimeState.message,
      runtimeState.phase,
      session?.user.email,
    ],
  );

  const runtimeLogLines =
    runtimeState.logs.length > 0
      ? runtimeState.logs.join('\n')
      : 'No runtime output yet.';

  const primaryAction = (() => {
    if (runtimeState.phase === 'running') {
      return {
        label: 'Stop game',
        disabled: runtimeBusy,
        reason: runtimeBusy ? 'Stop request is already being processed.' : '',
        onClick: () => void stopGame(),
      };
    }

    if (installState.phase === 'failed') {
      return {
        label: 'Retry install',
        disabled: false,
        reason: '',
        onClick: () => void retryInstall(),
      };
    }

    if (installState.phase !== 'ready') {
      return {
        label: buildActionLabel,
        disabled: Boolean(buildDisabledReason),
        reason: buildDisabledReason,
        onClick: () => void installActiveRelease(),
      };
    }

    if (runtimeState.phase !== 'ready_to_launch') {
      return {
        label: runtimeActionLabel,
        disabled: Boolean(validateDisabledReason),
        reason: validateDisabledReason,
        onClick: () => void validateRuntime(),
      };
    }

    return {
      label: 'Play',
      disabled: Boolean(playDisabledReason),
      reason: playDisabledReason,
      onClick: () => void launchGame(),
    };
  })();

  const interactionHints = [
    primaryAction.reason,
    buildDisabledReason && primaryAction.label !== buildActionLabel
      ? `Build action: ${buildDisabledReason}`
      : '',
    validateDisabledReason && primaryAction.label !== runtimeActionLabel
      ? `Runtime validation: ${validateDisabledReason}`
      : '',
    playDisabledReason && primaryAction.label !== 'Play'
      ? `Play action: ${playDisabledReason}`
      : '',
  ].filter(Boolean);

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
            This screen now reflects live auth, release metadata, build
            install/update state, Java runtime validation, and the first
            playable Minecraft launch pipeline with runtime log capture.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={primaryAction.disabled}
            onClick={primaryAction.onClick}
            title={primaryAction.reason || undefined}
          >
            {primaryAction.label}
          </Button>
          <Button
            variant="secondary"
            type="button"
            disabled={Boolean(buildDisabledReason)}
            onClick={() => void installActiveRelease()}
            title={buildDisabledReason || undefined}
          >
            {buildActionLabel}
          </Button>
          <Button
            variant="secondary"
            type="button"
            disabled={Boolean(validateDisabledReason)}
            onClick={() => void validateRuntime()}
            title={validateDisabledReason || undefined}
          >
            {runtimeState.phase === 'ready_to_launch'
              ? 'Runtime ready'
              : 'Validate runtime'}
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => void refreshInstallState()}
          >
            Refresh build status
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => setLogsVisible(!logsVisible)}
          >
            {logsVisible ? 'Hide logs' : 'Show logs'}
          </Button>
          <StatusBadge
            label={
              serverStatus === 'online'
                ? 'Backend reachable'
                : serverStatus === 'degraded'
                  ? 'Data degraded'
                  : 'Offline'
            }
            tone={
              serverStatus === 'online'
                ? 'live'
                : serverStatus === 'degraded'
                  ? 'warn'
                  : 'muted'
            }
          />
          <StatusBadge
            label={
              installState.phase === 'ready'
                ? 'Build ready'
                : installState.phase === 'failed'
                  ? 'Build failed'
                  : installState.updateAvailable
                    ? 'Build update available'
                    : 'Build pending'
            }
            tone={
              installState.phase === 'ready'
                ? 'live'
                : installState.phase === 'failed'
                  ? 'warn'
                  : 'muted'
            }
          />
          <StatusBadge
            label={
              runtimeState.phase === 'ready_to_launch'
                ? 'Runtime ready'
                : runtimeState.phase === 'running'
                  ? 'Minecraft running'
                  : runtimeState.phase === 'failed'
                    ? 'Runtime failed'
                    : 'Runtime pending'
            }
            tone={
              runtimeState.phase === 'ready_to_launch' ||
              runtimeState.phase === 'running'
                ? 'live'
                : runtimeState.phase === 'failed'
                  ? 'warn'
                  : 'muted'
            }
          />
          {activeBan ? <StatusBadge label="Ban active" tone="warn" /> : null}
        </div>
        {interactionHints.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-sky-300/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-sky-200/80">
              Action diagnostics
            </p>
            <ul className="m-0 space-y-1 pl-5">
              {interactionHints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {dataError ? (
          <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {dataError}
          </div>
        ) : null}
        {installState.lastError ? (
          <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {installState.lastError}
          </div>
        ) : null}
        {runtimeState.lastError ? (
          <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {runtimeState.lastError}
          </div>
        ) : null}
      </section>

      <Panel title="User" kicker="Live account">
        <ul className="m-0 space-y-3 pl-5 text-sm leading-7 text-slate-300">
          <li>Identity: {session?.user.email ?? 'Unknown user'}</li>
          <li>Nickname: {nickname}</li>
          <li>Roles: {roleLabel}</li>
          <li>Profile created: {profile?.created_at ?? 'Not available'}</li>
        </ul>
      </Panel>

      <Panel title="Install status" kicker="Local vs remote build">
        <ul className="m-0 space-y-3 pl-5 text-sm leading-7 text-slate-300">
          <li>
            Remote active version:{' '}
            {activeRelease?.version ?? 'No active release published yet'}
          </li>
          <li>
            Modpack ZIP URL: {activeRelease?.zip_url ?? 'missing on active release'}
          </li>
          <li>
            Installed version:{' '}
            {installState.installedVersion ?? 'Nothing installed locally'}
          </li>
          <li>Install phase: {installState.phase}</li>
          <li>Progress: {installState.progress}%</li>
          <li>Message: {installState.message}</li>
          <li>Instance path: {installState.instancePath}</li>
        </ul>
      </Panel>

      <Panel title="Runtime status" kicker="Java and launch readiness">
        <ul className="m-0 space-y-3 pl-5 text-sm leading-7 text-slate-300">
          <li>Runtime phase: {runtimeState.phase}</li>
          <li>Java path: {runtimeState.javaPath ?? 'not detected yet'}</li>
          <li>Java version: {runtimeState.javaVersion ?? 'unknown'}</li>
          <li>Process id: {runtimeState.processId ?? 'not running'}</li>
          <li>Can launch: {runtimeState.canLaunch ? 'yes' : 'no'}</li>
          <li>Message: {runtimeState.message}</li>
        </ul>
      </Panel>

      <Panel title="Play access" kicker="Ban and release state">
        <ul className="m-0 space-y-3 pl-5 text-sm leading-7 text-slate-300">
          <li>Ban status: {activeBan ? 'active' : 'clear'}</li>
          <li>Ban reason: {activeBan?.reason ?? 'No active ban record'}</li>
          <li>
            Ban until:{' '}
            {activeBan?.banned_until ?? 'Not scheduled / permanent not active'}
          </li>
          <li>
            Play gate:{' '}
            {playBlockedByBan
              ? 'blocked by ban'
              : canPlay
                ? 'ready'
                : 'waiting for runtime validation'}
          </li>
        </ul>
      </Panel>

      <Panel title="News feed" kicker="Published content">
        {news.length > 0 ? (
          <div className="grid gap-3">
            {news.slice(0, 4).map((entry) => (
              <article
                key={entry.id}
                className="rounded-[24px] border border-white/10 bg-[#060916]/70 p-4"
              >
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {entry.created_at ?? 'Unknown date'}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  {entry.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {entry.body}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-7 text-slate-300">
            No published news items are available yet.
          </p>
        )}
      </Panel>

      <Panel title="Version status" kicker="Release metadata">
        <ul className="m-0 space-y-3 pl-5 text-sm leading-7 text-slate-300">
          <li>Launcher version: {appVersion}</li>
          <li>Active build version: {activeRelease?.version ?? 'none'}</li>
          <li>Modpack ZIP URL: {activeRelease?.zip_url ?? 'not provided'}</li>
          <li>Published at: {activeRelease?.published_at ?? 'unknown'}</li>
          <li>Changelog: {activeRelease?.changelog ?? 'No changelog yet'}</li>
        </ul>
      </Panel>

      {logsVisible ? (
        <>
          <Panel title="Launcher logs" kicker="Shell state">
            <pre className="m-0 overflow-auto rounded-[24px] border border-white/10 bg-[#060916]/90 p-5 text-sm leading-7 text-emerald-200">
              {launcherLogLines}
            </pre>
          </Panel>
          <Panel title="Runtime logs" kicker="Minecraft process output">
            <pre className="m-0 overflow-auto rounded-[24px] border border-white/10 bg-[#060916]/90 p-5 text-sm leading-7 text-cyan-100">
              {runtimeLogLines}
            </pre>
          </Panel>
        </>
      ) : null}
    </div>
  );
}



