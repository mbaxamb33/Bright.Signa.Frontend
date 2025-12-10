import { useState, useEffect, lazy, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { useAuth } from './contexts/AuthContext';
import { useShop } from './contexts/ShopContext';
import { useInvite } from './contexts/InviteContext';
import { WelcomeSetup } from './components/shops/WelcomeSetup';
import { Onboarding } from './components/Auth/Onboarding';
import { Login } from './components/Auth/Login';
import { AcceptInvite } from './components/Auth/AcceptInvite';

// Lazy load heavy components
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const TargetManagement = lazy(() => import('./components/TargetManagement').then(m => ({ default: m.TargetManagement })));
const Team = lazy(() => import('./components/Team').then(m => ({ default: m.Team })));
const Categories = lazy(() => import('./components/Categories').then(m => ({ default: m.Categories })));
const ProgressTracking = lazy(() => import('./components/ProgressTracking').then(m => ({ default: m.ProgressTracking })));
const WeeklyProgress = lazy(() => import('./components/WeeklyProgress').then(m => ({ default: m.WeeklyProgress })));
const Leaderboard = lazy(() => import('./components/Leaderboard').then(m => ({ default: m.Leaderboard })));
const SalesLog = lazy(() => import('./components/SalesLog').then(m => ({ default: m.SalesLog })));
const LiveFeed = lazy(() => import('./components/LiveFeed').then(m => ({ default: m.LiveFeed })));

// Loading spinner for lazy components
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const { shops, loading: shopsLoading } = useShop();
  const { inviteToken, setInviteToken, loadInvitation } = useInvite();
  const [currentView, setCurrentView] = useState('dashboard');

  // Check for invite token in URL on mount
  useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    const search = window.location.search;

    // Check if URL contains Supabase auth params
    // These can be in hash (#access_token, #error) or query (?code, ?error)
    const hasSupabaseAuthParams =
      hash.includes('access_token') ||
      hash.includes('refresh_token') ||
      hash.includes('error_description') ||
      search.includes('code=') ||
      search.includes('error=');

    const inviteMatch = path.match(/^\/invite\/([^/]+)$/);
    if (inviteMatch) {
      const token = inviteMatch[1];
      setInviteToken(token);
      loadInvitation(token);

      // If Supabase auth params are present, defer URL cleanup to let Supabase process them first
      // Supabase needs to read these params from the URL to complete the auth flow
      if (hasSupabaseAuthParams) {
        // Wait for next tick to ensure Supabase has processed the URL
        setTimeout(() => {
          window.history.replaceState({}, '', '/');
        }, 0);
      } else {
        // No auth params, safe to clean up immediately
        window.history.replaceState({}, '', '/');
      }
    }
  }, [setInviteToken, loadInvitation]);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'sales-log':
        return <SalesLog />;
      case 'target-management':
        return <TargetManagement />;
      case 'employee-management':
        return <Team />;
      case 'categories':
        return <Categories />;
      case 'progress-tracking':
        return <ProgressTracking />;
      case 'weekly-breakdown':
        return <WeeklyProgress />;
      case 'leaderboard':
        return <Leaderboard />;
      case 'live-feed':
        return <LiveFeed />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">Loading…</div>
    );
  }

  // If user has an invite token but is not logged in, show the AcceptInvite page
  // This lets them set their password and create their account
  if (inviteToken && !user) {
    return <AcceptInvite token={inviteToken} />;
  }

  if (!user) {
    return <Login />;
  }

  const onboarded = Boolean((user.user_metadata as any)?.onboarded);
  const isInvitedUser = Boolean(inviteToken) || Boolean((user.user_metadata as any)?.invited);

  if (shopsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">Loading…</div>
    );
  }

  // Onboarding: user needs to set their name (and accept invite if applicable)
  // This applies to both:
  // 1. Owners who just logged in for the first time (need to set name)
  // 2. Invited users who confirmed their email and now need to set name + accept invite
  if (!onboarded) {
    return <Onboarding />;
  }

  // First-run for OWNERS only: no shops yet AND not an invited user
  // Invited users should NOT see this - they should have been added to a shop via invitation acceptance
  if (shops.length === 0 && !isInvitedUser) {
    return <WelcomeSetup />;
  }

  // Edge case: invited user completed onboarding but somehow has no shops
  // This could happen if invitation acceptance failed - show a helpful message
  if (shops.length === 0 && isInvitedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-6 text-center">
          <h1 className="text-gray-900 text-xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-slate-600 mb-4">
            We couldn't add you to the shop. Please contact the person who invited you for a new invitation.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('pending_invite_token');
              window.location.reload();
            }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Start Fresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
        <Suspense fallback={<PageLoader />}>
          {renderView()}
        </Suspense>
      </main>
    </div>
  );
}
