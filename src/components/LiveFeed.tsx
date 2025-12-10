import { useState, useEffect, useMemo } from 'react';
import { Radio, RefreshCw, User, Clock, TrendingUp, Filter } from 'lucide-react';
import { useShop } from '../contexts/ShopContext';
import { useCategories } from '../contexts/BootstrapContext';
import { useTodayAchievements, useTodaySummary, useShopMembers } from '../hooks/useQueryHooks';
import type { DailyAchievement } from '../lib/api';

// Category color palette
const CATEGORY_COLORS = [
  { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' },
  { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
  { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
];

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatValue(value: number | string, unit: 'count' | 'currency'): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (unit === 'currency') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(num);
  }
  return String(Math.round(num));
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return formatTime(dateString);
}

export function LiveFeed() {
  const { currentShopId } = useShop();
  const { categories } = useCategories();
  const { data: achievements, isLoading, refetch } = useTodayAchievements(currentShopId);
  const { data: summary } = useTodaySummary(currentShopId);
  const { data: members } = useShopMembers(currentShopId);

  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refetch();
      setLastRefresh(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  // Get category color by index
  const getCategoryColor = (categoryId: string) => {
    const idx = categories.findIndex(c => c.id === categoryId);
    return CATEGORY_COLORS[idx >= 0 ? idx % CATEGORY_COLORS.length : 0];
  };

  // Get category info
  const getCategoryInfo = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  // Get member name
  const getMemberName = (userId: string) => {
    const member = members?.find(m => m.user_id === userId);
    return member?.name || member?.email?.split('@')[0] || 'Unknown';
  };

  // Get member initials
  const getMemberInitials = (userId: string) => {
    const name = getMemberName(userId);
    return name.charAt(0).toUpperCase();
  };

  // Filter and sort achievements
  const filteredAchievements = useMemo(() => {
    if (!achievements) return [];

    let filtered = [...achievements];

    if (filterCategory) {
      filtered = filtered.filter(a => a.category_id === filterCategory);
    }

    if (filterUser) {
      filtered = filtered.filter(a => a.user_id === filterUser);
    }

    // Sort by created_at descending (most recent first)
    return filtered.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [achievements, filterCategory, filterUser]);

  // Calculate totals
  const todayTotal = useMemo(() => {
    if (!summary) return 0;
    return summary.reduce((sum, s) => sum + (parseFloat(s.total_achieved) || 0), 0);
  }, [summary]);

  // Unique users who made sales today
  const activeUsers = useMemo(() => {
    if (!achievements) return [];
    const userIds = [...new Set(achievements.map(a => a.user_id))];
    return userIds;
  }, [achievements]);

  if (!currentShopId) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-slate-600">Please select a shop first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Live Feed</h1>
              <p className="text-gray-500 text-sm">Real-time sales activity</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>

          {/* Manual refresh */}
          <button
            onClick={() => { refetch(); setLastRefresh(new Date()); }}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            title="Refresh now"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{filteredAchievements.length}</p>
              <p className="text-xs text-gray-500">Transactions Today</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeUsers.length}</p>
              <p className="text-xs text-gray-500">Active Sellers</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Last updated</p>
              <p className="text-xs text-gray-500">{formatTime(lastRefresh.toISOString())}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-gray-500">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          {/* Category filter */}
          <select
            value={filterCategory || ''}
            onChange={(e) => setFilterCategory(e.target.value || null)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* User filter */}
          <select
            value={filterUser || ''}
            onChange={(e) => setFilterUser(e.target.value || null)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Team Members</option>
            {members?.map(member => (
              <option key={member.user_id} value={member.user_id}>
                {member.name || member.email}
              </option>
            ))}
          </select>

          {/* Clear filters */}
          {(filterCategory || filterUser) && (
            <button
              onClick={() => { setFilterCategory(null); setFilterUser(null); }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="font-medium text-gray-900">Activity</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        ) : filteredAchievements.length === 0 ? (
          <div className="text-center py-12">
            <Radio className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No sales activity yet today</p>
            <p className="text-gray-400 text-sm mt-1">Transactions will appear here in real-time</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredAchievements.map((achievement) => {
              const category = getCategoryInfo(achievement.category_id);
              const color = getCategoryColor(achievement.category_id);
              const value = parseFloat(achievement.achieved_value) || 0;

              return (
                <div
                  key={achievement.id}
                  className="px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-4"
                >
                  {/* User avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                    {getMemberInitials(achievement.user_id)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">
                        {getMemberName(achievement.user_id)}
                      </span>
                      <span className="text-gray-500">sold</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color.bg} ${color.text}`}>
                        +{formatValue(value, category?.unit || 'count')} {category?.name || 'Unknown'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {getTimeAgo(achievement.created_at)}
                    </p>
                  </div>

                  {/* Time */}
                  <div className="text-xs text-gray-400 flex-shrink-0">
                    {formatTime(achievement.created_at)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
