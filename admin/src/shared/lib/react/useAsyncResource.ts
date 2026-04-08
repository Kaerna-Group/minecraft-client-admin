import { useCallback, useEffect, useRef, useState } from 'react';

export function useAsyncResource<T>(loader: () => Promise<T>) {
  const loaderRef = useRef(loader);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError('');

    try {
      const nextData = await loaderRef.current();
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      setData(nextData);
    } catch (nextError) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      const message = nextError instanceof Error ? nextError.message : 'Unknown error';
      setError(message);
    } finally {
      const shouldCommit = mountedRef.current && requestId === requestIdRef.current;
      if (shouldCommit) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    data,
    error,
    loading,
    refresh,
  };
}
