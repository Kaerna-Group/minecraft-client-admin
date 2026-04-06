import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CursorPage, CursorValue } from '@shared/lib/cursor';

type Loader<T> = (cursor: CursorValue | null) => Promise<CursorPage<T>>;

export function useCursorResource<T>(loader: Loader<T>, queryKey: string) {
  const previousQueryKeyRef = useRef(queryKey);
  const [currentCursor, setCurrentCursor] = useState<CursorValue | null>(null);
  const [history, setHistory] = useState<Array<CursorValue | null>>([]);
  const [data, setData] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<CursorValue | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const effectiveCursor = useMemo(() => {
    if (previousQueryKeyRef.current !== queryKey) {
      return null;
    }

    return currentCursor;
  }, [currentCursor, queryKey]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await loader(effectiveCursor);
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
  }, [effectiveCursor, loader]);

  useEffect(() => {
    if (previousQueryKeyRef.current !== queryKey) {
      previousQueryKeyRef.current = queryKey;
      setCurrentCursor(null);
      setHistory([]);
    }

    void refresh();
  }, [queryKey, refresh]);

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
    goNext,
    goPrevious,
  };
}
