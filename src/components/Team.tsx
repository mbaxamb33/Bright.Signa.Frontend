import { useEffect, useState } from 'react';
import { Users, UserPlus, Mail, Clock, Shield, AlertCircle, Loader2, X } from 'lucide-react';
import { useShop } from '../contexts/ShopContext';
import { listInvitations, listShopMembers, ApiError, createInvitation, revokeInvitation } from '../lib/api';
import type { Invitation, ShopMember } from '../lib/api';

export function Team() {
  const { currentShopId } = useShop();
  const [members, setMembers] = useState<ShopMember[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'owner' | 'manager' | 'sales_junior' | 'sales_senior'>('sales_junior');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!currentShopId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setForbidden(false);

    // Fetch both members and invitations in parallel
    Promise.all([
      listShopMembers(currentShopId),
      listInvitations(currentShopId),
    ])
      .then(([membersData, invitesData]) => {
        if (!mounted) return;
        setMembers(membersData ?? []);
        setInvites(invitesData ?? []);
      })
      .catch((e: unknown) => {
        if (!mounted) return;
        const apiErr = e instanceof ApiError ? e : null;
        if (apiErr?.status === 403) {
          setForbidden(true);
        } else {
          setError(apiErr?.message || (e instanceof Error ? e.message : 'Failed to load team data'));
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [currentShopId]);

  const refreshTeamData = async () => {
    if (!currentShopId) return;
    setLoading(true);
    setError(null);
    try {
      const [membersData, invitesData] = await Promise.all([
        listShopMembers(currentShopId),
        listInvitations(currentShopId),
      ]);
      setMembers(membersData ?? []);
      setInvites(invitesData ?? []);
    } catch (e: unknown) {
      const apiErr = e instanceof ApiError ? e : null;
      setError(apiErr?.message || (e instanceof Error ? e.message : 'Failed to load team data'));
    } finally {
      setLoading(false);
    }
  };

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShopId) return;
    setInviteBusy(true);
    setInviteError(null);
    try {
      await createInvitation(currentShopId, { invited_email: inviteEmail, role: inviteRole });
      setInviteEmail('');
      setInviteRole('sales_junior');
      setShowInvite(false);
      await refreshTeamData();
    } catch (e: unknown) {
      const apiErr = e instanceof ApiError ? e : null;
      setInviteError(apiErr?.message || (e instanceof Error ? e.message : 'Failed to invite'));
    } finally {
      setInviteBusy(false);
    }
  };

  const onRevoke = async (token: string) => {
    setLoading(true);
    try {
      await revokeInvitation(token);
      await refreshTeamData();
    } catch (_) {
      setError('Failed to revoke invitation');
      setLoading(false);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'sales_senior':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!currentShopId) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-gray-900 text-lg mb-2">No Shop Selected</h2>
          <p className="text-slate-600 text-sm">Select or create a shop to manage your team.</p>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-gray-900 text-lg mb-2">Access Restricted</h2>
          <p className="text-slate-600 text-sm">Only shop owners and managers can view and manage team members.</p>
        </div>
      </div>
    );
  }

  const activeMembers = members.filter(m => m.active);
  const pendingCount = invites.filter(i => i.status === 'pending').length;
  const DEBUG_INVITES = (import.meta.env.VITE_DEBUG_INVITES as string) === 'true';

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Team Management</h1>
          <p className="text-gray-600">Manage your team members and pending invitations</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2.5 rounded-lg hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowInvite(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="relative p-6 pb-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Invite Team Member</h2>
                    <p className="text-sm text-gray-500">Send an invitation to join your shop</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInvite(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={onInvite} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'sales_junior', label: 'Sales Junior', desc: 'Basic access' },
                    { value: 'sales_senior', label: 'Sales Senior', desc: 'Extended access' },
                    { value: 'manager', label: 'Manager', desc: 'Team management' },
                    { value: 'owner', label: 'Owner', desc: 'Full control' },
                  ].map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setInviteRole(role.value as typeof inviteRole)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        inviteRole === role.value
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <p className={`text-sm font-medium ${inviteRole === role.value ? 'text-emerald-700' : 'text-gray-900'}`}>
                        {role.label}
                      </p>
                      <p className={`text-xs ${inviteRole === role.value ? 'text-emerald-600' : 'text-gray-500'}`}>
                        {role.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {inviteError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{inviteError}</p>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteBusy}
                  className={`flex-1 px-4 py-3 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2 ${
                    inviteBusy
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30'
                  }`}
                >
                  {inviteBusy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Invitation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{activeMembers.length}</p>
              <p className="text-sm text-gray-600">Active Members</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{pendingCount}</p>
              <p className="text-sm text-gray-600">Pending Invites</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{invites.length}</p>
              <p className="text-sm text-gray-600">Total Invitations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-xl shadow-sm mb-8">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-gray-900 font-medium">Team Members</h3>
              <p className="text-sm text-gray-500">People with access to this shop</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : activeMembers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-gray-900 font-medium mb-1">No team members yet</p>
              <p className="text-sm text-slate-500">Invite people to join your team</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeMembers.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                      <span className="text-white font-medium">
                        {(member.name || member.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium">{member.name || 'Unnamed'}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getRoleBadgeStyle(member.role)}`}>
                      {formatRole(member.role)}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Invitations */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="text-gray-900 font-medium">Pending Invitations</h3>
                <p className="text-sm text-gray-500">Invites waiting to be accepted</p>
              </div>
            </div>
            {pendingCount > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          ) : invites.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-gray-900 font-medium mb-1">No pending invitations</p>
              <p className="text-sm text-slate-500">Invite team members to collaborate on this shop</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                      <span className="text-white font-medium">{inv.invited_email.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium">{inv.invited_email}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>Expires {new Date(inv.expires_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getRoleBadgeStyle(inv.role)}`}>
                      {formatRole(inv.role)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                      inv.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : inv.status === 'accepted'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {inv.status}
                    </span>
                    {inv.status === 'pending' && (
                      <button
                        onClick={() => onRevoke(inv.token)}
                        className="text-xs px-3 py-1 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50"
                      >
                        Revoke
                      </button>
                    )}
                    {DEBUG_INVITES && inv.token && (
                      <button
                        onClick={() => navigator.clipboard.writeText(inv.token)}
                        className="text-xs px-3 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                      >
                        Copy token
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
