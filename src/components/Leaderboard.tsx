import { useState, useMemo } from 'react';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Medal,
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  Users,
  Target,
  Flame,
  Filter,
  X,
  Minus,
  RefreshCw,
} from 'lucide-react';
import { useShop } from '../contexts/ShopContext';
import { usePeriods, useLeaderboardSnapshots, useLeaderboardRows, useWeeklyProgress, useComputeLeaderboardSnapshot, useShopMembers } from '../hooks/useQueryHooks';
import type { LeaderboardRow, WeeklyProgressResponse } from '../lib/api';

type PresetRange = 'this_month' | 'last_month' | 'last_3_months' | 'year_to_date' | 'custom';

interface DateRange {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

const PRESET_LABELS: Record<PresetRange, string> = {
  this_month: 'This Month',
  last_month: 'Last Month',
  last_3_months: 'Last 3 Months',
  year_to_date: 'Year to Date',
  custom: 'Custom Range',
};

function getPresetDateRange(preset: PresetRange, now: Date): DateRange {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  switch (preset) {
    case 'this_month':
      return {
        startYear: currentYear,
        startMonth: currentMonth,
        endYear: currentYear,
        endMonth: currentMonth,
      };
    case 'last_month': {
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      return {
        startYear: lastMonthYear,
        startMonth: lastMonth,
        endYear: lastMonthYear,
        endMonth: lastMonth,
      };
    }
    case 'last_3_months': {
      let startMonth = currentMonth - 2;
      let startYear = currentYear;
      if (startMonth <= 0) {
        startMonth += 12;
        startYear -= 1;
      }
      return {
        startYear,
        startMonth,
        endYear: currentYear,
        endMonth: currentMonth,
      };
    }
    case 'year_to_date':
      return {
        startYear: currentYear,
        startMonth: 1,
        endYear: currentYear,
        endMonth: currentMonth,
      };
    case 'custom':
    default:
      return {
        startYear: currentYear,
        startMonth: currentMonth,
        endYear: currentYear,
        endMonth: currentMonth,
      };
  }
}

export function Leaderboard() {
  const { currentShopId } = useShop();
  const now = new Date();

  // Time range selection
  const [selectedPreset, setSelectedPreset] = useState<PresetRange>('this_month');
  const [customRange, setCustomRange] = useState<DateRange>(() => getPresetDateRange('this_month', now));
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Get the effective date range
  const dateRange = useMemo(() => {
    if (selectedPreset === 'custom') {
      return customRange;
    }
    return getPresetDateRange(selectedPreset, now);
  }, [selectedPreset, customRange]);

  // Periods and members from React Query
  const { data: periodsData, isLoading: periodsLoading } = usePeriods(currentShopId);
  const { data: membersData, isLoading: membersLoading } = useShopMembers(currentShopId);
  const periods = periodsData ?? [];
  const members = membersData ?? [];

  // Create a map for quick user name lookup
  const userNameMap = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach(m => {
      map.set(m.user_id, m.name || m.email || 'Unknown');
    });
    return map;
  }, [members]);

  // Find all periods within the selected date range
  const periodsInRange = useMemo(() => {
    return periods.filter(p => {
      const periodDate = p.year * 12 + p.month;
      const startDate = dateRange.startYear * 12 + dateRange.startMonth;
      const endDate = dateRange.endYear * 12 + dateRange.endMonth;
      return periodDate >= startDate && periodDate <= endDate;
    });
  }, [periods, dateRange]);

  // For single month, use leaderboard API
  // For multiple months, aggregate from weekly progress
  const isSingleMonth = periodsInRange.length === 1;
  const singlePeriodId = isSingleMonth ? periodsInRange[0]?.id : null;

  // Leaderboard snapshots (for single month)
  const { data: snapshots, isLoading: snapshotsLoading } = useLeaderboardSnapshots(singlePeriodId);
  const latestSnapshot = useMemo(() => {
    if (!snapshots?.length) return null;
    return snapshots.sort((a, b) =>
      new Date(b.computed_at).getTime() - new Date(a.computed_at).getTime()
    )[0];
  }, [snapshots]);

  const { data: leaderboardRows, isLoading: rowsLoading } = useLeaderboardRows(latestSnapshot?.id ?? null);

  // Compute leaderboard mutation
  const computeMutation = useComputeLeaderboardSnapshot();

  // For multi-month aggregation, use weekly progress
  const periodIds = periodsInRange.map(p => p.id);
  const progress1 = useWeeklyProgress(!isSingleMonth ? periodIds[0] : null);
  const progress2 = useWeeklyProgress(!isSingleMonth ? periodIds[1] : null);
  const progress3 = useWeeklyProgress(!isSingleMonth ? periodIds[2] : null);
  const progress4 = useWeeklyProgress(!isSingleMonth ? periodIds[3] : null);
  const progress5 = useWeeklyProgress(!isSingleMonth ? periodIds[4] : null);
  const progress6 = useWeeklyProgress(!isSingleMonth ? periodIds[5] : null);

  const allProgressData = useMemo(() => {
    if (isSingleMonth) return [];
    const results: { periodId: string; data: WeeklyProgressResponse }[] = [];

    if (periodIds[0] && progress1.data) results.push({ periodId: periodIds[0], data: progress1.data });
    if (periodIds[1] && progress2.data) results.push({ periodId: periodIds[1], data: progress2.data });
    if (periodIds[2] && progress3.data) results.push({ periodId: periodIds[2], data: progress3.data });
    if (periodIds[3] && progress4.data) results.push({ periodId: periodIds[3], data: progress4.data });
    if (periodIds[4] && progress5.data) results.push({ periodId: periodIds[4], data: progress5.data });
    if (periodIds[5] && progress6.data) results.push({ periodId: periodIds[5], data: progress6.data });

    return results;
  }, [isSingleMonth, periodIds, progress1.data, progress2.data, progress3.data, progress4.data, progress5.data, progress6.data]);

  const isLoadingProgress = !isSingleMonth && (
    progress1.isLoading || progress2.isLoading || progress3.isLoading ||
    progress4.isLoading || progress5.isLoading || progress6.isLoading
  );

  const loading = periodsLoading || membersLoading || (isSingleMonth ? (snapshotsLoading || rowsLoading) : isLoadingProgress);

  // Build leaderboard data
  const leaderboardData = useMemo(() => {
    if (isSingleMonth && leaderboardRows) {
      // Use actual leaderboard data, join with member names
      return leaderboardRows
        .sort((a, b) => a.rank - b.rank)
        .map(row => ({
          user_id: row.user_id,
          user_name: row.user_name || userNameMap.get(row.user_id) || 'Unknown',
          rank: row.rank,
          score: parseFloat(row.score) || 0,
          achievement_pct: parseFloat(row.achievement_pct) || 0,
          trend: row.trend,
          streak_days: row.streak_days,
        }));
    }

    // Aggregate from weekly progress for multi-month
    if (!isSingleMonth && allProgressData.length > 0) {
      const userMap = new Map<string, {
        user_id: string;
        user_name: string;
        total_target: number;
        total_achieved: number;
        monthly_achievements: number[];
      }>();

      allProgressData.forEach(({ data }) => {
        if (!data.progress) return;

        Object.values(data.progress).forEach(weekUsers => {
          weekUsers.forEach(user => {
            let userData = userMap.get(user.user_id);
            if (!userData) {
              userData = {
                user_id: user.user_id,
                user_name: user.user_name,
                total_target: 0,
                total_achieved: 0,
                monthly_achievements: [],
              };
              userMap.set(user.user_id, userData);
            }

            userData.total_target += parseFloat(user.total_target) || 0;
            userData.total_achieved += parseFloat(user.total_achieved) || 0;
          });
        });
      });

      // Convert to array and rank
      const users = Array.from(userMap.values())
        .map(user => ({
          user_id: user.user_id,
          user_name: user.user_name,
          score: user.total_achieved,
          achievement_pct: user.total_target > 0 ? (user.total_achieved / user.total_target) * 100 : 0,
          trend: 'flat' as const,
          streak_days: 0,
          rank: 0,
        }))
        .sort((a, b) => b.achievement_pct - a.achievement_pct);

      // Assign ranks
      users.forEach((user, idx) => {
        user.rank = idx + 1;
      });

      return users;
    }

    return [];
  }, [isSingleMonth, leaderboardRows, allProgressData, userNameMap]);

  // Calculate special awards
  const awards = useMemo(() => {
    if (leaderboardData.length === 0) return null;

    const champion = leaderboardData[0];

    // Best achiever (highest %)
    const bestAchiever = [...leaderboardData].sort((a, b) => b.achievement_pct - a.achievement_pct)[0];

    // Longest streak (if available)
    const streakKing = [...leaderboardData].sort((a, b) => b.streak_days - a.streak_days)[0];

    // Most consistent (smallest variance if we have monthly data, else highest avg)
    const mostConsistent = bestAchiever; // Simplified

    return {
      champion,
      bestAchiever,
      streakKing: streakKing?.streak_days > 0 ? streakKing : null,
      mostConsistent,
    };
  }, [leaderboardData]);

  const formatMonthYear = (year: number, month: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const formatMonthYearLong = (year: number, month: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getDateRangeDisplay = () => {
    if (dateRange.startYear === dateRange.endYear && dateRange.startMonth === dateRange.endMonth) {
      return formatMonthYearLong(dateRange.startYear, dateRange.startMonth);
    }
    return `${formatMonthYear(dateRange.startYear, dateRange.startMonth)} - ${formatMonthYear(dateRange.endYear, dateRange.endMonth)}`;
  };

  const handlePresetChange = (preset: PresetRange) => {
    setSelectedPreset(preset);
    if (preset === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-400 to-amber-500';
    if (rank === 2) return 'from-gray-300 to-gray-400';
    if (rank === 3) return 'from-amber-600 to-amber-700';
    return 'from-emerald-500 to-teal-600';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'flat') => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendStyle = (trend: 'up' | 'down' | 'flat') => {
    if (trend === 'up') return 'bg-emerald-100 text-emerald-700';
    if (trend === 'down') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'from-emerald-400 to-emerald-500';
    if (percentage >= 75) return 'from-teal-400 to-cyan-500';
    if (percentage >= 50) return 'from-amber-400 to-orange-500';
    return 'from-red-400 to-rose-500';
  };

  // Generate month options for custom picker
  const monthOptions = useMemo(() => {
    const options: { year: number; month: number; label: string }[] = [];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    for (let i = 0; i < 24; i++) {
      let month = currentMonth - i;
      let year = currentYear;
      while (month <= 0) {
        month += 12;
        year -= 1;
      }
      options.push({
        year,
        month,
        label: formatMonthYearLong(year, month),
      });
    }
    return options;
  }, []);

  const handleComputeLeaderboard = async () => {
    if (singlePeriodId) {
      try {
        await computeMutation.mutateAsync(singlePeriodId);
      } catch (err) {
        console.error('Failed to compute leaderboard:', err);
      }
    }
  };

  if (!currentShopId) {
    return (
      <div className="p-8 text-center text-gray-500">
        Please select a shop first
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Leaderboard</h1>
        <p className="text-gray-600">Top performers and team rankings</p>
      </div>

      {/* Time Range Selection */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col gap-4">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 mr-2">Time Range:</span>
            {(Object.keys(PRESET_LABELS) as PresetRange[]).map(preset => (
              <button
                key={preset}
                onClick={() => handlePresetChange(preset)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  selectedPreset === preset
                    ? 'bg-emerald-100 text-emerald-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {PRESET_LABELS[preset]}
              </button>
            ))}
          </div>

          {/* Custom Range Picker */}
          {showCustomPicker && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
              <span className="text-sm text-gray-600">From:</span>
              <select
                value={`${customRange.startYear}-${customRange.startMonth}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-').map(Number);
                  setCustomRange(prev => ({ ...prev, startYear: year, startMonth: month }));
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              >
                {monthOptions.map(opt => (
                  <option key={`start-${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <span className="text-sm text-gray-600">To:</span>
              <select
                value={`${customRange.endYear}-${customRange.endMonth}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-').map(Number);
                  setCustomRange(prev => ({ ...prev, endYear: year, endMonth: month }));
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              >
                {monthOptions.map(opt => (
                  <option key={`end-${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowCustomPicker(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Selected Range Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="text-gray-600">Showing rankings for:</span>
              <span className="font-medium text-gray-900">{getDateRangeDisplay()}</span>
              {periodsInRange.length > 1 && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                  {periodsInRange.length} periods aggregated
                </span>
              )}
            </div>

            {/* Compute button for single month */}
            {isSingleMonth && singlePeriodId && (
              <button
                onClick={handleComputeLeaderboard}
                disabled={computeMutation.isPending}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${computeMutation.isPending ? 'animate-spin' : ''}`} />
                {computeMutation.isPending ? 'Computing...' : 'Refresh Rankings'}
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : periodsInRange.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-900 font-medium mb-2">No Data Available</h3>
          <p className="text-gray-600">
            No periods with targets found for the selected time range.
          </p>
        </div>
      ) : leaderboardData.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-900 font-medium mb-2">No Rankings Yet</h3>
          <p className="text-gray-600 mb-4">
            {isSingleMonth
              ? 'Leaderboard rankings haven\'t been computed for this period.'
              : 'No progress data available for the selected time range.'
            }
          </p>
          {isSingleMonth && singlePeriodId && (
            <button
              onClick={handleComputeLeaderboard}
              disabled={computeMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${computeMutation.isPending ? 'animate-spin' : ''}`} />
              {computeMutation.isPending ? 'Computing...' : 'Compute Rankings'}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Champion Card */}
          {awards?.champion && (
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl shadow-lg p-6 mb-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-5 h-5 text-yellow-300" />
                    <p className="text-sm text-purple-200 font-medium">
                      {periodsInRange.length > 1 ? 'Period Champion' : 'Monthly Champion'}
                    </p>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{awards.champion.user_name}</h2>
                  <div className="flex items-center gap-4 text-purple-200">
                    <span className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      {awards.champion.score.toFixed(0)} points
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      {awards.champion.achievement_pct.toFixed(1)}% achievement
                    </span>
                    {awards.champion.streak_days > 0 && (
                      <span className="flex items-center gap-1">
                        <Flame className="w-4 h-4 text-orange-300" />
                        {awards.champion.streak_days} day streak
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-4xl">🏆</span>
                </div>
              </div>
            </div>
          )}

          {/* Rankings Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-3 sm:p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Rankings</h3>
              <span className="text-sm text-gray-500">{leaderboardData.length} participants</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 sm:w-auto">#</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                    {isSingleMonth && (
                      <>
                        <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                        <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Streak</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leaderboardData.map((row) => (
                    <tr key={row.user_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-4 py-3 sm:py-4">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br ${getRankColor(row.rank)} flex items-center justify-center text-white font-semibold shadow-sm`}>
                          <span className={row.rank <= 3 ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'}>{getRankIcon(row.rank)}</span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs sm:text-sm font-medium">{row.user_name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="min-w-0">
                            <span className="font-medium text-gray-900 text-sm sm:text-base truncate block">{row.user_name}</span>
                            {/* Show score on mobile below name */}
                            <span className="sm:hidden text-xs text-gray-500">{row.score.toFixed(0)} pts</span>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-4">
                        <span className="font-semibold text-gray-900">{row.score.toFixed(0)}</span>
                      </td>
                      <td className="px-2 sm:px-4 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-16 sm:w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${getProgressColor(row.achievement_pct)} rounded-full`}
                              style={{ width: `${Math.min(row.achievement_pct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs sm:text-sm font-medium whitespace-nowrap ${
                            row.achievement_pct >= 100 ? 'text-emerald-600' :
                            row.achievement_pct >= 75 ? 'text-teal-600' :
                            row.achievement_pct >= 50 ? 'text-amber-600' :
                            'text-red-600'
                          }`}>
                            {row.achievement_pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      {isSingleMonth && (
                        <>
                          <td className="hidden md:table-cell px-4 py-4">
                            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getTrendStyle(row.trend)}`}>
                              {getTrendIcon(row.trend)}
                              <span className="capitalize">{row.trend === 'flat' ? 'Stable' : row.trend === 'up' ? 'Rising' : 'Falling'}</span>
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-4 py-4">
                            {row.streak_days > 0 ? (
                              <div className="flex items-center gap-2">
                                <Flame className="w-4 h-4 text-orange-500" />
                                <span className="font-medium text-gray-900">{row.streak_days} days</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Achievement Categories */}
          {awards && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Top Performer */}
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Top Performer</h3>
                    <p className="text-xs text-gray-500">Highest achievement</p>
                  </div>
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-1">{awards.bestAchiever.user_name}</p>
                <p className="text-sm text-purple-600 font-medium">{awards.bestAchiever.achievement_pct.toFixed(1)}% achievement</p>
              </div>

              {/* Score Leader */}
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Score Leader</h3>
                    <p className="text-xs text-gray-500">Highest total score</p>
                  </div>
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-1">{awards.champion.user_name}</p>
                <p className="text-sm text-blue-600 font-medium">{awards.champion.score.toFixed(0)} points</p>
              </div>

              {/* Streak King (if available) */}
              {awards.streakKing ? (
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                      <Flame className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Consistency King</h3>
                      <p className="text-xs text-gray-500">Longest active streak</p>
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mb-1">{awards.streakKing.user_name}</p>
                  <p className="text-sm text-orange-600 font-medium">{awards.streakKing.streak_days} day streak</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Team Size</h3>
                      <p className="text-xs text-gray-500">Active participants</p>
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mb-1">{leaderboardData.length} members</p>
                  <p className="text-sm text-emerald-600 font-medium">Competing this period</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
