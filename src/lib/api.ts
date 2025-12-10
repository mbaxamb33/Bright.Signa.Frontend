import { supabase } from './supabase';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8080/api/v1';
// Derive API origin for identity endpoints that live outside /api/v1 (e.g., /me, /me/bootstrap)
// Example: http://localhost:8080/api/v1 -> http://localhost:8080
const API_ORIGIN = API_BASE.replace(/\/?api\/(v1|v2).?$/, '');

export class ApiError extends Error {
  code?: string;
  status?: number;
}

// Token caching for performance - avoids repeated getSession() calls
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getToken(): Promise<string | null> {
  const now = Date.now();
  // Return cached token if valid (with 60s buffer before expiry)
  if (cachedToken && tokenExpiry > now + 60000) {
    return cachedToken;
  }
  const session = await supabase.auth.getSession();
  cachedToken = session.data.session?.access_token ?? null;
  tokenExpiry = (session.data.session?.expires_at ?? 0) * 1000;
  return cachedToken;
}

// Clear token cache on sign out
export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiry = 0;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let payload: any = undefined;
    try {
      payload = await res.json();
    } catch (_) {
      // ignore
    }
    const err = new ApiError(payload?.error || res.statusText);
    err.code = payload?.code;
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return (await res.json()) as T;
}

// Bootstrap types
export type User = {
  id: string;
  email: string;
  name?: string;
  created_at?: string;
};

export type ShopMembership = {
  shop_id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'sales_junior' | 'sales_senior';
  active: boolean;
  joined_at: string;
};

export type BootstrapResponse = {
  user: User;
  memberships: ShopMembership[];
  shops: ShopSummary[];
  categories: Category[];
  server_time: string;
};

// GET /me/bootstrap - single call for all initial data
export async function getBootstrap(): Promise<BootstrapResponse> {
  const token = await getToken();
  const res = await fetch(`${API_ORIGIN}/me/bootstrap`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    let payload: any = undefined;
    try {
      payload = await res.json();
    } catch (_) {}
    const err = new ApiError(payload?.error || res.statusText);
    err.code = payload?.code;
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// POST /me/bootstrap - create/sync user in backend (for onboarding)
export async function bootstrapMe(payload?: { name?: string; email?: string }) {
  const token = await getToken();
  const res = await fetch(`${API_ORIGIN}/me/bootstrap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload ?? {}),
  });
  if (!res.ok && res.status !== 204) {
    let payload: any = undefined;
    try {
      payload = await res.json();
    } catch (_) {}
    const err = new ApiError(payload?.error || res.statusText);
    err.code = payload?.code;
    err.status = res.status;
    throw err;
  }
}

export type ShopSummary = {
  id: string;
  name: string;
  timezone?: string;
  // optional role field if backend returns it on list
  role?: 'owner' | 'manager' | 'sales_junior' | 'sales_senior';
};

export async function listMyShops(): Promise<ShopSummary[]> {
  return apiFetch<ShopSummary[]>('/shops');
}

export async function createShop(input: { name: string; timezone: string }): Promise<ShopSummary> {
  return apiFetch<ShopSummary>('/shops', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// Invitations (owner/manager per backend)
export type Invitation = {
  id: string;
  shop_id: string;
  invited_email: string;
  role: 'owner' | 'manager' | 'sales_junior' | 'sales_senior';
  token: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
  accepted_at?: string | null;
  revoked_at?: string | null;
  created_at: string;
};

export async function listInvitations(shopId: string): Promise<Invitation[]> {
  return apiFetch<Invitation[]>(`/shops/${encodeURIComponent(shopId)}/invitations`);
}

export async function createInvitation(
  shopId: string,
  input: { invited_email: string; role: 'owner' | 'manager' | 'sales_junior' | 'sales_senior'; expires_in_days?: number }
): Promise<Invitation> {
  return apiFetch<Invitation>(`/shops/${encodeURIComponent(shopId)}/invitations`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function revokeInvitation(token: string): Promise<Invitation> {
  return apiFetch<Invitation>(`/invitations/${encodeURIComponent(token)}/revoke`, {
    method: 'POST',
  });
}

export async function acceptInvitation(token: string): Promise<void> {
  await apiFetch<void>(`/invitations/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
  });
}

export async function getInvitationByToken(token: string): Promise<Invitation> {
  return apiFetch<Invitation>(`/invitations/${encodeURIComponent(token)}`);
}

// Shop Members
export type ShopMember = {
  user_id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'manager' | 'sales_junior' | 'sales_senior';
  active: boolean;
  joined_at: string;
};

export async function listShopMembers(shopId: string): Promise<ShopMember[]> {
  return apiFetch<ShopMember[]>(`/shops/${encodeURIComponent(shopId)}/members`);
}

export type Category = {
  id: string;
  name: string;
  unit: 'count' | 'currency';
  parent_id?: string | null;
  weight?: string | null; // decimal string
  sort_order?: number | null;
};

export async function listCategories(shopId: string, parentId?: string): Promise<Category[]> {
  const q = parentId ? `?parent_id=${encodeURIComponent(parentId)}` : '';
  return apiFetch<Category[]>(`/shops/${encodeURIComponent(shopId)}/categories${q}`);
}

export async function createCategory(shopId: string, input: {
  name: string;
  unit: 'count' | 'currency';
  parent_id?: string | null;
  weight?: string | null;
  sort_order?: number | null;
}): Promise<Category> {
  return apiFetch<Category>(`/shops/${encodeURIComponent(shopId)}/categories`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateCategory(
  shopId: string,
  id: string,
  input: Partial<{
    name: string;
    unit: 'count' | 'currency';
    parent_id: string | null;
    weight: string | null;
    sort_order: number | null;
  }>
): Promise<Category> {
  return apiFetch<Category>(`/shops/${encodeURIComponent(shopId)}/categories/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteCategory(shopId: string, id: string): Promise<void> {
  await apiFetch<void>(`/shops/${encodeURIComponent(shopId)}/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// Periods & configuration
export type PeriodSummary = {
  id: string;
  shop_id: string;
  year: number;
  month: number; // 1-12
  status: 'draft' | 'published' | 'locked' | 'archived';
  created_at?: string;
};

export async function listPeriods(shopId: string): Promise<PeriodSummary[]> {
  return apiFetch<PeriodSummary[]>(`/shops/${encodeURIComponent(shopId)}/periods`);
}

export async function createPeriod(shopId: string, input: { year: number; month: number }): Promise<PeriodSummary> {
  return apiFetch<PeriodSummary>(`/shops/${encodeURIComponent(shopId)}/periods`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export type MonthlyTargetInput = {
  category_id: string;
  target_value: string; // decimal as string
};

export async function upsertMonthlyTargets(periodId: string, items: MonthlyTargetInput[]): Promise<void> {
  await apiFetch<void>(`/periods/${encodeURIComponent(periodId)}/targets`, {
    method: 'PUT',
    body: JSON.stringify(items),
  });
}

export type WeeklyDistributionInput = {
  week_index: number; // 1-based index
  percentage: string; // decimal string, sums to 100.00 across all weeks
};

export async function upsertWeeklyDistribution(periodId: string, items: WeeklyDistributionInput[]): Promise<void> {
  await apiFetch<void>(`/periods/${encodeURIComponent(periodId)}/weekly-distribution`, {
    method: 'PUT',
    body: JSON.stringify(items),
  });
}

export type RoleWeightInput = { role: 'owner' | 'manager' | 'sales_junior' | 'sales_senior'; weight_percentage: string };

export async function upsertWeeklyRoleWeights(periodId: string, weekIndex: number, items: RoleWeightInput[]): Promise<void> {
  await apiFetch<void>(`/periods/${encodeURIComponent(periodId)}/role-weights/${weekIndex}`, {
    method: 'PUT',
    body: JSON.stringify(items),
  });
}

export async function recomputeUserWeekTargets(periodId: string): Promise<void> {
  await apiFetch<void>(`/periods/${encodeURIComponent(periodId)}/recompute`, { method: 'POST' });
}

export async function setPeriodStatus(periodId: string, status: 'draft' | 'published' | 'locked' | 'archived'): Promise<void> {
  await apiFetch<void>(`/periods/${encodeURIComponent(periodId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// Period detail with optional weeks
export type PeriodWeek = {
  week_index: number;
  start_date: string;
  end_date: string;
};

export type PeriodDetail = PeriodSummary & {
  weeks?: PeriodWeek[];
};

export async function getPeriod(periodId: string, includeWeeks = false): Promise<PeriodDetail> {
  const q = includeWeeks ? '?include_weeks=true' : '';
  return apiFetch<PeriodDetail>(`/periods/${encodeURIComponent(periodId)}${q}`);
}

// Monthly targets for a period
export type MonthlyTarget = {
  category_id: string;
  target_value: string;
};

export async function getMonthlyTargets(periodId: string): Promise<MonthlyTarget[]> {
  return apiFetch<MonthlyTarget[]>(`/periods/${encodeURIComponent(periodId)}/targets`);
}

// Weekly distribution
export type WeeklyDistribution = {
  week_index: number;
  percentage: string;
};

export async function getWeeklyDistribution(periodId: string): Promise<WeeklyDistribution[]> {
  return apiFetch<WeeklyDistribution[]>(`/periods/${encodeURIComponent(periodId)}/weekly-distribution`);
}

// Role weights for a specific week
export type RoleWeight = {
  role: 'owner' | 'manager' | 'sales_junior' | 'sales_senior';
  weight_percentage: string;
};

export async function getRoleWeights(periodId: string, weekIndex: number): Promise<RoleWeight[]> {
  return apiFetch<RoleWeight[]>(`/periods/${encodeURIComponent(periodId)}/role-weights/${weekIndex}`);
}

// Period weeks
export async function getPeriodWeeks(periodId: string): Promise<PeriodWeek[]> {
  return apiFetch<PeriodWeek[]>(`/periods/${encodeURIComponent(periodId)}/weeks`);
}

// Category Performance (aggregated target vs achieved by category for a period)
export type CategoryPerformance = {
  category_id: string;
  category_name: string;
  target_value: string;
  achieved_value: string;
};

export async function getCategoryPerformance(periodId: string): Promise<CategoryPerformance[]> {
  return apiFetch<CategoryPerformance[]>(`/periods/${encodeURIComponent(periodId)}/category-performance`);
}

// Leaderboard
export type LeaderboardSnapshot = {
  id: string;
  period_id: string;
  computed_at: string;
  rules_version: string;
};

export type LeaderboardRow = {
  id: string;
  snapshot_id: string;
  user_id: string;
  rank: number;
  score: string;
  achievement_pct: string;
  trend: 'up' | 'down' | 'flat';
  streak_days: number;
  // These may be added by backend or we join client-side
  user_name?: string;
  user_email?: string;
};

export async function listLeaderboardSnapshots(periodId: string): Promise<LeaderboardSnapshot[]> {
  return apiFetch<LeaderboardSnapshot[]>(`/periods/${encodeURIComponent(periodId)}/leaderboard`);
}

export async function computeLeaderboardSnapshot(periodId: string): Promise<LeaderboardSnapshot> {
  return apiFetch<LeaderboardSnapshot>(`/periods/${encodeURIComponent(periodId)}/leaderboard/snapshots`, {
    method: 'POST',
  });
}

export async function getLeaderboardRows(snapshotId: string): Promise<LeaderboardRow[]> {
  return apiFetch<LeaderboardRow[]>(`/leaderboard/snapshots/${encodeURIComponent(snapshotId)}`);
}

// Weekly Progress
export type CategoryProgress = {
  category_id: string;
  category_name: string;
  target_value: string;
  achieved_value: string;
  percentage: number;
};

export type UserWeeklyProgress = {
  user_id: string;
  user_name: string;
  user_role: string;
  categories: CategoryProgress[];
  total_target: string;
  total_achieved: string;
  percentage: number;
};

export type WeekInfo = {
  week_index: number;
  start_date: string;
  end_date: string;
};

export type WeeklyProgressResponse = {
  weeks: WeekInfo[];
  progress: Record<string, UserWeeklyProgress[]>; // keyed by week_index as string
};

export async function getWeeklyProgress(periodId: string): Promise<WeeklyProgressResponse> {
  return apiFetch<WeeklyProgressResponse>(`/periods/${encodeURIComponent(periodId)}/weekly-progress`);
}

// Daily Achievements (Sales Logging)
export type DailyAchievement = {
  id: string;
  shop_id: string;
  user_id: string;
  category_id: string;
  occurred_on: string; // YYYY-MM-DD
  achieved_value: string;
  source: 'manual' | 'import' | 'api';
  created_at: string;
  updated_at: string;
};

export type AchievementInput = {
  user_id?: string;
  category_id: string;
  occurred_on: string; // YYYY-MM-DD
  achieved_value: string;
  source?: 'manual' | 'import' | 'api';
};

export type AchievementSummary = {
  category_id: string;
  total_achieved: string;
};

export async function upsertAchievements(shopId: string, items: AchievementInput[]): Promise<void> {
  await apiFetch<void>(`/shops/${encodeURIComponent(shopId)}/achievements`, {
    method: 'POST',
    body: JSON.stringify(items),
  });
}

// Add a new achievement entry (creates a new record each time, doesn't upsert)
export async function addAchievement(shopId: string, item: AchievementInput): Promise<DailyAchievement> {
  return apiFetch<DailyAchievement>(`/shops/${encodeURIComponent(shopId)}/achievements/add`, {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function listTodayAchievements(shopId: string): Promise<DailyAchievement[]> {
  return apiFetch<DailyAchievement[]>(`/shops/${encodeURIComponent(shopId)}/achievements/today`);
}

export async function getTodaySummary(shopId: string): Promise<AchievementSummary[]> {
  return apiFetch<AchievementSummary[]>(`/shops/${encodeURIComponent(shopId)}/achievements/today/summary`);
}

export async function deleteAchievement(achievementId: string): Promise<void> {
  await apiFetch<void>(`/achievements/${encodeURIComponent(achievementId)}`, {
    method: 'DELETE',
  });
}

// Update an existing achievement entry
export async function updateAchievement(achievementId: string, achievedValue: string): Promise<DailyAchievement> {
  return apiFetch<DailyAchievement>(`/achievements/${encodeURIComponent(achievementId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ achieved_value: achievedValue }),
  });
}

export async function listUserAchievements(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailyAchievement[]> {
  return apiFetch<DailyAchievement[]>(
    `/users/${encodeURIComponent(userId)}/achievements?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`
  );
}
