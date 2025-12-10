import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronDown,
  ChevronUp,
  Users,
  Target,
  Award,
  Hash,
  DollarSign,
  Filter,
  X,
} from 'lucide-react';
import { useShop } from '../contexts/ShopContext';
import { useCategories } from '../contexts/BootstrapContext';
import { usePeriods, useWeeklyProgress } from '../hooks/useQueryHooks';
import type { WeeklyProgressResponse } from '../lib/api';

type PresetRange = 'this_week' | 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'year_to_date' | 'custom';

interface DateRange {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

const PRESET_LABELS: Record<PresetRange, string> = {
  this_week: 'This Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  last_3_months: 'Last 3 Months',
  last_6_months: 'Last 6 Months',
  year_to_date: 'Year to Date',
  custom: 'Custom Range',
};

function getPresetDateRange(preset: PresetRange, now: Date): DateRange {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  switch (preset) {
    case 'this_week':
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
    case 'last_6_months': {
      let startMonth = currentMonth - 5;
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

export function ProgressTracking() {
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

  // Categories from bootstrap (cached)
  const { categories } = useCategories();

  // Periods from React Query
  const { data: periodsData, isLoading: periodsLoading } = usePeriods(currentShopId);
  const periods = periodsData ?? [];

  // Find all periods within the selected date range
  const periodsInRange = useMemo(() => {
    return periods.filter(p => {
      const periodDate = p.year * 12 + p.month;
      const startDate = dateRange.startYear * 12 + dateRange.startMonth;
      const endDate = dateRange.endYear * 12 + dateRange.endMonth;
      return periodDate >= startDate && periodDate <= endDate;
    });
  }, [periods, dateRange]);

  // Fetch weekly progress for all periods in range
  // We'll use the first period's hook and manually aggregate others
  const periodIds = periodsInRange.map(p => p.id);

  // Create individual hooks for up to 6 periods (practical limit)
  const progress1 = useWeeklyProgress(periodIds[0] ?? null);
  const progress2 = useWeeklyProgress(periodIds[1] ?? null);
  const progress3 = useWeeklyProgress(periodIds[2] ?? null);
  const progress4 = useWeeklyProgress(periodIds[3] ?? null);
  const progress5 = useWeeklyProgress(periodIds[4] ?? null);
  const progress6 = useWeeklyProgress(periodIds[5] ?? null);

  const allProgressData = useMemo(() => {
    const results: { periodId: string; data: WeeklyProgressResponse }[] = [];

    if (periodIds[0] && progress1.data) results.push({ periodId: periodIds[0], data: progress1.data });
    if (periodIds[1] && progress2.data) results.push({ periodId: periodIds[1], data: progress2.data });
    if (periodIds[2] && progress3.data) results.push({ periodId: periodIds[2], data: progress3.data });
    if (periodIds[3] && progress4.data) results.push({ periodId: periodIds[3], data: progress4.data });
    if (periodIds[4] && progress5.data) results.push({ periodId: periodIds[4], data: progress5.data });
    if (periodIds[5] && progress6.data) results.push({ periodId: periodIds[5], data: progress6.data });

    return results;
  }, [periodIds, progress1.data, progress2.data, progress3.data, progress4.data, progress5.data, progress6.data]);

  const isLoadingProgress = progress1.isLoading || progress2.isLoading || progress3.isLoading ||
                           progress4.isLoading || progress5.isLoading || progress6.isLoading;
  const loading = periodsLoading || isLoadingProgress;

  const progressError = progress1.error || progress2.error || progress3.error ||
                       progress4.error || progress5.error || progress6.error;
  const error = progressError?.message ?? null;

  // UI state
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'progress'>('progress');
  const [sortDesc, setSortDesc] = useState(true);

  // Get category unit by ID
  const getCategoryUnit = (categoryId: string): 'count' | 'currency' => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.unit || 'count';
  };

  // Format value based on unit
  const formatValue = (value: number, unit: 'count' | 'currency'): string => {
    if (unit === 'currency') {
      return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', minimumFractionDigits: 0 }).format(value);
    }
    return value.toFixed(0);
  };

  // Aggregate all progress data across all periods and weeks
  const aggregatedUserProgress = useMemo(() => {
    if (allProgressData.length === 0) return [];

    const userMap = new Map<string, {
      user_id: string;
      user_name: string;
      user_role: string;
      total_target: number;
      total_achieved: number;
      categories: Map<string, {
        category_id: string;
        category_name: string;
        target: number;
        achieved: number;
        unit: 'count' | 'currency';
      }>;
      monthly_data: { year: number; month: number; target: number; achieved: number; percentage: number }[];
    }>();

    // Iterate through all periods
    allProgressData.forEach(({ periodId, data }) => {
      const period = periodsInRange.find(p => p.id === periodId);
      if (!period || !data.progress) return;

      // Aggregate user data for this period
      const periodUserTotals = new Map<string, { target: number; achieved: number }>();

      Object.values(data.progress).forEach(weekUsers => {
        weekUsers.forEach(user => {
          let userData = userMap.get(user.user_id);
          if (!userData) {
            userData = {
              user_id: user.user_id,
              user_name: user.user_name,
              user_role: user.user_role,
              total_target: 0,
              total_achieved: 0,
              categories: new Map(),
              monthly_data: [],
            };
            userMap.set(user.user_id, userData);
          }

          const weekTarget = parseFloat(user.total_target) || 0;
          const weekAchieved = parseFloat(user.total_achieved) || 0;

          userData.total_target += weekTarget;
          userData.total_achieved += weekAchieved;

          // Track period totals for monthly breakdown
          const periodTotal = periodUserTotals.get(user.user_id) || { target: 0, achieved: 0 };
          periodTotal.target += weekTarget;
          periodTotal.achieved += weekAchieved;
          periodUserTotals.set(user.user_id, periodTotal);

          // Aggregate categories
          user.categories.forEach(cat => {
            const existing = userData!.categories.get(cat.category_id);
            const catTarget = parseFloat(cat.target_value) || 0;
            const catAchieved = parseFloat(cat.achieved_value) || 0;

            if (existing) {
              existing.target += catTarget;
              existing.achieved += catAchieved;
            } else {
              userData!.categories.set(cat.category_id, {
                category_id: cat.category_id,
                category_name: cat.category_name,
                target: catTarget,
                achieved: catAchieved,
                unit: getCategoryUnit(cat.category_id),
              });
            }
          });
        });
      });

      // Add monthly data for each user
      periodUserTotals.forEach((totals, userId) => {
        const userData = userMap.get(userId);
        if (userData) {
          userData.monthly_data.push({
            year: period.year,
            month: period.month,
            target: totals.target,
            achieved: totals.achieved,
            percentage: totals.target > 0 ? (totals.achieved / totals.target) * 100 : 0,
          });
        }
      });
    });

    // Convert to array and calculate percentages
    return Array.from(userMap.values()).map(user => ({
      ...user,
      percentage: user.total_target > 0 ? (user.total_achieved / user.total_target) * 100 : 0,
      categories: Array.from(user.categories.values()).map(cat => ({
        ...cat,
        percentage: cat.target > 0 ? (cat.achieved / cat.target) * 100 : 0,
      })),
      monthly_data: user.monthly_data.sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month)),
    }));
  }, [allProgressData, periodsInRange, categories]);

  // Sort users
  const sortedUsers = useMemo(() => {
    const sorted = [...aggregatedUserProgress];
    if (sortBy === 'name') {
      sorted.sort((a, b) => a.user_name.localeCompare(b.user_name));
    } else {
      sorted.sort((a, b) => a.percentage - b.percentage);
    }
    return sortDesc ? sorted.reverse() : sorted;
  }, [aggregatedUserProgress, sortBy, sortDesc]);

  // Calculate summary
  const summary = useMemo(() => {
    if (aggregatedUserProgress.length === 0) return null;

    let totalTarget = 0;
    let totalAchieved = 0;

    aggregatedUserProgress.forEach(user => {
      totalTarget += user.total_target;
      totalAchieved += user.total_achieved;
    });

    const percentage = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;
    const highPerformers = aggregatedUserProgress.filter(u => u.percentage >= 100).length;

    return {
      totalTarget,
      totalAchieved,
      percentage,
      userCount: aggregatedUserProgress.length,
      highPerformers,
      periodCount: periodsInRange.length,
    };
  }, [aggregatedUserProgress, periodsInRange]);

  const formatMonthYear = (year: number, month: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const formatMonthYearLong = (year: number, month: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatRole = (role: string) => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'manager': return 'Manager';
      case 'sales_senior': return 'Senior Sales';
      case 'sales_junior': return 'Junior Sales';
      default: return role;
    }
  };

  const toggleUserExpanded = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'from-emerald-400 to-emerald-500';
    if (percentage >= 75) return 'from-teal-400 to-cyan-500';
    if (percentage >= 50) return 'from-amber-400 to-orange-500';
    return 'from-red-400 to-rose-500';
  };

  const getProgressBgColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-emerald-50';
    if (percentage >= 75) return 'bg-teal-50';
    if (percentage >= 50) return 'bg-amber-50';
    return 'bg-red-50';
  };

  const getRankBadge = (index: number, percentage: number) => {
    if (percentage < 50) return null;
    if (index === 0) return { emoji: '🥇', label: '1st', color: 'from-yellow-400 to-amber-500' };
    if (index === 1) return { emoji: '🥈', label: '2nd', color: 'from-gray-300 to-gray-400' };
    if (index === 2) return { emoji: '🥉', label: '3rd', color: 'from-amber-600 to-amber-700' };
    return null;
  };

  const handlePresetChange = (preset: PresetRange) => {
    setSelectedPreset(preset);
    if (preset === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
    }
  };

  const getDateRangeDisplay = () => {
    if (dateRange.startYear === dateRange.endYear && dateRange.startMonth === dateRange.endMonth) {
      return formatMonthYearLong(dateRange.startYear, dateRange.startMonth);
    }
    return `${formatMonthYear(dateRange.startYear, dateRange.startMonth)} - ${formatMonthYear(dateRange.endYear, dateRange.endMonth)}`;
  };

  // Generate month options for custom picker
  const monthOptions = useMemo(() => {
    const options: { year: number; month: number; label: string }[] = [];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Go back 24 months
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
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Progress Tracking</h1>
        <p className="text-gray-600">Monitor employee performance across time periods</p>
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
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="text-gray-600">Showing data for:</span>
            <span className="font-medium text-gray-900">{getDateRangeDisplay()}</span>
            {periodsInRange.length > 1 && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                {periodsInRange.length} periods
              </span>
            )}
            {periodsInRange.length === 0 && !loading && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                No data available
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg">
          <p className="text-red-700 font-medium mb-1">Failed to load progress data</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : periodsInRange.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-900 font-medium mb-2">No Data Available</h3>
          <p className="text-gray-600 mb-4">
            No periods with targets found for the selected time range.
          </p>
          <p className="text-sm text-gray-500">
            Try selecting a different time range or set up targets in Target Management.
          </p>
        </div>
      ) : aggregatedUserProgress.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-900 font-medium mb-2">No Progress Data</h3>
          <p className="text-gray-600 mb-4">
            No progress data available for the selected time range.
          </p>
          <p className="text-sm text-gray-500">
            Make sure weekly targets have been computed in Target Management.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Team Members</p>
                    <p className="text-xl font-semibold text-gray-900">{summary.userCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Target</p>
                    <p className="text-xl font-semibold text-gray-900">{summary.totalTarget.toFixed(0)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Achieved</p>
                    <p className="text-xl font-semibold text-gray-900">{summary.totalAchieved.toFixed(0)}</p>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl shadow-sm p-4 ${getProgressBgColor(summary.percentage)}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getProgressColor(summary.percentage)} flex items-center justify-center`}>
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Completion</p>
                    <p className="text-xl font-semibold text-gray-900">{summary.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sort Controls */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-gray-900">Employee Performance</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sort by:</span>
                <button
                  onClick={() => {
                    if (sortBy === 'progress') {
                      setSortDesc(!sortDesc);
                    } else {
                      setSortBy('progress');
                      setSortDesc(true);
                    }
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    sortBy === 'progress'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Progress {sortBy === 'progress' && (sortDesc ? '↓' : '↑')}
                </button>
                <button
                  onClick={() => {
                    if (sortBy === 'name') {
                      setSortDesc(!sortDesc);
                    } else {
                      setSortBy('name');
                      setSortDesc(false);
                    }
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    sortBy === 'name'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Name {sortBy === 'name' && (sortDesc ? '↓' : '↑')}
                </button>
              </div>
            </div>
          </div>

          {/* Employee Progress Cards */}
          <div className="space-y-4">
            {sortedUsers.map((user, idx) => {
              const rankBadge = sortBy === 'progress' && sortDesc ? getRankBadge(idx, user.percentage) : null;

              return (
                <div key={user.user_id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* User Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleUserExpanded(user.user_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                          rankBadge
                            ? `bg-gradient-to-br ${rankBadge.color}`
                            : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                        }`}>
                          {rankBadge ? (
                            <span className="text-lg">{rankBadge.emoji}</span>
                          ) : (
                            user.user_name.charAt(0).toUpperCase()
                          )}
                          {user.percentage >= 100 && !rankBadge && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                              <span className="text-[10px]">✓</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-gray-900 font-medium">{user.user_name}</h3>
                          <p className="text-sm text-gray-500">{formatRole(user.user_role)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {user.total_achieved.toFixed(0)} / {user.total_target.toFixed(0)}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-semibold ${
                              user.percentage >= 100 ? 'text-emerald-600' :
                              user.percentage >= 75 ? 'text-teal-600' :
                              user.percentage >= 50 ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              {user.percentage.toFixed(1)}%
                            </span>
                            {user.percentage >= 70 ? (
                              <TrendingUp className={`w-4 h-4 ${user.percentage >= 100 ? 'text-emerald-600' : 'text-teal-600'}`} />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </div>
                        {expandedUsers.has(user.user_id) ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${getProgressColor(user.percentage)} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(user.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedUsers.has(user.user_id) && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                      {/* Category Breakdown */}
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Category Breakdown</h4>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
                        {user.categories.map(cat => (
                          <div key={cat.category_id} className="bg-white rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {cat.unit === 'currency' ? (
                                  <DollarSign className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Hash className="w-4 h-4 text-purple-600" />
                                )}
                                <span className="text-sm font-medium text-gray-700">{cat.category_name}</span>
                              </div>
                              <span className={`text-sm font-medium ${
                                cat.percentage >= 100 ? 'text-emerald-600' :
                                cat.percentage >= 75 ? 'text-teal-600' :
                                cat.percentage >= 50 ? 'text-amber-600' :
                                'text-red-600'
                              }`}>
                                {cat.percentage.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full bg-gradient-to-r ${getProgressColor(cat.percentage)} rounded-full`}
                                  style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {formatValue(cat.achieved, cat.unit)} / {formatValue(cat.target, cat.unit)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Monthly Trend (when multiple months selected) */}
                      {user.monthly_data.length > 1 && (
                        <>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Trend</h4>
                          <div className="bg-white rounded-lg p-4">
                            <div className="flex items-end gap-2 h-32">
                              {user.monthly_data.map((month) => (
                                <div
                                  key={`${month.year}-${month.month}`}
                                  className="flex-1 flex flex-col items-center gap-1"
                                >
                                  <span className="text-xs text-gray-500">{month.percentage.toFixed(0)}%</span>
                                  <div className="w-full flex-1 flex items-end">
                                    <div
                                      className={`w-full bg-gradient-to-t ${getProgressColor(month.percentage)} rounded-t`}
                                      style={{ height: `${Math.max(month.percentage * 0.9, 4)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-600 font-medium">
                                    {formatMonthYear(month.year, month.month)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
