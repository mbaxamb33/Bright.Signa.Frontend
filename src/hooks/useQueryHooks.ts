import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listPeriods,
  listShopMembers,
  getCategoryPerformance,
  listLeaderboardSnapshots,
  getLeaderboardRows,
  computeLeaderboardSnapshot,
  getWeeklyProgress,
  getPeriod,
  getMonthlyTargets,
  getWeeklyDistribution,
  getRoleWeights,
  listTodayAchievements,
  getTodaySummary,
  type PeriodSummary,
  type ShopMember,
  type CategoryPerformance,
  type LeaderboardSnapshot,
  type LeaderboardRow,
  type WeeklyProgressResponse,
  type PeriodDetail,
  type MonthlyTarget,
  type WeeklyDistribution,
  type RoleWeight,
  type DailyAchievement,
  type AchievementSummary,
} from '../lib/api';

// Query keys factory for consistent caching
export const queryKeys = {
  periods: (shopId: string) => ['periods', shopId] as const,
  members: (shopId: string) => ['members', shopId] as const,
  categoryPerformance: (periodId: string) => ['categoryPerformance', periodId] as const,
  leaderboardSnapshots: (periodId: string) => ['leaderboardSnapshots', periodId] as const,
  leaderboardRows: (snapshotId: string) => ['leaderboardRows', snapshotId] as const,
  weeklyProgress: (periodId: string) => ['weeklyProgress', periodId] as const,
  periodDetail: (periodId: string, includeWeeks: boolean) => ['periodDetail', periodId, includeWeeks] as const,
  monthlyTargets: (periodId: string) => ['monthlyTargets', periodId] as const,
  weeklyDistribution: (periodId: string) => ['weeklyDistribution', periodId] as const,
  roleWeights: (periodId: string, weekIndex: number) => ['roleWeights', periodId, weekIndex] as const,
  todayAchievements: (shopId: string) => ['todayAchievements', shopId] as const,
  todaySummary: (shopId: string) => ['todaySummary', shopId] as const,
};

// Periods hook
export function usePeriods(shopId: string | null) {
  return useQuery<PeriodSummary[], Error>({
    queryKey: queryKeys.periods(shopId ?? ''),
    queryFn: () => listPeriods(shopId!),
    enabled: !!shopId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Shop members hook
export function useShopMembers(shopId: string | null) {
  return useQuery<ShopMember[], Error>({
    queryKey: queryKeys.members(shopId ?? ''),
    queryFn: () => listShopMembers(shopId!),
    enabled: !!shopId,
    staleTime: 2 * 60 * 1000,
  });
}

// Category performance hook
export function useCategoryPerformance(periodId: string | null) {
  return useQuery<CategoryPerformance[], Error>({
    queryKey: queryKeys.categoryPerformance(periodId ?? ''),
    queryFn: () => getCategoryPerformance(periodId!),
    enabled: !!periodId,
    staleTime: 1 * 60 * 1000,
  });
}

// Leaderboard snapshots hook
export function useLeaderboardSnapshots(periodId: string | null) {
  return useQuery<LeaderboardSnapshot[], Error>({
    queryKey: queryKeys.leaderboardSnapshots(periodId ?? ''),
    queryFn: () => listLeaderboardSnapshots(periodId!),
    enabled: !!periodId,
    staleTime: 1 * 60 * 1000,
  });
}

// Leaderboard rows hook
export function useLeaderboardRows(snapshotId: string | null) {
  return useQuery<LeaderboardRow[], Error>({
    queryKey: queryKeys.leaderboardRows(snapshotId ?? ''),
    queryFn: () => getLeaderboardRows(snapshotId!),
    enabled: !!snapshotId,
    staleTime: 1 * 60 * 1000,
  });
}

// Compute leaderboard snapshot mutation
export function useComputeLeaderboardSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (periodId: string) => computeLeaderboardSnapshot(periodId),
    onSuccess: (_, periodId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboardSnapshots(periodId) });
    },
  });
}

// Weekly progress hook
export function useWeeklyProgress(periodId: string | null) {
  return useQuery<WeeklyProgressResponse, Error>({
    queryKey: queryKeys.weeklyProgress(periodId ?? ''),
    queryFn: () => getWeeklyProgress(periodId!),
    enabled: !!periodId,
    staleTime: 1 * 60 * 1000,
  });
}

// Period detail hook
export function usePeriodDetail(periodId: string | null, includeWeeks = true) {
  return useQuery<PeriodDetail, Error>({
    queryKey: queryKeys.periodDetail(periodId ?? '', includeWeeks),
    queryFn: () => getPeriod(periodId!, includeWeeks),
    enabled: !!periodId,
    staleTime: 2 * 60 * 1000,
  });
}

// Monthly targets hook
export function useMonthlyTargets(periodId: string | null) {
  return useQuery<MonthlyTarget[], Error>({
    queryKey: queryKeys.monthlyTargets(periodId ?? ''),
    queryFn: () => getMonthlyTargets(periodId!),
    enabled: !!periodId,
    staleTime: 2 * 60 * 1000,
  });
}

// Weekly distribution hook
export function useWeeklyDistributionData(periodId: string | null) {
  return useQuery<WeeklyDistribution[], Error>({
    queryKey: queryKeys.weeklyDistribution(periodId ?? ''),
    queryFn: () => getWeeklyDistribution(periodId!),
    enabled: !!periodId,
    staleTime: 2 * 60 * 1000,
  });
}

// Role weights hook
export function useRoleWeights(periodId: string | null, weekIndex: number) {
  return useQuery<RoleWeight[], Error>({
    queryKey: queryKeys.roleWeights(periodId ?? '', weekIndex),
    queryFn: () => getRoleWeights(periodId!, weekIndex),
    enabled: !!periodId && weekIndex > 0,
    staleTime: 2 * 60 * 1000,
  });
}

// Today achievements hook
export function useTodayAchievements(shopId: string | null) {
  return useQuery<DailyAchievement[], Error>({
    queryKey: queryKeys.todayAchievements(shopId ?? ''),
    queryFn: () => listTodayAchievements(shopId!),
    enabled: !!shopId,
    staleTime: 30 * 1000, // 30 seconds - achievements change frequently
  });
}

// Today summary hook
export function useTodaySummary(shopId: string | null) {
  return useQuery<AchievementSummary[], Error>({
    queryKey: queryKeys.todaySummary(shopId ?? ''),
    queryFn: () => getTodaySummary(shopId!),
    enabled: !!shopId,
    staleTime: 30 * 1000,
  });
}

// Hook to invalidate achievements-related queries
export function useInvalidateAchievements(shopId: string | null) {
  const queryClient = useQueryClient();
  return () => {
    if (shopId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.todayAchievements(shopId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.todaySummary(shopId) });
    }
  };
}

// Hook to invalidate periods-related queries
export function useInvalidatePeriods(shopId: string | null) {
  const queryClient = useQueryClient();
  return () => {
    if (shopId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.periods(shopId) });
    }
  };
}

// Combined hook for Dashboard data - fetches all needed data in parallel
export function useDashboardData(shopId: string | null, year: number, month: number) {
  const periodsQuery = usePeriods(shopId);

  // Find the period for the selected month
  const period = periodsQuery.data?.find(p => p.year === year && p.month === month) ?? null;
  const periodId = period?.id ?? null;

  const membersQuery = useShopMembers(shopId);
  const performanceQuery = useCategoryPerformance(periodId);
  const snapshotsQuery = useLeaderboardSnapshots(periodId);

  // Get latest snapshot
  const latestSnapshot = snapshotsQuery.data?.sort(
    (a, b) => new Date(b.computed_at).getTime() - new Date(a.computed_at).getTime()
  )[0] ?? null;

  const rowsQuery = useLeaderboardRows(latestSnapshot?.id ?? null);

  return {
    period,
    periods: periodsQuery.data ?? [],
    members: membersQuery.data ?? [],
    categoryPerformance: performanceQuery.data ?? [],
    leaderboardRows: rowsQuery.data ?? [],
    isLoading: periodsQuery.isLoading || membersQuery.isLoading || performanceQuery.isLoading || snapshotsQuery.isLoading || rowsQuery.isLoading,
    isError: periodsQuery.isError || membersQuery.isError || performanceQuery.isError,
  };
}
