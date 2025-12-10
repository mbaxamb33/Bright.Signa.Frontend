import { useEffect, useState } from 'react';
import { listCategories, type Category } from '../lib/api';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    listCategories()
      .then((data) => {
        if (!mounted) return;
        setCategories(data);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Failed to load categories');
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return { categories, loading, error };
}

