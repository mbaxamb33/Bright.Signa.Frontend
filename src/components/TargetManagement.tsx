import { useState, useEffect } from 'react';
import { Plus, Save, ChevronRight, Calendar, ArrowRight, Edit, ChevronLeft, Send, Lock, Archive, History, RefreshCw, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useShop } from '../contexts/ShopContext';
import { useCategories } from '../contexts/BootstrapContext';
import {
  usePeriods,
  useShopMembers,
  usePeriodDetail,
  useMonthlyTargets,
  useWeeklyDistributionData,
  useInvalidatePeriods,
  queryKeys,
  useCategoryPerformance,
} from '../hooks/useQueryHooks';
import { useQueryClient } from '@tanstack/react-query';
import {
  createPeriod,
  getPeriod,
  getMonthlyTargets,
  getWeeklyDistribution,
  getRoleWeights,
  upsertMonthlyTargets,
  upsertWeeklyDistribution,
  upsertWeeklyRoleWeights,
  recomputeUserWeekTargets,
  setPeriodStatus,
  getCategoryPerformance,
  type ShopMember,
  type Category,
  type PeriodSummary,
  type PeriodWeek,
  type RoleWeight,
  type CategoryPerformance,
} from '../lib/api';

type Role = 'owner' | 'manager' | 'sales_junior' | 'sales_senior';

// Component to display fulfillment metrics for a period
function PeriodFulfillment({ periodId }: { periodId: string }) {
  const { data: performance, isLoading } = useCategoryPerformance(periodId);
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    );
  }

  if (!performance || performance.length === 0) {
    return (
      <div className="text-sm text-gray-400">No data</div>
    );
  }

  // Calculate overall fulfillment
  const totalTarget = performance.reduce((sum, p) => sum + (parseFloat(p.target_value) || 0), 0);
  const totalAchieved = performance.reduce((sum, p) => sum + (parseFloat(p.achieved_value) || 0), 0);
  const overallPercentage = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;

  // Determine color based on percentage
  const getProgressColor = (pct: number) => {
    if (pct >= 100) return 'text-emerald-600 bg-emerald-100';
    if (pct >= 75) return 'text-teal-600 bg-teal-100';
    if (pct >= 50) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const getBarColor = (pct: number) => {
    if (pct >= 100) return 'bg-emerald-500';
    if (pct >= 75) return 'bg-teal-500';
    if (pct >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      {/* Overall Fulfillment */}
      <div
        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <TrendingUp className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">Fulfillment</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getProgressColor(overallPercentage)}`}>
            {overallPercentage.toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getBarColor(overallPercentage)}`}
              style={{ width: `${Math.min(overallPercentage, 100)}%` }}
            />
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      {expanded && (
        <div className="mt-3 space-y-2 pl-7">
          {performance.map(cat => {
            const target = parseFloat(cat.target_value) || 0;
            const achieved = parseFloat(cat.achieved_value) || 0;
            const pct = target > 0 ? (achieved / target) * 100 : 0;

            return (
              <div key={cat.category_id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{cat.category_name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-xs">
                    {achieved.toFixed(0)} / {target.toFixed(0)}
                  </span>
                  <div className="w-20 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getBarColor(pct)}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium w-10 text-right ${pct >= 100 ? 'text-emerald-600' : pct >= 75 ? 'text-teal-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TargetManagement() {
  const { currentShopId, canSeeTeam } = useShop();
  const queryClient = useQueryClient();
  const invalidatePeriods = useInvalidatePeriods(currentShopId);

  // canSeeTeam = true means user is owner/manager
  const isManager = canSeeTeam;

  // Data from React Query hooks - parallel fetching
  const { categories } = useCategories();
  const { data: periodsData, isLoading: periodsLoading, error: periodsError } = usePeriods(currentShopId);
  const { data: membersData, isLoading: membersLoading } = useShopMembers(currentShopId);

  const members = membersData ?? [];
  const periods = periodsData ?? [];
  const loading = periodsLoading || membersLoading;

  // Local error state for save operations
  const [localError, setLocalError] = useState<string | null>(null);
  const error = localError || periodsError?.message || null;

  // UI state
  const [view, setView] = useState<'overview' | 'create'>('overview');
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodSummary | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Form state
  const [shopTargets, setShopTargets] = useState<Record<string, number>>({});
  const [weeks, setWeeks] = useState<PeriodWeek[]>([]);
  const [weeklyPercentages, setWeeklyPercentages] = useState<number[]>([]);
  const [roleWeights, setRoleWeights] = useState<Record<number, Record<Role, number>>>({});
  const [saving, setSaving] = useState(false);
  const [periodDataLoading, setPeriodDataLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // Initialize shop targets when categories change
  useEffect(() => {
    if (categories.length > 0 && Object.keys(shopTargets).length === 0) {
      setShopTargets(categories.reduce((acc, cat) => ({ ...acc, [cat.id]: 0 }), {}));
    }
  }, [categories]);

  const refreshPeriods = async () => {
    if (!currentShopId) return;
    invalidatePeriods();
  };

  const loadPeriodData = async (period: PeriodSummary) => {
    try {
      setPeriodDataLoading(true);
      // Get period with weeks
      const periodDetail = await getPeriod(period.id, true);
      const periodWeeks = periodDetail.weeks || [];
      setWeeks(periodWeeks);

      // Get monthly targets
      const targets = await getMonthlyTargets(period.id);
      const targetsMap: Record<string, number> = {};
      categories.forEach(cat => {
        targetsMap[cat.id] = 0;
      });
      (targets || []).forEach(t => {
        targetsMap[t.category_id] = parseFloat(t.target_value) || 0;
      });
      setShopTargets(targetsMap);

      // Get weekly distribution
      const distribution = await getWeeklyDistribution(period.id);
      if (distribution && distribution.length > 0) {
        const percentages = periodWeeks.map((_, idx) => {
          const found = distribution.find(d => d.week_index === idx + 1);
          return found ? parseFloat(found.percentage) : 0;
        });
        setWeeklyPercentages(percentages);
      } else {
        // Default equal distribution
        const equalPct = periodWeeks.length > 0 ? 100 / periodWeeks.length : 20;
        setWeeklyPercentages(periodWeeks.map(() => equalPct));
      }

      // Get role weights for each week
      // Default weights depend on team composition (set after members are loaded)
      const defaultWeights = () => {
        const jCount = members.filter(m => m.role === 'sales_junior').length;
        const sCount = members.filter(m => m.role === 'sales_senior').length;
        if (jCount > 0 && sCount === 0) return { owner: 0, manager: 0, sales_junior: 100, sales_senior: 0 };
        if (sCount > 0 && jCount === 0) return { owner: 0, manager: 0, sales_junior: 0, sales_senior: 100 };
        return { owner: 0, manager: 0, sales_junior: 40, sales_senior: 60 };
      };

      const weights: Record<number, Record<Role, number>> = {};
      for (let i = 0; i < periodWeeks.length; i++) {
        try {
          const weekWeights = await getRoleWeights(period.id, i + 1);
          weights[i + 1] = defaultWeights();
          (weekWeights || []).forEach(w => {
            weights[i + 1][w.role] = parseFloat(w.weight_percentage) || 0;
          });
        } catch {
          weights[i + 1] = defaultWeights();
        }
      }
      setRoleWeights(weights);
    } catch (err: any) {
      console.error('Failed to load period data:', err?.message);
    } finally {
      setPeriodDataLoading(false);
    }
  };

  const handleCreateNew = async () => {
    if (!currentShopId) return;

    try {
      setPeriodDataLoading(true);
      // Create or get period for selected month
      let period = periods.find(p => p.year === selectedYear && p.month === selectedMonth);
      if (!period) {
        period = await createPeriod(currentShopId, { year: selectedYear, month: selectedMonth });
        await refreshPeriods();
      }
      setSelectedPeriod(period);
      await loadPeriodData(period);
      setView('create');
      setWizardStep(1);
    } catch (err: any) {
      console.error('Failed to create period:', err?.message);
    } finally {
      setPeriodDataLoading(false);
    }
  };

  const handleEditPeriod = async (period: PeriodSummary) => {
    setSelectedPeriod(period);
    setSelectedYear(period.year);
    setSelectedMonth(period.month);
    await loadPeriodData(period);
    setView('create');
    setWizardStep(1);
  };

  const handleTargetChange = (categoryId: string, value: string) => {
    setShopTargets(prev => ({
      ...prev,
      [categoryId]: parseFloat(value) || 0,
    }));
  };

  const handleWeeklyPercentageChange = (index: number, value: number) => {
    const newValue = Math.max(0, Math.min(100, value));
    const newPercentages = [...weeklyPercentages];
    const oldValue = newPercentages[index];
    newPercentages[index] = newValue;

    // Calculate how much we need to redistribute to items below
    const diff = oldValue - newValue;
    const itemsBelow = newPercentages.slice(index + 1);
    const totalBelow = itemsBelow.reduce((sum, p) => sum + p, 0);

    if (itemsBelow.length > 0 && totalBelow + diff >= 0) {
      // Redistribute proportionally among items below
      const newTotalBelow = totalBelow + diff;
      for (let i = index + 1; i < newPercentages.length; i++) {
        if (totalBelow > 0) {
          newPercentages[i] = (newPercentages[i] / totalBelow) * newTotalBelow;
        } else {
          // If all below are 0, distribute equally
          newPercentages[i] = newTotalBelow / itemsBelow.length;
        }
      }
    }

    setWeeklyPercentages(newPercentages);
  };

  const normalizePercentages = () => {
    const total = weeklyPercentages.reduce((sum, p) => sum + p, 0);
    if (total === 0) return;
    const normalized = weeklyPercentages.map(p => (p / total) * 100);
    setWeeklyPercentages(normalized);
  };

  const handleRoleWeightChange = (weekIndex: number, role: Role, value: number) => {
    const newValue = Math.max(0, Math.min(100, value));
    const otherRole: Role = role === 'sales_junior' ? 'sales_senior' : 'sales_junior';
    const otherValue = Math.max(0, 100 - newValue);

    setRoleWeights(prev => ({
      ...prev,
      [weekIndex]: {
        ...prev[weekIndex],
        [role]: newValue,
        [otherRole]: otherValue,
      },
    }));
  };

  const handleSaveTargets = async () => {
    if (!selectedPeriod) return;

    setSaving(true);
    setLocalError(null);
    try {
      // Prepare weekly distribution - round to 2 decimal places to avoid floating point issues
      const roundedPercentages = weeklyPercentages.map(p => Math.round(p * 100) / 100);
      const total = roundedPercentages.reduce((s, x) => s + x, 0);

      // Adjust last item to ensure total is exactly 100
      if (roundedPercentages.length > 0 && Math.abs(total - 100) > 0.001) {
        const diff = 100 - total;
        roundedPercentages[roundedPercentages.length - 1] += diff;
      }

      // Prepare role weights for each week
      const jCount = members.filter(m => m.role === 'sales_junior').length;
      const sCount = members.filter(m => m.role === 'sales_senior').length;
      const onlyJuniors = jCount > 0 && sCount === 0;
      const onlySeniors = sCount > 0 && jCount === 0;

      const roleWeightPromises = weeks.map((_, idx) => {
        const weekIndex = idx + 1;
        let juniorWeight: number;
        let seniorWeight: number;

        if (onlyJuniors) {
          juniorWeight = 100;
          seniorWeight = 0;
        } else if (onlySeniors) {
          juniorWeight = 0;
          seniorWeight = 100;
        } else {
          const weekWeights = roleWeights[weekIndex] || { owner: 0, manager: 0, sales_junior: 40, sales_senior: 60 };
          juniorWeight = Math.round(weekWeights.sales_junior * 100) / 100;
          seniorWeight = Math.round((100 - juniorWeight) * 100) / 100;
        }

        return upsertWeeklyRoleWeights(selectedPeriod.id, weekIndex, [
          { role: 'sales_junior', weight_percentage: juniorWeight.toFixed(2) },
          { role: 'sales_senior', weight_percentage: seniorWeight.toFixed(2) },
        ]);
      });

      // Run all three save operations in parallel
      await Promise.all([
        // Save monthly targets
        upsertMonthlyTargets(
          selectedPeriod.id,
          Object.entries(shopTargets).map(([category_id, value]) => ({
            category_id,
            target_value: String(value ?? 0),
          }))
        ),
        // Save weekly distribution
        upsertWeeklyDistribution(
          selectedPeriod.id,
          roundedPercentages.map((p, idx) => ({ week_index: idx + 1, percentage: p.toFixed(2) }))
        ),
        // Save all role weights in parallel
        ...roleWeightPromises,
      ]);

      // Recompute user targets (must be after all saves complete)
      await recomputeUserWeekTargets(selectedPeriod.id);

      await refreshPeriods();
      setView('overview');
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to save targets');
    } finally {
      setSaving(false);
    }
  };

  const formatMonthYear = (year: number, month: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleStatusChange = async (periodId: string, newStatus: 'draft' | 'published' | 'locked' | 'archived') => {
    try {
      setLocalError(null);
      await setPeriodStatus(periodId, newStatus);
      await refreshPeriods();
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to update status');
    }
  };

  const handleRecalculateTargets = async () => {
    if (!selectedPeriod) return;

    setRecalculating(true);
    setLocalError(null);
    try {
      await recomputeUserWeekTargets(selectedPeriod.id);
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyProgress(selectedPeriod.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboardSnapshots(selectedPeriod.id) });
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to recalculate targets');
    } finally {
      setRecalculating(false);
    }
  };

  const formatWeekDates = (week: PeriodWeek) => {
    const start = new Date(week.start_date);
    const end = new Date(week.end_date);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  // Navigate to previous month
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(selectedYear - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  // Navigate to next month
  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(selectedYear + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Load period data when selectedYear/selectedMonth changes
  useEffect(() => {
    if (!currentShopId) return;

    const period = periods.find(p => p.year === selectedYear && p.month === selectedMonth);
    if (period) {
      setSelectedPeriod(period);
      loadPeriodData(period);
    } else {
      // No period for this month - clear all data
      setSelectedPeriod(null);
      // Reset targets to zeros for all categories
      if (categories.length > 0) {
        setShopTargets(categories.reduce((acc, cat) => ({ ...acc, [cat.id]: 0 }), {}));
      } else {
        setShopTargets({});
      }
      setWeeks([]);
      setWeeklyPercentages([]);
      setRoleWeights({});
    }
  }, [selectedYear, selectedMonth, periods, currentShopId, categories]);

  const shopTotal = Object.values(shopTargets).reduce((sum, val) => sum + val, 0);
  const totalPercentage = weeklyPercentages.reduce((sum, p) => sum + p, 0);

  // Get unique roles from members (only sales roles for weights)
  const salesMembers = members.filter(m => m.role === 'sales_junior' || m.role === 'sales_senior');
  const juniorCount = members.filter(m => m.role === 'sales_junior').length;
  const seniorCount = members.filter(m => m.role === 'sales_senior').length;
  const hasOnlyJuniors = juniorCount > 0 && seniorCount === 0;
  const hasOnlySeniors = seniorCount > 0 && juniorCount === 0;
  const hasNoSalesStaff = juniorCount === 0 && seniorCount === 0;
  const hasBothRoles = juniorCount > 0 && seniorCount > 0;

  // Get default weights based on team composition
  const getDefaultWeights = () => {
    if (hasOnlyJuniors) return { owner: 0, manager: 0, sales_junior: 100, sales_senior: 0 };
    if (hasOnlySeniors) return { owner: 0, manager: 0, sales_junior: 0, sales_senior: 100 };
    return { owner: 0, manager: 0, sales_junior: 40, sales_senior: 60 };
  };

  if (!currentShopId) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-slate-600">Please select a shop first.</p>
        </div>
      </div>
    );
  }

  if (loading && view === 'overview') {
    return (
      <div className="p-8">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  // Filter periods based on role - non-managers only see published
  const visiblePeriods = isManager
    ? periods
    : periods.filter(p => p.status === 'published');

  // Filter history to only show past months (before current month)
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const historyPeriods = visiblePeriods.filter(p => {
    // Period is in the past if its year is less than current,
    // or same year but month is less than current
    if (p.year < currentYear) return true;
    if (p.year === currentYear && p.month < currentMonth) return true;
    return false;
  });

  // Overview Page
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Targets</h1>
          <p className="text-gray-600">
            {isManager ? 'Manage monthly targets for your shop' : 'View monthly targets for your shop'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('current')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'current'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Current Month
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <History className="w-4 h-4" />
          History
          {historyPeriods.length > 0 && (
            <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
              {historyPeriods.length}
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Current Month Tab */}
      {activeTab === 'current' && (
        <div className="space-y-6">
          {/* Month Selector */}
          {isManager && (
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevMonth}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Previous month"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>

              <select
                value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split('-');
                  setSelectedYear(parseInt(y));
                  setSelectedMonth(parseInt(m));
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {Array.from({ length: 24 }, (_, i) => {
                  const baseDate = new Date();
                  const monthOffset = i - 12;
                  const date = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset);
                  return (
                    <option key={i} value={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`}>
                      {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </option>
                  );
                })}
              </select>

              <button
                onClick={handleNextMonth}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Next month"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>

              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-2.5 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all ml-auto"
              >
                {selectedPeriod ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {selectedPeriod ? 'Edit Targets' : 'Create Targets'}
              </button>
            </div>
          )}

          {/* Selected Month Summary */}
          {selectedPeriod ? (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  {formatMonthYear(selectedPeriod.year, selectedPeriod.month)}
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    selectedPeriod.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                    selectedPeriod.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                    selectedPeriod.status === 'locked' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedPeriod.status.charAt(0).toUpperCase() + selectedPeriod.status.slice(1)}
                  </span>
                  {/* Status action buttons */}
                  {isManager && selectedPeriod.status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange(selectedPeriod.id, 'published')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Publish
                    </button>
                  )}
                  {isManager && selectedPeriod.status === 'published' && (
                    <button
                      onClick={() => handleStatusChange(selectedPeriod.id, 'locked')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Lock
                    </button>
                  )}
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                </div>
              ) : shopTotal > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {categories.filter(c => shopTargets[c.id] > 0).map(cat => (
                      <div key={cat.id} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-sm text-gray-600">{cat.name}</p>
                        <p className="text-lg font-semibold text-gray-900">{shopTargets[cat.id]}</p>
                      </div>
                    ))}
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <p className="text-sm text-emerald-600">Total</p>
                      <p className="text-lg font-semibold text-emerald-700">{shopTotal}</p>
                    </div>
                  </div>
                  {/* Recalculate button for managers */}
                  {isManager && (selectedPeriod.status === 'draft' || selectedPeriod.status === 'published') && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Team changed?</p>
                          <p className="text-xs text-gray-400">Recalculate to redistribute targets among current members</p>
                        </div>
                        <button
                          onClick={handleRecalculateTargets}
                          disabled={recalculating}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
                          {recalculating ? 'Recalculating...' : 'Recalculate Targets'}
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Fulfillment Metrics for current month */}
                  <PeriodFulfillment periodId={selectedPeriod.id} />
                </>
              ) : (
                <p className="text-gray-500">No targets set for this month yet.</p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-900 font-medium mb-2">No Targets for {formatMonthYear(selectedYear, selectedMonth)}</h3>
              <p className="text-gray-600 mb-6">
                {isManager
                  ? 'Click "Create Targets" to set up targets for this month'
                  : 'No targets have been configured for this month yet'}
              </p>
            </div>
          )}

          {/* Team Members - only show to managers */}
          {isManager && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-gray-900 font-medium mb-4">Team Members ({members.length})</h3>
              {members.length === 0 ? (
                <p className="text-gray-500 text-sm">No team members yet. Invite members from the Team page.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {members.map(member => (
                    <div key={member.user_id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm ${
                        member.role === 'sales_senior' ? 'bg-purple-600' : member.role === 'sales_junior' ? 'bg-blue-500' : 'bg-emerald-600'
                      }`}>
                        {(member.name || member.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-gray-900">{member.name || member.email}</p>
                        <p className="text-xs text-gray-500 capitalize">{member.role.replace('_', ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {historyPeriods.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-900 font-medium mb-2">No History Yet</h3>
              <p className="text-gray-600">
                {isManager
                  ? 'Past months will appear here once they pass'
                  : 'No published targets in history'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {historyPeriods
                .sort((a, b) => {
                  if (a.year !== b.year) return b.year - a.year;
                  return b.month - a.month;
                })
                .map(period => {
                  const statusColors: Record<string, string> = {
                    draft: 'bg-amber-100 text-amber-700',
                    published: 'bg-emerald-100 text-emerald-700',
                    locked: 'bg-blue-100 text-blue-700',
                    archived: 'bg-gray-100 text-gray-600',
                  };

                  return (
                    <div key={period.id} className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            period.status === 'locked' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                            period.status === 'archived' ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                            'bg-gradient-to-br from-emerald-500 to-teal-600'
                          }`}>
                            {period.status === 'locked' ? (
                              <Lock className="w-6 h-6 text-white" />
                            ) : period.status === 'archived' ? (
                              <Archive className="w-6 h-6 text-white" />
                            ) : (
                              <Calendar className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-gray-900 font-medium">{formatMonthYear(period.year, period.month)}</h3>
                            {isManager && (
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${statusColors[period.status] || statusColors.draft}`}>
                                {period.status.charAt(0).toUpperCase() + period.status.slice(1)}
                              </span>
                            )}
                          </div>
                        </div>
                        {isManager && (
                          <div className="flex items-center gap-2">
                            {period.status === 'draft' && (
                              <button
                                onClick={() => handleStatusChange(period.id, 'published')}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                              >
                                <Send className="w-4 h-4" />
                                Publish
                              </button>
                            )}
                            {period.status === 'published' && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(period.id, 'draft')}
                                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  Unpublish
                                </button>
                                <button
                                  onClick={() => handleStatusChange(period.id, 'locked')}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <Lock className="w-4 h-4" />
                                  Lock
                                </button>
                              </>
                            )}
                            {period.status === 'locked' && (
                              <button
                                onClick={() => handleStatusChange(period.id, 'archived')}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                              >
                                <Archive className="w-4 h-4" />
                                Archive
                              </button>
                            )}
                            {(period.status === 'draft' || period.status === 'published') && (
                              <button
                                onClick={() => handleEditPeriod(period)}
                                className="flex items-center gap-2 px-4 py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                            )}
                            {/* View button for current month */}
                            <button
                              onClick={() => {
                                setSelectedYear(period.year);
                                setSelectedMonth(period.month);
                                setActiveTab('current');
                              }}
                              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              View
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Fulfillment Metrics */}
                      <PeriodFulfillment periodId={period.id} />
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Step 1: Monthly Targets
  const renderMonthlyTargets = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-gray-900 font-medium">Step 1: Set Monthly Shop Targets</h2>
            <p className="text-sm text-gray-600">Enter target values for each category</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl text-gray-900">{shopTotal}</p>
          </div>
        </div>

        {categories.length === 0 ? (
          <p className="text-gray-500">No categories defined. Add categories first.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(category => (
              <div key={category.id} className="border border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors">
                <label className="block text-sm text-gray-700 mb-2">{category.name}</label>
                <input
                  type="number"
                  value={shopTargets[category.id] || ''}
                  onChange={(e) => handleTargetChange(category.id, e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setWizardStep(2)}
          disabled={shopTotal === 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
            shopTotal === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/30'
          }`}
        >
          Next: Weekly Distribution
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  // Step 2: Weekly Distribution
  const renderWeeklyDistribution = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-gray-900 font-medium mb-2">Step 2: Distribute Across Weeks</h2>
          <p className="text-sm text-gray-600">Set percentage of monthly targets for each week</p>
        </div>

        <div className="bg-emerald-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Total Distribution:</span>
            <div className="flex items-center gap-3">
              <span className={`text-2xl ${Math.abs(totalPercentage - 100) < 0.5 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {totalPercentage.toFixed(1)}%
              </span>
              {Math.abs(totalPercentage - 100) > 0.5 && (
                <button
                  onClick={normalizePercentages}
                  className="text-sm px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Auto-Balance
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {weeks.map((week, idx) => (
            <div key={week.week_index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                    {week.week_index}
                  </div>
                  <div>
                    <h3 className="text-gray-900">Week {week.week_index}</h3>
                    <p className="text-sm text-gray-600">{formatWeekDates(week)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={weeklyPercentages[idx]?.toFixed(1) || 0}
                    onChange={(e) => handleWeeklyPercentageChange(idx, parseFloat(e.target.value) || 0)}
                    className="w-20 px-3 py-2 text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                  <span className="text-gray-600">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={weeklyPercentages[idx] || 0}
                onChange={(e) => handleWeeklyPercentageChange(idx, parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #10b981 ${weeklyPercentages[idx] || 0}%, #e5e7eb ${weeklyPercentages[idx] || 0}%)`
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setWizardStep(1)}
          className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={() => setWizardStep(3)}
          disabled={Math.abs(totalPercentage - 100) > 0.5}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
            Math.abs(totalPercentage - 100) > 0.5
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/30'
          }`}
        >
          Next: Role Weights
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  // Step 3: Role Weights
  const renderRoleWeights = () => (
    <div className="space-y-6">
      <div className="bg-emerald-50 rounded-xl p-6">
        <h2 className="text-gray-900 font-medium mb-2">Step 3: Set Junior/Senior Distribution</h2>
        <p className="text-sm text-gray-600 mb-4">
          {hasNoSalesStaff
            ? 'You have no sales staff assigned yet. Targets will be saved but not distributed.'
            : hasOnlyJuniors
            ? 'All targets will go to your junior sales staff (100%).'
            : hasOnlySeniors
            ? 'All targets will go to your senior sales staff (100%).'
            : 'Configure what percentage of weekly targets go to juniors vs seniors.'}
        </p>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${juniorCount > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            <span className={`text-sm ${juniorCount > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
              {juniorCount} Junior(s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${seniorCount > 0 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
            <span className={`text-sm ${seniorCount > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
              {seniorCount} Senior(s)
            </span>
          </div>
        </div>
      </div>

      {/* Warning for no sales staff */}
      {hasNoSalesStaff && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800">
            <strong>Note:</strong> You don't have any sales staff (juniors or seniors) in your team yet.
            You can still save these targets, but they won't be distributed to anyone until you add team members.
          </p>
        </div>
      )}

      {/* Info for single role teams */}
      {(hasOnlyJuniors || hasOnlySeniors) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-800">
            <strong>Auto-assigned:</strong> Since you only have {hasOnlyJuniors ? 'junior' : 'senior'} sales staff,
            100% of targets will automatically go to them. No adjustment needed.
          </p>
        </div>
      )}

      {/* Only show sliders if we have both roles */}
      {hasBothRoles && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="space-y-6">
            {weeks.map((week) => {
              const weekIdx = week.week_index;
              const weights = roleWeights[weekIdx] || getDefaultWeights();
              const total = weights.sales_junior + weights.sales_senior;

              return (
                <div key={weekIdx} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                        {weekIdx}
                      </div>
                      <div>
                        <h3 className="text-gray-900">Week {weekIdx}</h3>
                        <p className="text-sm text-gray-600">{formatWeekDates(week)}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-sm ${
                      Math.abs(total - 100) < 0.5 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      Total: {total.toFixed(0)}%
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Junior */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm text-gray-700 flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          Juniors
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={weights.sales_junior}
                            onChange={(e) => handleRoleWeightChange(weekIdx, 'sales_junior', parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-right text-sm border border-gray-300 rounded-lg"
                            min="0"
                            max="100"
                          />
                          <span className="text-sm text-gray-600">%</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={weights.sales_junior}
                        onChange={(e) => handleRoleWeightChange(weekIdx, 'sales_junior', parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #3b82f6 ${weights.sales_junior}%, #e5e7eb ${weights.sales_junior}%)`
                        }}
                      />
                    </div>

                    {/* Senior */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm text-gray-700 flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                          Seniors
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={weights.sales_senior}
                            onChange={(e) => handleRoleWeightChange(weekIdx, 'sales_senior', parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-right text-sm border border-gray-300 rounded-lg"
                            min="0"
                            max="100"
                          />
                          <span className="text-sm text-gray-600">%</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={weights.sales_senior}
                        onChange={(e) => handleRoleWeightChange(weekIdx, 'sales_senior', parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #7c3aed ${weights.sales_senior}%, #e5e7eb ${weights.sales_senior}%)`
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary for non-mixed teams */}
      {!hasBothRoles && !hasNoSalesStaff && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-gray-900 font-medium mb-4">Weekly Distribution Summary</h3>
          <div className="space-y-3">
            {weeks.map((week) => (
              <div key={week.week_index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm">
                    {week.week_index}
                  </div>
                  <span className="text-gray-700">Week {week.week_index}</span>
                  <span className="text-sm text-gray-500">{formatWeekDates(week)}</span>
                </div>
                <span className={`px-3 py-1 rounded-lg text-sm ${hasOnlyJuniors ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  100% to {hasOnlyJuniors ? 'Juniors' : 'Seniors'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => setWizardStep(2)}
          className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={handleSaveTargets}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Targets'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {view === 'overview' ? (
        renderOverview()
      ) : (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setView('overview')}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {wizardStep === 1 ? 'Monthly Targets' : wizardStep === 2 ? 'Weekly Distribution' : 'Role Weights'}
                  </h1>
                  <p className="text-gray-600 text-sm">
                    {selectedPeriod ? formatMonthYear(selectedPeriod.year, selectedPeriod.month) : ''}
                  </p>
                </div>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center gap-2">
                <div className={`px-4 py-2 rounded-lg text-sm ${
                  wizardStep === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  1. Monthly
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <div className={`px-4 py-2 rounded-lg text-sm ${
                  wizardStep === 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  2. Weekly
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <div className={`px-4 py-2 rounded-lg text-sm ${
                  wizardStep === 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  3. Weights
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-slate-600">Loading period data...</div>
          ) : (
            <>
              {wizardStep === 1 && renderMonthlyTargets()}
              {wizardStep === 2 && renderWeeklyDistribution()}
              {wizardStep === 3 && renderRoleWeights()}
            </>
          )}
        </>
      )}
    </div>
  );
}
