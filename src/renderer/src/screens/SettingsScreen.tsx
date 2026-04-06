import { useState } from 'react';

import { Panel } from '../components/Panel';
import { useLauncherStore } from '../store/launcher-store';

export function SettingsScreen() {
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
    <div className="screen-grid">
      <Panel title="Launcher settings" kicker="Local persistence">
        <div className="settings-grid">
          <label className="field">
            <span>Minimum RAM (MB)</span>
            <input
              type="number"
              value={formState.minRamMb}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  minRamMb: event.target.value,
                }))
              }
            />
          </label>

          <label className="field">
            <span>Maximum RAM (MB)</span>
            <input
              type="number"
              value={formState.maxRamMb}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  maxRamMb: event.target.value,
                }))
              }
            />
          </label>

          <label className="field field-wide">
            <span>Java path</span>
            <input
              value={formState.javaPath}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  javaPath: event.target.value,
                }))
              }
            />
          </label>

          <label className="field field-wide">
            <span>Instance path</span>
            <input
              value={formState.instancePath}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  instancePath: event.target.value,
                }))
              }
            />
          </label>

          <label className="checkbox-row">
            <input
              checked={formState.debugMode}
              type="checkbox"
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  debugMode: event.target.checked,
                }))
              }
            />
            <span>Enable debug mode</span>
          </label>
        </div>

        <div className="button-row">
          <button
            className="button button-primary"
            type="button"
            onClick={() =>
              updateSettings({
                minRamMb: Number(formState.minRamMb),
                maxRamMb: Number(formState.maxRamMb),
                javaPath: formState.javaPath,
                instancePath: formState.instancePath,
                debugMode: formState.debugMode,
              })
            }
          >
            Save local settings
          </button>
        </div>
      </Panel>

      <Panel title="Current snapshot" kicker="Stored values">
        <ul className="detail-list">
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
