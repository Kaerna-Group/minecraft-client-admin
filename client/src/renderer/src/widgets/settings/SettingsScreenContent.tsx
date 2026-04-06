import { useState } from 'react';

import { Button } from '@renderer/components/Button';
import { FieldShell, TextInput } from '@renderer/components/FieldShell';
import { Panel } from '@renderer/components/Panel';
import { useLauncherStore } from '@renderer/store/launcher-store';

export function SettingsScreenContent() {
  const settings = useLauncherStore((state) => state.settings);
  const updateSettings = useLauncherStore((state) => state.updateSettings);

  const [formState, setFormState] = useState({
    minRamMb: settings.minRamMb.toString(),
    maxRamMb: settings.maxRamMb.toString(),
    javaPath: settings.javaPath,
    instancePath: settings.instancePath,
    debugMode: settings.debugMode,
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <Panel title="Launcher settings" kicker="Local persistence">
        <div className="grid gap-4 md:grid-cols-2">
          <FieldShell label="Minimum RAM (MB)"><TextInput type="number" value={formState.minRamMb} onChange={(event) => setFormState((current) => ({ ...current, minRamMb: event.target.value }))} /></FieldShell>
          <FieldShell label="Maximum RAM (MB)"><TextInput type="number" value={formState.maxRamMb} onChange={(event) => setFormState((current) => ({ ...current, maxRamMb: event.target.value }))} /></FieldShell>
          <FieldShell label="Java path" wide><TextInput value={formState.javaPath} onChange={(event) => setFormState((current) => ({ ...current, javaPath: event.target.value }))} /></FieldShell>
          <FieldShell label="Instance path" wide><TextInput value={formState.instancePath} onChange={(event) => setFormState((current) => ({ ...current, instancePath: event.target.value }))} /></FieldShell>
          <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
            <input className="h-4 w-4 rounded border-white/20 bg-white/5 text-accent-400" checked={formState.debugMode} type="checkbox" onChange={(event) => setFormState((current) => ({ ...current, debugMode: event.target.checked }))} />
            <span>Enable debug mode</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="button" onClick={() => updateSettings({ minRamMb: Number(formState.minRamMb), maxRamMb: Number(formState.maxRamMb), javaPath: formState.javaPath, instancePath: formState.instancePath, debugMode: formState.debugMode })}>Save local settings</Button>
        </div>
      </Panel>

      <Panel title="Current snapshot" kicker="Stored values">
        <ul className="m-0 space-y-3 pl-5 text-sm leading-7 text-slate-300">
          <li>Min RAM: {settings.minRamMb} MB</li>
          <li>Max RAM: {settings.maxRamMb} MB</li>
          <li>Java path: {settings.javaPath}</li>
          <li>Instance path: {settings.instancePath}</li>
          <li>Debug mode: {settings.debugMode ? 'enabled' : 'disabled'}</li>
        </ul>
      </Panel>
    </div>
  );
}
