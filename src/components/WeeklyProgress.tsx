import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Users, Target, TrendingUp, Calendar, ChevronDown, ChevronUp, Hash, DollarSign, Clock, History } from 'lucide-react';
import { useShop } from '../contexts/ShopContext';
import { useCategories } from '../contexts/BootstrapContext';
import { usePeriods, useWeeklyProgress } from '../hooks/useQueryHooks';
import type {
  PeriodSummary,
  WeekInfo,
} from '../lib/api';

export function WeeklyProgress() {
  const { currentShopId } = useShop();

  // Initialize to current month
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  // Categories from bootstrap (cached)
  const { categories } = useCategories();

  // Periods from React Query
  const { data: periodsData, isLoading: periodsLoading } = usePeriods(currentShopId);
  const periods = periodsData ?? [];

  // Find period for selected month
  const period = useMemo(() => {
    return periods.find(p => p.year === selectedYear && p.month === selectedMonth) ?? null;
  }, [periods, selectedYear, selectedMonth]);

  // Weekly progress from React Query
  const { data: progressData, isLoading: progressLoading, error: progressError } = useWeeklyProgress(period?.id ?? null);

  const loading = periodsLoading || progressLoading;
  const error = progressError?.message ?? null;

  // UI state
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [showTargetDetails, setShowTargetDetails] = useState(false);
  const [completionTab, setCompletionTab] = useState<'average' | 'separate'>('average');

  // Check if viewing current month
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;

  // Find current week in the data
  const currentWeekInfo = useMemo(() => {
    if (!progressData?.weeks?.length) return null;
    const today = new Date();
    return progressData.weeks.find(w => {
      const start = new Date(w.start_date);
      const end = new Date(w.end_date);
      return today >= start && today <= end;
    });
  }, [progressData]);

  // Auto-select appropriate week when data loads or month changes
  useEffect(() => {
    if (!progressData?.weeks?.length) {
      setSelectedWeek(null);
      return;
    }

    // If viewing current month, select current week
    if (isCurrentMonth && currentWeekInfo) {
      setSelectedWeek(currentWeekInfo.week_index);
    } else {
      // For past/future months, select the first week
      setSelectedWeek(progressData.weeks[0]?.week_index ?? 1);
    }
  }, [progressData, isCurrentMonth, currentWeekInfo]);

  // Get category unit by ID
  const getCategoryUnit = (categoryId: string): 'count' | 'currency' => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.unit || 'count';
  };

  // Format value based on unit
  const formatValue = (value: number, unit: 'count' | 'currency'): string => {
    if (unit === 'currency') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
    }
    return value.toFixed(0);
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(selectedYear - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(selectedYear + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
  };

  const formatMonthYear = (year: number, month: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatWeekDates = (week: WeekInfo) => {
    const start = new Date(week.start_date);
    const end = new Date(week.end_date);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
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

  const formatRole = (role: string) => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'manager': return 'Manager';
      case 'sales_senior': return 'Senior Sales';
      case 'sales_junior': return 'Junior Sales';
      default: return role;
    }
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

  // Current week data
  const currentWeekProgress = useMemo(() => {
    if (!progressData || !selectedWeek) return [];
    return progressData.progress[String(selectedWeek)] || [];
  }, [progressData, selectedWeek]);

  // Calculate week summary
  const weekSummary = useMemo(() => {
    if (currentWeekProgress.length === 0) return null;

    let totalTarget = 0;
    let totalAchieved = 0;

    currentWeekProgress.forEach(user => {
      totalTarget += parseFloat(user.total_target) || 0;
      totalAchieved += parseFloat(user.total_achieved) || 0;
    });

    const percentage = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;

    return {
      totalTarget,
      totalAchieved,
      percentage,
      userCount: currentWeekProgress.length,
    };
  }, [currentWeekProgress]);

  // Calculate category-level breakdown for the week (with unit type)
  const categoryBreakdown = useMemo(() => {
    if (currentWeekProgress.length === 0) return [];

    const categoryMap = new Map<string, { id: string; name: string; target: number; achieved: number; unit: 'count' | 'currency' }>();

    currentWeekProgress.forEach(user => {
      user.categories.forEach(cat => {
        const existing = categoryMap.get(cat.category_id);
        if (existing) {
          existing.target += parseFloat(cat.target_value) || 0;
          existing.achieved += parseFloat(cat.achieved_value) || 0;
        } else {
          categoryMap.set(cat.category_id, {
            id: cat.category_id,
            name: cat.category_name,
            target: parseFloat(cat.target_value) || 0,
            achieved: parseFloat(cat.achieved_value) || 0,
            unit: getCategoryUnit(cat.category_id),
          });
        }
      });
    });

    return Array.from(categoryMap.values()).map(cat => ({
      ...cat,
      percentage: cat.target > 0 ? (cat.achieved / cat.target) * 100 : 0,
    }));
  }, [currentWeekProgress, categories]);

  // Calculate completion metrics (two methods)
  const completionMetrics = useMemo(() => {
    if (categoryBreakdown.length === 0) return null;

    // Method 1: Weighted average of percentages (each category counts equally)
    const avgPercentage = categoryBreakdown.reduce((sum, cat) => sum + cat.percentage, 0) / categoryBreakdown.length;

    // Method 2: Separate totals by unit type
    const quantityCategories = categoryBreakdown.filter(cat => cat.unit === 'count');
    const currencyCategories = categoryBreakdown.filter(cat => cat.unit === 'currency');

    const quantityTarget = quantityCategories.reduce((sum, cat) => sum + cat.target, 0);
    const quantityAchieved = quantityCategories.reduce((sum, cat) => sum + cat.achieved, 0);
    const quantityPercentage = quantityTarget > 0 ? (quantityAchieved / quantityTarget) * 100 : 0;

    const currencyTarget = currencyCategories.reduce((sum, cat) => sum + cat.target, 0);
    const currencyAchieved = currencyCategories.reduce((sum, cat) => sum + cat.achieved, 0);
    const currencyPercentage = currencyTarget > 0 ? (currencyAchieved / currencyTarget) * 100 : 0;

    return {
      average: {
        percentage: avgPercentage,
        categoryCount: categoryBreakdown.length,
      },
      separate: {
        quantity: {
          target: quantityTarget,
          achieved: quantityAchieved,
          percentage: quantityPercentage,
          categoryCount: quantityCategories.length,
        },
        currency: {
          target: currencyTarget,
          achieved: currencyAchieved,
          percentage: currencyPercentage,
          categoryCount: currencyCategories.length,
        },
      },
    };
  }, [categoryBreakdown]);

  // Get available periods for history dropdown
  const availablePeriods = useMemo(() => {
    return periods
      .filter(p => p.status === 'published' || p.status === 'locked' || p.status === 'archived')
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
  }, [periods]);

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
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Weekly Progress</h1>
        <p className="text-gray-600">Track team performance week by week</p>
      </div>

      {/* Month Navigation */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg min-w-[200px] justify-center">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-900">
                {formatMonthYear(selectedYear, selectedMonth)}
              </span>
              {isCurrentMonth && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                  Current
                </span>
              )}
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Next month"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {!isCurrentMonth && (
              <button
                onClick={goToCurrentMonth}
                className="flex items-center gap-2 px-3 py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors text-sm font-medium"
              >
                <Clock className="w-4 h-4" />
                Go to Current Month
              </button>
            )}

            {/* History Dropdown */}
            {availablePeriods.length > 0 && (
              <div className="relative">
                <select
                  value={period?.id ?? ''}
                  onChange={(e) => {
                    const selected = periods.find(p => p.id === e.target.value);
                    if (selected) {
                      setSelectedYear(selected.year);
                      setSelectedMonth(selected.month);
                    }
                  }}
                  className="appearance-none pl-8 pr-8 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm cursor-pointer"
                >
                  <option value="" disabled>Select period...</option>
                  {availablePeriods.map(p => (
                    <option key={p.id} value={p.id}>
                      {formatMonthYear(p.year, p.month)}
                      {p.year === now.getFullYear() && p.month === now.getMonth() + 1 ? ' (Current)' : ''}
                    </option>
                  ))}
                </select>
                <History className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg">
          <p className="text-red-700 font-medium mb-1">Failed to load weekly progress</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : !period ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-900 font-medium mb-2">No Period Configured</h3>
          <p className="text-gray-600 mb-4">
            No targets have been set for {formatMonthYear(selectedYear, selectedMonth)}
          </p>
          {!isCurrentMonth && (
            <button
              onClick={goToCurrentMonth}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Clock className="w-4 h-4" />
              Go to Current Month
            </button>
          )}
        </div>
      ) : !progressData || progressData.weeks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-900 font-medium mb-2">No Weekly Data</h3>
          <p className="text-gray-600 mb-4">
            Weekly targets haven't been distributed yet
          </p>
          <p className="text-sm text-gray-500">
            To see weekly progress, go to Target Management and click "Recompute" after setting up monthly targets, weekly distribution, and role weights.
          </p>
        </div>
      ) : (
        <>
          {/* Week Tabs */}
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-6 overflow-hidden">
            <div className="flex items-center gap-2 overflow-x-auto">
              {progressData.weeks.map(week => {
                const isThisCurrentWeek = currentWeekInfo?.week_index === week.week_index;
                const isSelected = selectedWeek === week.week_index;

                return (
                  <button
                    key={week.week_index}
                    onClick={() => setSelectedWeek(week.week_index)}
                    className={`relative flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-medium whitespace-nowrap">Week {week.week_index}</div>
                    <div className={`text-[10px] sm:text-xs whitespace-nowrap ${isSelected ? 'text-emerald-100' : 'text-gray-500'}`}>
                      {formatWeekDates(week)}
                    </div>
                    {isThisCurrentWeek && !isSelected && (
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 rounded-full border-2 border-white" />
                    )}
                    {isThisCurrentWeek && isSelected && (
                      <div className="absolute -top-1 -right-1 px-1 sm:px-1.5 py-0.5 bg-white text-emerald-600 rounded text-[8px] sm:text-[10px] font-bold shadow">
                        NOW
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Week Summary */}
          {weekSummary && (
            <div className="mb-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Team Members */}
                <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-500 truncate">Team</p>
                      <p className="text-lg sm:text-xl font-semibold text-gray-900">{weekSummary.userCount}</p>
                    </div>
                  </div>
                </div>

                {/* Week Target - Expandable */}
                <div
                  className="bg-white rounded-xl shadow-sm p-3 sm:p-4 cursor-pointer hover:shadow-md transition-shadow ring-2 ring-transparent hover:ring-purple-200"
                  onClick={() => setShowTargetDetails(!showTargetDetails)}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-gray-500 truncate">Target</p>
                        <p className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{weekSummary.totalTarget.toFixed(0)}</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {showTargetDetails ? (
                        <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Achieved */}
                <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-500 truncate">Achieved</p>
                      <p className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{weekSummary.totalAchieved.toFixed(0)}</p>
                    </div>
                  </div>
                </div>

                {/* Completion Card - Expandable with tabs */}
                <div
                  className={`rounded-xl shadow-sm p-3 sm:p-4 cursor-pointer hover:shadow-md transition-shadow ${
                    completionMetrics ? getProgressBgColor(completionMetrics.average.percentage) : 'bg-gray-50'
                  }`}
                  onClick={() => setShowTargetDetails(!showTargetDetails)}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${
                        completionMetrics ? getProgressColor(completionMetrics.average.percentage) : 'from-gray-400 to-gray-500'
                      } flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-bold text-xs sm:text-sm">%</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-gray-500 truncate">Done</p>
                        <p className="text-lg sm:text-xl font-semibold text-gray-900">
                          {completionMetrics ? completionMetrics.average.percentage.toFixed(0) : 0}%
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {showTargetDetails ? (
                        <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Target Details with Completion Tabs */}
              {showTargetDetails && categoryBreakdown.length > 0 && (
                <div className="mt-4 bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
                    <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Target Breakdown by Category
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {categoryBreakdown.map((cat, idx) => {
                        const unit = getCategoryUnit(cat.id);
                        const isCurrency = unit === 'currency';
                        return (
                          <div key={idx} className="bg-gray-50 rounded-xl p-4">
                            {/* Category Header with Icon */}
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                isCurrency
                                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                  : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                              }`}>
                                {isCurrency ? (
                                  <DollarSign className="w-5 h-5 text-white" />
                                ) : (
                                  <Hash className="w-5 h-5 text-white" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 truncate">{cat.name}</h4>
                                <span className="text-xs text-gray-500">
                                  {isCurrency ? 'Currency' : 'Quantity'}
                                </span>
                              </div>
                              <span className={`text-lg font-bold ${
                                cat.percentage >= 100 ? 'text-emerald-600' :
                                cat.percentage >= 75 ? 'text-teal-600' :
                                cat.percentage >= 50 ? 'text-amber-600' :
                                'text-red-600'
                              }`}>
                                {cat.percentage.toFixed(0)}%
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="mb-3 h-3 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${getProgressColor(cat.percentage)} rounded-full transition-all duration-500`}
                                style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                              />
                            </div>

                            {/* Stats */}
                            <div className="flex flex-wrap gap-2 text-center">
                              <div className="bg-white rounded-lg p-2 flex-1 min-w-[60px]">
                                <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Target</p>
                                <p className="font-semibold text-purple-700 text-xs sm:text-sm truncate">
                                  {formatValue(cat.target, unit)}
                                </p>
                              </div>
                              <div className="bg-white rounded-lg p-2 flex-1 min-w-[60px]">
                                <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Achieved</p>
                                <p className="font-semibold text-cyan-700 text-xs sm:text-sm truncate">
                                  {formatValue(cat.achieved, unit)}
                                </p>
                              </div>
                              <div className="bg-white rounded-lg p-2 flex-1 min-w-[60px]">
                                <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Remaining</p>
                                <p className={`font-semibold text-xs sm:text-sm truncate ${cat.target - cat.achieved > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  {formatValue(Math.max(0, cat.target - cat.achieved), unit)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Completion Metrics with Tabs */}
                    {completionMetrics && (
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-900">Completion Analysis</h4>
                          <div className="flex rounded-lg bg-gray-100 p-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setCompletionTab('average'); }}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                completionTab === 'average'
                                  ? 'bg-white text-gray-900 shadow-sm'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Average
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setCompletionTab('separate'); }}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                completionTab === 'separate'
                                  ? 'bg-white text-gray-900 shadow-sm'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              By Type
                            </button>
                          </div>
                        </div>

                        {completionTab === 'average' ? (
                          /* Average Tab */
                          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Weighted Average Completion</p>
                                <p className={`text-4xl font-bold ${
                                  completionMetrics.average.percentage >= 100 ? 'text-emerald-600' :
                                  completionMetrics.average.percentage >= 75 ? 'text-teal-600' :
                                  completionMetrics.average.percentage >= 50 ? 'text-amber-600' :
                                  'text-red-600'
                                }`}>
                                  {completionMetrics.average.percentage.toFixed(1)}%
                                </p>
                              </div>
                              <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br ${
                                getProgressColor(completionMetrics.average.percentage)
                              }`}>
                                <span className="text-white font-bold text-lg">
                                  {completionMetrics.average.percentage >= 100 ? '✓' : `${completionMetrics.average.percentage.toFixed(0)}%`}
                                </span>
                              </div>
                            </div>
                            <div className="h-3 bg-white/50 rounded-full overflow-hidden mb-3">
                              <div
                                className={`h-full bg-gradient-to-r ${getProgressColor(completionMetrics.average.percentage)} rounded-full transition-all duration-500`}
                                style={{ width: `${Math.min(completionMetrics.average.percentage, 100)}%` }}
                              />
                            </div>
                            <div className="bg-white/60 rounded-lg p-3">
                              <p className="text-xs text-gray-600">
                                <span className="font-semibold text-gray-800">How it's calculated:</span> Each category's completion percentage is averaged equally, regardless of whether it's currency or quantity.
                              </p>
                            </div>
                          </div>
                        ) : (
                          /* Separate by Type Tab */
                          <div className="space-y-4">
                            {/* Quantity Section */}
                            {completionMetrics.separate.quantity.categoryCount > 0 && (
                              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                    <Hash className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">Quantity Categories</p>
                                    <p className="text-xs text-gray-500">{completionMetrics.separate.quantity.categoryCount} categories</p>
                                  </div>
                                  <p className={`text-2xl font-bold ${
                                    completionMetrics.separate.quantity.percentage >= 100 ? 'text-emerald-600' :
                                    completionMetrics.separate.quantity.percentage >= 75 ? 'text-teal-600' :
                                    completionMetrics.separate.quantity.percentage >= 50 ? 'text-amber-600' :
                                    'text-red-600'
                                  }`}>
                                    {completionMetrics.separate.quantity.percentage.toFixed(1)}%
                                  </p>
                                </div>
                                <div className="h-2.5 bg-white/50 rounded-full overflow-hidden mb-2">
                                  <div
                                    className={`h-full bg-gradient-to-r ${getProgressColor(completionMetrics.separate.quantity.percentage)} rounded-full transition-all duration-500`}
                                    style={{ width: `${Math.min(completionMetrics.separate.quantity.percentage, 100)}%` }}
                                  />
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                                  <span>Target: <span className="font-semibold text-purple-700">{completionMetrics.separate.quantity.target.toFixed(0)}</span></span>
                                  <span>Achieved: <span className="font-semibold text-cyan-700">{completionMetrics.separate.quantity.achieved.toFixed(0)}</span></span>
                                  <span>Remaining: <span className={`font-semibold ${completionMetrics.separate.quantity.target - completionMetrics.separate.quantity.achieved > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {Math.max(0, completionMetrics.separate.quantity.target - completionMetrics.separate.quantity.achieved).toFixed(0)}
                                  </span></span>
                                </div>
                              </div>
                            )}

                            {/* Currency Section */}
                            {completionMetrics.separate.currency.categoryCount > 0 && (
                              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                    <DollarSign className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">Currency Categories</p>
                                    <p className="text-xs text-gray-500">{completionMetrics.separate.currency.categoryCount} categories</p>
                                  </div>
                                  <p className={`text-2xl font-bold ${
                                    completionMetrics.separate.currency.percentage >= 100 ? 'text-emerald-600' :
                                    completionMetrics.separate.currency.percentage >= 75 ? 'text-teal-600' :
                                    completionMetrics.separate.currency.percentage >= 50 ? 'text-amber-600' :
                                    'text-red-600'
                                  }`}>
                                    {completionMetrics.separate.currency.percentage.toFixed(1)}%
                                  </p>
                                </div>
                                <div className="h-2.5 bg-white/50 rounded-full overflow-hidden mb-2">
                                  <div
                                    className={`h-full bg-gradient-to-r ${getProgressColor(completionMetrics.separate.currency.percentage)} rounded-full transition-all duration-500`}
                                    style={{ width: `${Math.min(completionMetrics.separate.currency.percentage, 100)}%` }}
                                  />
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                                  <span>Target: <span className="font-semibold text-purple-700">{formatValue(completionMetrics.separate.currency.target, 'currency')}</span></span>
                                  <span>Achieved: <span className="font-semibold text-cyan-700">{formatValue(completionMetrics.separate.currency.achieved, 'currency')}</span></span>
                                  <span>Remaining: <span className={`font-semibold ${completionMetrics.separate.currency.target - completionMetrics.separate.currency.achieved > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {formatValue(Math.max(0, completionMetrics.separate.currency.target - completionMetrics.separate.currency.achieved), 'currency')}
                                  </span></span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Progress Cards */}
          <div className="space-y-4">
            {currentWeekProgress.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <p className="text-gray-500">No progress data for this week</p>
              </div>
            ) : (
              currentWeekProgress.map((user, idx) => (
                <div key={user.user_id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* User Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleUserExpanded(user.user_id)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar - fixed size */}
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${
                        idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                        idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                        idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' :
                        'bg-gradient-to-br from-emerald-500 to-teal-600'
                      }`}>
                        {idx < 3 ? idx + 1 : user.user_name.charAt(0).toUpperCase()}
                      </div>

                      {/* Name and role - truncate on overflow */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-gray-900 font-medium truncate">{user.user_name}</h3>
                        <p className="text-xs sm:text-sm text-gray-500">{formatRole(user.user_role)}</p>
                      </div>

                      {/* Stats - fixed width */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                          {parseFloat(user.total_achieved).toFixed(0)} / {parseFloat(user.total_target).toFixed(0)}
                        </p>
                        <p className={`text-base sm:text-lg font-semibold ${
                          user.percentage >= 100 ? 'text-emerald-600' :
                          user.percentage >= 75 ? 'text-teal-600' :
                          user.percentage >= 50 ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {user.percentage.toFixed(1)}%
                        </p>
                      </div>

                      {/* Chevron */}
                      <div className="flex-shrink-0">
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

                  {/* Expanded Category Details */}
                  {expandedUsers.has(user.user_id) && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Category Breakdown</h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {user.categories.map(cat => {
                          const unit = getCategoryUnit(cat.category_id);
                          return (
                            <div key={cat.category_id} className="bg-white rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2 gap-2">
                                <span className="text-sm font-medium text-gray-700 truncate flex-1 min-w-0">{cat.category_name}</span>
                                <span className={`text-sm font-medium flex-shrink-0 ${
                                  cat.percentage >= 100 ? 'text-emerald-600' :
                                  cat.percentage >= 75 ? 'text-teal-600' :
                                  cat.percentage >= 50 ? 'text-amber-600' :
                                  'text-red-600'
                                }`}>
                                  {cat.percentage.toFixed(0)}%
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full bg-gradient-to-r ${getProgressColor(cat.percentage)} rounded-full`}
                                    style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                                  {formatValue(parseFloat(cat.achieved_value), unit)} / {formatValue(parseFloat(cat.target_value), unit)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
