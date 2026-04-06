import { useCallback, useEffect, useState } from 'react';

export function useAsyncResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const nextData = await loader();
      setData(nextData);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [loader]);

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
