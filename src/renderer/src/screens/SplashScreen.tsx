import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { launcherApi } from '../lib/launcher-api';
import { useLauncherStore } from '../store/launcher-store';

export function SplashScreen() {
  const [platform, setPlatform] = useState('loading...');
  const setShellReady = useLauncherStore((state) => state.setShellReady);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const appInfo = await launcherApi.getAppInfo();

      if (active) {
        setPlatform(appInfo?.platform ?? 'unknown');
        setShellReady(true);
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [setShellReady]);

  return (
    <section className="hero">
      <p className="eyebrow">Startup</p>
      <h2>Launcher shell is ready for the next phases.</h2>
      <p className="hero-copy">
        This splash route stands in for initialization, local config loading,
        update checks, and startup diagnostics.
      </p>

      <div className="metric-grid">
        <div className="metric-card">
          <span className="metric-label">Target</span>
          <strong>Windows-first MVP</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">Runtime</span>
          <strong>{platform}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">Phase</span>
          <strong>Launcher shell</strong>
        </div>
      </div>

      <div className="button-row">
        <Link className="button button-primary" to="/login">
          Continue to login
        </Link>
        <Link className="button button-secondary" to="/app">
          Open main screen
        </Link>
      </div>
    </section>
  );
}
