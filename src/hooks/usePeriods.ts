import { useEffect, useState } from 'react';
import { createPeriod, listPeriods, type PeriodSummary } from '../lib/api';

export function usePeriods(shopId: string | null) {
  const [periods, setPeriods] = useState<PeriodSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!shopId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listPeriods(shopId);
      setPeriods(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load periods');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const ensureCurrentMonth = async () => {
    if (!shopId) return null;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const existing = periods.find((p) => p.year === year && p.month === month);
    if (existing) return existing;
    const created = await createPeriod(shopId, { year, month });
    await refresh();
    return created;
  };

  return { periods, loading, error, refresh, ensureCurrentMonth };
}

