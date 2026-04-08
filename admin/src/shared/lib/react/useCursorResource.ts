import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CursorPage, CursorValue } from '@shared/lib/cursor';

type Loader<T> = (cursor: CursorValue | null) => Promise<CursorPage<T>>;

type CursorState = {
  currentCursor: CursorValue | null;
  history: Array<CursorValue | null>;
};

type CursorResourceOptions = {
  restoredState?: CursorState;
  restoreKey?: string;
  onStateChange?: (state: CursorState) => void;
};

export function useCursorResource<T>(loader: Loader<T>, queryKey: string, options: CursorResourceOptions = {}) {
  const loaderRef = useRef(loader);
  const onStateChangeRef = useRef(options.onStateChange);
  const previousQueryKeyRef = useRef(queryKey);
  const lastRestoreKeyRef = useRef<string | undefined>(options.restoreKey);
  const [currentCursor, setCurrentCursor] = useState<CursorValue | null>(options.restoredState?.currentCursor ?? null);
  const [history, setHistory] = useState<Array<CursorValue | null>>(options.restoredState?.history ?? []);
  const [data, setData] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<CursorValue | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useEffect(() => {
    onStateChangeRef.current = options.onStateChange;
  }, [options.onStateChange]);

  useEffect(() => {
    if (options.restoreKey === undefined || options.restoreKey === lastRestoreKeyRef.current) {
      return;
    }

    lastRestoreKeyRef.current = options.restoreKey;
    setCurrentCursor(options.restoredState?.currentCursor ?? null);
    setHistory(options.restoredState?.history ?? []);
  }, [options.restoreKey, options.restoredState]);

  useEffect(() => {
    onStateChangeRef.current?.({ currentCursor, history });
  }, [currentCursor, history]);

  const effectiveCursor = useMemo(() => {
    if (previousQueryKeyRef.current !== queryKey) {
      return options.restoredState?.currentCursor ?? null;
    }

    return currentCursor;
  }, [currentCursor, options.restoredState?.currentCursor, queryKey]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await loaderRef.current(effectiveCursor);
      setData(result.items);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Unknown error';
      setError(message);
      setData([]);
      setNextCursor(null);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [effectiveCursor]);

  useEffect(() => {
    if (previousQueryKeyRef.current !== queryKey) {
      previousQueryKeyRef.current = queryKey;
      setCurrentCursor(options.restoredState?.currentCursor ?? null);
      setHistory(options.restoredState?.history ?? []);
      return;
    }

    void refresh();
  }, [options.restoredState, queryKey, refresh]);

  useEffect(() => {
    void refresh();
  }, [effectiveCursor, refresh]);

  const goNext = useCallback(() => {
    if (!nextCursor) {
      return;
    }

    setHistory((current) => [...current, effectiveCursor]);
    setCurrentCursor(nextCursor);
  }, [effectiveCursor, nextCursor]);

  const goPrevious = useCallback(() => {
    setHistory((current) => {
      if (current.length === 0) {
        return current;
      }

      const nextHistory = [...current];
      const previousCursor = nextHistory.pop() ?? null;
      setCurrentCursor(previousCursor);
      return nextHistory;
    });
  }, []);

  return {
    data,
    error,
    loading,
    refresh,
    hasMore,
    hasPrevious: history.length > 0,
    currentCursor,
    history,
    goNext,
    goPrevious,
  };
}
