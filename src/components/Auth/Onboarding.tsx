import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { bootstrapMe } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useShop } from '../../contexts/ShopContext';
import { useInvite } from '../../contexts/InviteContext';

export function Onboarding() {
  const { user } = useAuth();
  const { refresh: refreshShops } = useShop();
  const { inviteToken, invitation, acceptInvitation } = useInvite();

  // Determine if user is invited (has invite token) or is an owner (no invite, created directly)
  const isInvitedUser = Boolean(inviteToken) || Boolean((user?.user_metadata as any)?.invited);

  // For owners created directly in Supabase, they already have a password
  // For invited users, they set password during AcceptInvite flow, so they also have one
  // We only need to collect name here
  const initial = (user?.user_metadata as any)?.name || '';
  const [name, setName] = useState<string>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!name.trim()) {
        setError('Please enter your name.');
        setBusy(false);
        return;
      }

      // Update user metadata with name
      await supabase.auth.updateUser({
        data: { name, onboarded: true },
      });

      // Bootstrap user in backend
      await bootstrapMe({ name });

      // If this is an invited user, accept the invitation to join the shop
      // Using context's acceptInvitation which handles token state cleanup
      if (inviteToken) {
        try {
          await acceptInvitation();
        } catch (inviteErr: any) {
          // If invitation acceptance fails, still continue (user might already be a member)
          console.warn('Invite acceptance error:', inviteErr?.message);
        }
      }

      // Refresh shops to get the newly joined shop (for invited users) or empty list (for owners)
      await refreshShops();
    } catch (e: any) {
      setError(e?.message || 'Failed to complete onboarding');
    } finally {
      setBusy(false);
    }
  };

  // Determine welcome message based on whether user is invited
  const welcomeTitle = isInvitedUser ? 'Welcome to the Team!' : 'Welcome';
  const welcomeSubtitle = isInvitedUser
    ? `You're joining as ${invitation?.role ? invitation.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'a team member'}. Let's set up your profile.`
    : "Let's set up your profile to get started.";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="px-6 py-4 border-b bg-white">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-gray-900">{welcomeTitle}</h1>
          <p className="text-sm text-slate-600">{welcomeSubtitle}</p>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-700 mb-1">Your name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Alex Popescu"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">This will be shown on leaderboards and team pages.</p>
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className={`w-full px-4 py-2 rounded-lg text-white ${busy ? 'bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {busy ? 'Saving…' : 'Continue'}
            </button>
          </form>
        </div>
        <div className="mt-6 text-xs text-slate-500">
          Signed in as {user?.email}
        </div>
      </main>
    </div>
  );
}
