import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

type Updater<T> = Partial<T> | ((current: T) => Partial<T>);

function parseViewState<T extends Record<string, unknown>>(rawValue: string | null, defaults: T) {
  if (!rawValue) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<T>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function useRouteViewState<T extends Record<string, unknown>>(defaults: T) {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawValue = searchParams.get('view');

  const state = useMemo(() => parseViewState(rawValue, defaults), [defaults, rawValue]);

  const setState = useCallback(
    (updater: Updater<T>, options?: { replace?: boolean }) => {
      const nextPatch = typeof updater === 'function' ? updater(state) : updater;
      const nextState = { ...state, ...nextPatch };
      const nextRawValue = JSON.stringify(nextState);

      if (nextRawValue === rawValue) {
        return;
      }

      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('view', nextRawValue);
      setSearchParams(nextParams, { replace: options?.replace ?? true });
    },
    [rawValue, searchParams, setSearchParams, state],
  );

  return { state, setState };
}

export function buildViewHref(path: string, state: Record<string, unknown>) {
  return `${path}?view=${encodeURIComponent(JSON.stringify(state))}`;
}
