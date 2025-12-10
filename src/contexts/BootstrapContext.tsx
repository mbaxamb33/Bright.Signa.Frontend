import { createContext, useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBootstrap,
  type BootstrapResponse,
  type ShopSummary,
  type Category,
  type ShopMembership,
  type User,
} from '../lib/api';
import { useAuth } from './AuthContext';

type BootstrapContextValue = {
  // Data from bootstrap
  user: User | null;
  shops: ShopSummary[];
  categories: Category[];
  memberships: ShopMembership[];
  serverTime: string | null;
  // Loading states
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  // Refresh function
  refresh: () => Promise<void>;
};

const BootstrapContext = createContext<BootstrapContextValue | undefined>(undefined);

export function BootstrapProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<BootstrapResponse, Error>({
    queryKey: ['bootstrap'],
    queryFn: getBootstrap,
    // Only fetch when we have a valid session
    enabled: !!session?.access_token,
    // Cache for 5 minutes
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    // Retry once on failure
    retry: 1,
    // Don't refetch on window focus - bootstrap data rarely changes
    refetchOnWindowFocus: false,
  });

  const refresh = async () => {
    await refetch();
  };

  const value = useMemo(
    () => ({
      user: data?.user ?? null,
      shops: data?.shops ?? [],
      categories: data?.categories ?? [],
      memberships: data?.memberships ?? [],
      serverTime: data?.server_time ?? null,
      isLoading,
      isError,
      error: error ?? null,
      refresh,
    }),
    [data, isLoading, isError, error, refetch]
  );

  return (
    <BootstrapContext.Provider value={value}>
      {children}
    </BootstrapContext.Provider>
  );
}

export function useBootstrap() {
  const ctx = useContext(BootstrapContext);
  if (!ctx) throw new Error('useBootstrap must be used within BootstrapProvider');
  return ctx;
}

// Hook to get categories with caching - components can use this instead of listCategories()
export function useCategories() {
  const { categories, isLoading } = useBootstrap();
  return { categories, loading: isLoading };
}

// Hook to get shops with caching
export function useShops() {
  const { shops, isLoading } = useBootstrap();
  return { shops, loading: isLoading };
}

// Hook to invalidate bootstrap cache (call after mutations that affect bootstrap data)
export function useInvalidateBootstrap() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['bootstrap'] });
}
