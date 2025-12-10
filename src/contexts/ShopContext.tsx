import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { listInvitations, type ShopSummary } from '../lib/api';
import { useAuth } from './AuthContext';
import { useBootstrap } from './BootstrapContext';

type Role = 'owner' | 'manager' | 'sales_junior' | 'sales_senior';

type ShopContextValue = {
  shops: ShopSummary[];
  currentShopId: string | null;
  currentRole: Role | null; // derived from membership if available
  loading: boolean;
  setCurrentShop: (id: string) => void;
  refresh: () => Promise<void>;
  canSeeTeam: boolean; // derived by probing an owner/manager endpoint
};

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

const LS_KEY = 'bs_current_shop_id';

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { shops: bootstrapShops, memberships, isLoading: bootstrapLoading, refresh: refreshBootstrap } = useBootstrap();

  const [currentShopId, setCurrentShopId] = useState<string | null>(
    typeof window !== 'undefined' ? window.localStorage.getItem(LS_KEY) : null
  );
  const [canSeeTeam, setCanSeeTeam] = useState(false);

  // Use shops from bootstrap instead of fetching separately
  const shops = bootstrapShops;
  const loading = bootstrapLoading;

  // Sync current shop with available shops
  useEffect(() => {
    if (!user) {
      setCurrentShopId(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(LS_KEY);
      }
      return;
    }

    if (shops.length === 0) return;

    const currentStillValid = currentShopId && shops.some(s => s.id === currentShopId);
    if (!currentStillValid) {
      const nextId = shops[0]?.id ?? null;
      setCurrentShopId(nextId);
      if (typeof window !== 'undefined') {
        if (nextId) window.localStorage.setItem(LS_KEY, nextId);
        else window.localStorage.removeItem(LS_KEY);
      }
    }
  }, [user, shops, currentShopId]);

  // Derive role from memberships (from bootstrap) instead of probing
  const currentRole = useMemo(() => {
    if (!currentShopId) return null;
    // First check membership data from bootstrap
    const membership = memberships.find(m => m.shop_id === currentShopId);
    if (membership) return membership.role as Role;
    // Fallback to shop role if available
    const shop = shops.find(s => s.id === currentShopId);
    return (shop?.role as Role) ?? null;
  }, [shops, memberships, currentShopId]);

  // Derive canSeeTeam from role instead of probing endpoint
  useEffect(() => {
    if (currentRole === 'owner' || currentRole === 'manager') {
      setCanSeeTeam(true);
    } else if (currentRole) {
      setCanSeeTeam(false);
    } else if (currentShopId) {
      // Fallback: probe endpoint if role not available
      let mounted = true;
      listInvitations(currentShopId)
        .then(() => {
          if (mounted) setCanSeeTeam(true);
        })
        .catch(() => {
          if (mounted) setCanSeeTeam(false);
        });
      return () => {
        mounted = false;
      };
    }
  }, [currentShopId, currentRole]);

  const setCurrentShop = useCallback((id: string) => {
    setCurrentShopId(id);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LS_KEY, id);
    }
  }, []);

  const refresh = useCallback(async () => {
    await refreshBootstrap();
  }, [refreshBootstrap]);

  const value = useMemo(
    () => ({ shops, currentShopId, currentRole, loading, setCurrentShop, refresh, canSeeTeam }),
    [shops, currentShopId, currentRole, loading, setCurrentShop, refresh, canSeeTeam]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopProvider');
  return ctx;
}
