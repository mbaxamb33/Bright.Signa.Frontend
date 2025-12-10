import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Invitation, getInvitationByToken, acceptInvitation as apiAcceptInvitation, listPeriods, recomputeUserWeekTargets } from '../lib/api';

type InviteContextValue = {
  inviteToken: string | null;
  invitation: Invitation | null;
  loading: boolean;
  error: string | null;
  setInviteToken: (token: string | null) => void;
  loadInvitation: (token: string) => Promise<Invitation | null>;
  acceptInvitation: () => Promise<void>;
  clearInvite: () => void;
};

const InviteContext = createContext<InviteContextValue | undefined>(undefined);

const INVITE_TOKEN_KEY = 'pending_invite_token';

export function InviteProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage in case user refreshes during invite flow
  const [inviteToken, setInviteTokenState] = useState<string | null>(() => {
    return localStorage.getItem(INVITE_TOKEN_KEY);
  });
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setInviteToken = useCallback((token: string | null) => {
    setInviteTokenState(token);
    if (token) {
      localStorage.setItem(INVITE_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(INVITE_TOKEN_KEY);
    }
  }, []);

  const loadInvitation = useCallback(async (token: string): Promise<Invitation | null> => {
    setLoading(true);
    setError(null);
    try {
      const inv = await getInvitationByToken(token);
      setInvitation(inv);
      setInviteToken(token);
      return inv;
    } catch (e: any) {
      setError(e?.message || 'Failed to load invitation');
      setInvitation(null);
      setInviteToken(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setInviteToken]);

  const acceptInvitation = useCallback(async () => {
    if (!inviteToken) {
      throw new Error('No invite token to accept');
    }
    setLoading(true);
    setError(null);
    try {
      await apiAcceptInvitation(inviteToken);

      // After successful acceptance, recalculate targets for active periods
      // This ensures the new member gets their fair share of targets
      if (invitation?.shop_id) {
        try {
          const periods = await listPeriods(invitation.shop_id);
          // Recalculate for draft and published periods (not locked or archived)
          const activePeriods = periods.filter(p => p.status === 'draft' || p.status === 'published');
          await Promise.all(activePeriods.map(p => recomputeUserWeekTargets(p.id)));
        } catch (recalcErr) {
          // Don't fail the invite acceptance if recalculation fails
          // The manager can manually recalculate later
          console.warn('Failed to recalculate targets after invite acceptance:', recalcErr);
        }
      }

      // Clear invite state after successful acceptance
      setInvitation(null);
      setInviteToken(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to accept invitation');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [inviteToken, invitation, setInviteToken]);

  const clearInvite = useCallback(() => {
    setInvitation(null);
    setInviteToken(null);
    setError(null);
  }, [setInviteToken]);

  const value = useMemo(
    () => ({
      inviteToken,
      invitation,
      loading,
      error,
      setInviteToken,
      loadInvitation,
      acceptInvitation,
      clearInvite,
    }),
    [inviteToken, invitation, loading, error, setInviteToken, loadInvitation, acceptInvitation, clearInvite]
  );

  return <InviteContext.Provider value={value}>{children}</InviteContext.Provider>;
}

export function useInvite() {
  const ctx = useContext(InviteContext);
  if (!ctx) throw new Error('useInvite must be used within InviteProvider');
  return ctx;
}
