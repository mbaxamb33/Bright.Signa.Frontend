import { useEffect, useState } from 'react';
import { useInvite } from '../../contexts/InviteContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, AlertCircle, Loader2, CheckCircle, LogIn } from 'lucide-react';

type Props = {
  token: string;
};

export function AcceptInvite({ token }: Props) {
  const { user } = useAuth();
  const { invitation, loading, error: inviteError, loadInvitation, setInviteToken } = useInvite();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signUpSent, setSignUpSent] = useState(false);

  // Mode: 'signup' for new users, 'signin' for existing accounts
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');

  // Track if we failed to load invitation (API requires auth)
  const [previewFailed, setPreviewFailed] = useState(false);

  // Load invitation details on mount
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const inv = await loadInvitation(token);
        if (!mounted) return;

        if (!inv) {
          // loadInvitation returned null, meaning it failed
          setPreviewFailed(true);
        }
      } catch {
        if (mounted) {
          setPreviewFailed(true);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [token, loadInvitation]);

  // When invitation loads successfully, pre-fill email
  useEffect(() => {
    if (invitation?.invited_email) {
      setEmail(invitation.invited_email);
    }
  }, [invitation?.invited_email]);

  const validateForm = (): boolean => {
    setLocalError(null);

    // Validate email
    const emailToUse = invitation?.invited_email || email;
    if (!emailToUse || !emailToUse.includes('@')) {
      setLocalError('Please enter a valid email address');
      return false;
    }

    // Validate password
    if (!password) {
      setLocalError('Password is required');
      return false;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return false;
    }

    // For signup, validate confirm password
    if (mode === 'signup' && password !== confirm) {
      setLocalError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const emailToUse = invitation?.invited_email || email;

    setBusy(true);
    try {
      // Sign up the user with Supabase - they'll receive a confirmation email
      const redirectUrl = `${window.location.origin}/invite/${token}`;
      const { error: signUpError } = await supabase.auth.signUp({
        email: emailToUse,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            invited: true,
            invite_token: token,
            invite_role: invitation?.role,
          },
        },
      });

      if (signUpError) {
        // Check if user already exists
        if (signUpError.message?.toLowerCase().includes('already registered') ||
            signUpError.message?.toLowerCase().includes('already exists')) {
          setLocalError('An account with this email already exists. Please sign in instead.');
          setMode('signin');
          return;
        }
        throw signUpError;
      }

      setSignUpSent(true);
    } catch (e: any) {
      setLocalError(e?.message || 'Failed to create account');
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const emailToUse = invitation?.invited_email || email;

    setBusy(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (signInError) throw signInError;

      // After successful sign in, ensure invite token is stored
      // App.tsx will handle the rest of the flow (onboarding + invite acceptance)
      setInviteToken(token);

      // User is now logged in, App.tsx will redirect appropriately
    } catch (e: any) {
      setLocalError(e?.message || 'Failed to sign in');
    } finally {
      setBusy(false);
    }
  };

  // Format role for display
  const formatRole = (role: string) => {
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  // Check if invitation is expired/revoked (only if we have invitation details)
  if (invitation && invitation.status !== 'pending') {
    const statusMessages: Record<string, { title: string; message: string }> = {
      accepted: {
        title: 'Already Accepted',
        message: 'This invitation has already been accepted. If this was you, try signing in.',
      },
      revoked: {
        title: 'Invitation Revoked',
        message: 'This invitation has been revoked by the shop owner. Please contact them for a new invitation.',
      },
      expired: {
        title: 'Invitation Expired',
        message: 'This invitation has expired. Please contact the shop owner for a new invitation.',
      },
    };

    const status = statusMessages[invitation.status] || {
      title: `Invitation ${invitation.status}`,
      message: `This invitation is no longer valid. Please contact the shop owner for a new invitation.`,
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-6 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-gray-900 text-xl font-semibold mb-2">{status.title}</h1>
          <p className="text-slate-600 mb-4">{status.message}</p>
          {invitation.status === 'accepted' && (
            <button
              onClick={() => setMode('signin')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 mr-2"
            >
              Sign In
            </button>
          )}
          <a
            href="/"
            className="inline-block px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  // If user is already logged in with the correct email, they'll be handled by App.tsx
  // If logged in with wrong email, show warning
  if (user && invitation && user.email !== invitation.invited_email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-6 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-gray-900 text-xl font-semibold mb-2">Wrong Account</h1>
          <p className="text-slate-600 mb-4">
            This invitation is for <strong>{invitation.invited_email}</strong>, but you're signed in as <strong>{user.email}</strong>.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Sign Out & Continue
          </button>
        </div>
      </div>
    );
  }

  // Success state - signup email sent
  if (signUpSent) {
    const emailUsed = invitation?.invited_email || email;
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-6 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-gray-900 text-xl font-semibold mb-2">Check Your Email</h1>
          <p className="text-slate-600 mb-4">
            We've sent a confirmation email to <strong>{emailUsed}</strong>.
          </p>
          <p className="text-slate-600">
            Click the link in the email to complete your account setup and join the team.
          </p>
        </div>
      </div>
    );
  }

  // Determine if we need manual email input (preview failed or no invitation data)
  const needsEmailInput = previewFailed || !invitation;
  const emailValue = invitation?.invited_email || email;

  // Main form
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {mode === 'signup' ? (
              <Mail className="w-8 h-8 text-emerald-600" />
            ) : (
              <LogIn className="w-8 h-8 text-emerald-600" />
            )}
          </div>
          <h1 className="text-gray-900 text-xl font-semibold mb-2">
            {mode === 'signup' ? "You're Invited!" : 'Welcome Back'}
          </h1>
          {invitation?.role && mode === 'signup' && (
            <p className="text-slate-600">
              You've been invited to join as <strong>{formatRole(invitation.role)}</strong>
            </p>
          )}
          {mode === 'signin' && (
            <p className="text-slate-600">
              Sign in to accept your invitation
            </p>
          )}
          {needsEmailInput && mode === 'signup' && (
            <p className="text-slate-600">
              Enter your email and create a password to join
            </p>
          )}
        </div>

        {localError && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {localError}
          </div>
        )}

        {/* Show warning if preview failed */}
        {needsEmailInput && inviteError && (
          <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
            Could not load invitation details. Please enter the email address your invitation was sent to.
          </div>
        )}

        <form onSubmit={mode === 'signup' ? handleSignUp : handleSignIn} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">
              Email {!needsEmailInput && <span className="text-slate-400">(from invitation)</span>}
            </label>
            {needsEmailInput ? (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            ) : (
              <input
                type="email"
                value={emailValue}
                disabled
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
              />
            )}
            {!needsEmailInput && (
              <p className="text-xs text-slate-500 mt-1">This is the email your invitation was sent to</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-1">
              {mode === 'signup' ? 'Set your password' : 'Password'} <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="px-3 py-2 border border-l-0 border-slate-300 rounded-r-lg text-slate-600 hover:bg-slate-50"
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-sm text-slate-700 mb-1">Confirm password <span className="text-red-500">*</span></label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className={`w-full px-4 py-2 rounded-lg text-white ${busy ? 'bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {busy
              ? (mode === 'signup' ? 'Creating account...' : 'Signing in...')
              : (mode === 'signup' ? 'Create Account & Join Team' : 'Sign In & Join Team')
            }
          </button>
        </form>

        {/* Toggle between signup and signin */}
        <div className="mt-4 text-center text-sm text-slate-600">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setLocalError(null);
                }}
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Sign in instead
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setLocalError(null);
                }}
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Create one
              </button>
            </>
          )}
        </div>

        {invitation?.expires_at && (
          <p className="text-xs text-slate-500 text-center mt-4">
            Invitation expires on {new Date(invitation.expires_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
