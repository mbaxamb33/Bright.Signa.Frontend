import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useShop } from '../contexts/ShopContext';
import { ShopOnboarding } from './shops/ShopOnboarding';
import {
  useDashboardData,
  useComputeLeaderboardSnapshot,
} from '../hooks/useQueryHooks';
import type { ShopMember } from '../lib/api';

type TopPerformer = {
  user_id: string;
  name: string;
  role: string;
  achievement: number;
  trend: 'up' | 'down' | 'flat';
};

export function Dashboard() {
  const { shops, currentShopId } = useShop();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  // Use combined dashboard hook - fetches all data in parallel
  const {
    period,
    members,
    categoryPerformance,
    leaderboardRows,
    isLoading: loading,
    isError,
  } = useDashboardData(currentShopId, year, month);

  const computeSnapshotMutation = useComputeLeaderboardSnapshot();

  // Derive error state
  const error = isError ? 'Failed to load data' : null;

  // Calculate month progress
  const monthProgress = useMemo(() => {
    const now = new Date();
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Check if we're viewing the current month
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

    if (!isCurrentMonth) {
      // If viewing a past month, it's 100% complete; future month is 0%
      const monthStart = new Date(year, month, 1);
      return now > monthStart ? 100 : 0;
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const currentDay = now.getDate();
    return Math.round((currentDay / daysInMonth) * 100);
  }, [currentMonth]);

  const daysInfo = useMemo(() => {
    const now = new Date();
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() === m;
    const daysPassed = isCurrentMonth ? now.getDate() : (now > new Date(y, m, 1) ? daysInMonth : 0);
    const daysRemaining = daysInMonth - daysPassed;
    return { daysPassed, daysRemaining, daysInMonth };
  }, [currentMonth]);

  // Derive top performers from leaderboard data and members
  const topPerformers = useMemo(() => {
    if (!leaderboardRows || leaderboardRows.length === 0) return [];

    const memberMap = new Map<string, ShopMember>();
    members.forEach(m => memberMap.set(m.user_id, m));

    return leaderboardRows
      .slice(0, 4)
      .map((row) => {
        const member = memberMap.get(row.user_id);
        return {
          user_id: row.user_id,
          name: member?.name || member?.email || 'Unknown',
          role: formatRole(member?.role),
          achievement: parseFloat(row.achievement_pct) || 0,
          trend: row.trend,
        };
      });
  }, [leaderboardRows, members]);

  // Use categoryPerformance directly from the hook
  const categoryData = categoryPerformance;

  const handlePreviousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentMonth(newDate);
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (shops.length === 0) {
    return <ShopOnboarding />;
  }

  // Transform category data for chart
  const chartData = categoryData.map(cat => ({
    name: cat.category_name,
    target: parseFloat(cat.target_value) || 0,
    achieved: parseFloat(cat.achieved_value) || 0,
  }));

  return (
    <div className="p-8">
      {/* Header with Month Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Overview of your shop's performance</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="text-center min-w-[180px]">
            <p className="text-gray-900 font-medium">{formatMonth(currentMonth)}</p>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Category Performance */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h3 className="text-gray-900 font-semibold mb-4">Category Performance</h3>
        {loading ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        ) : !period ? (
          <div className="h-[400px] flex items-center justify-center text-gray-500">
            No period configured for this month
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-gray-500">
            No category data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="target" fill="#7c3aed" name="Target" />
              <Bar dataKey="achieved" fill="#10b981" name="Achieved" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Month Progress Indicator */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-200">
                <span className="text-white font-bold text-sm">{monthProgress}%</span>
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-800">Month Progress</span>
                <p className="text-xs text-gray-500">
                  Day {daysInfo.daysPassed} of {daysInfo.daysInMonth}
                </p>
              </div>
            </div>
            {daysInfo.daysRemaining > 0 && (
              <div className="text-right">
                <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                  {daysInfo.daysRemaining}
                </span>
                <p className="text-xs text-gray-500">days left</p>
              </div>
            )}
          </div>

          {/* Visual day grid */}
          <div
            className="grid gap-0.5 mb-3"
            style={{ gridTemplateColumns: `repeat(${daysInfo.daysInMonth}, 1fr)` }}
          >
            {Array.from({ length: daysInfo.daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isPassed = dayNum <= daysInfo.daysPassed;
              const isToday = dayNum === daysInfo.daysPassed;

              return (
                <div
                  key={i}
                  className={`h-3 rounded-sm transition-all duration-300 ${
                    isToday
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 ring-2 ring-orange-300 ring-offset-1'
                      : isPassed
                      ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                      : 'bg-gray-200'
                  }`}
                  title={`Day ${dayNum}`}
                />
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${monthProgress}%` }}
            />
            <div
              className="absolute inset-y-0 bg-gradient-to-r from-yellow-400 to-orange-500 w-1 rounded-full shadow-lg"
              style={{ left: `${monthProgress}%`, transform: 'translateX(-50%)' }}
            />
          </div>

          {/* Week labels */}
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-emerald-600 font-medium">Week 1</span>
            <span className="text-teal-600 font-medium">Week 2</span>
            <span className="text-cyan-600 font-medium">Week 3</span>
            <span className="text-blue-600 font-medium">Week 4</span>
            <span className="text-purple-600 font-medium">End</span>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-emerald-400 to-teal-500" />
              <span className="text-gray-600">Days passed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-yellow-400 to-orange-500 ring-1 ring-orange-300" />
              <span className="text-gray-600">Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gray-200" />
              <span className="text-gray-600">Remaining</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-gray-900 font-semibold mb-4">Top Performers This Month</h3>
        {loading ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        ) : topPerformers.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-gray-500">
            No performance data available
          </div>
        ) : (
          <div className="space-y-4">
            {topPerformers.map((performer, idx) => (
              <div key={performer.user_id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                      idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                      idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' :
                      'bg-gradient-to-br from-purple-600 to-blue-600'
                    }`}>
                      <span className="text-white font-semibold">{idx + 1}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">{performer.name}</p>
                    <p className="text-sm text-gray-500">{performer.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-gray-900 font-medium">{performer.achievement.toFixed(1)}%</p>
                    <p className="text-sm text-gray-500">Achievement</p>
                  </div>
                  <div className={`p-1 rounded ${
                    performer.trend === 'up' ? 'text-green-500' :
                    performer.trend === 'down' ? 'text-red-500' :
                    'text-gray-400'
                  }`}>
                    {performer.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                    {performer.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                    {performer.trend === 'flat' && <Minus className="w-4 h-4" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatRole(role: string | undefined): string {
  switch (role) {
    case 'owner': return 'Owner';
    case 'manager': return 'Manager';
    case 'sales_senior': return 'Senior Sales';
    case 'sales_junior': return 'Junior Sales';
    default: return 'Team Member';
  }
}
