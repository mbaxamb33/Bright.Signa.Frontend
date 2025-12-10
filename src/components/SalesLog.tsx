import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Plus,
  Clock,
  Trash2,
  Edit3,
  Check,
  X,
  Calendar,
  TrendingUp,
  Target,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  List,
  Undo2,
  Flame,
  Zap,
  Star,
} from 'lucide-react';
import { useShop } from '../contexts/ShopContext';
import { useAuth } from '../contexts/AuthContext';
import { useCategories } from '../contexts/BootstrapContext';
import { useTodayAchievements, useTodaySummary, useInvalidateAchievements } from '../hooks/useQueryHooks';
import {
  addAchievement,
  deleteAchievement,
  updateAchievement,
  type Category,
  type DailyAchievement,
} from '../lib/api';

type QuickAmount = { label: string; value: number };
type ViewMode = 'list' | 'grid';

// Undo state
interface UndoEntry {
  id: string;
  category_id: string;
  category_name: string;
  value: number;
  timestamp: number;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getMotivationalMessage(total: number, entries: number): string {
  if (entries === 0) return "Ready to crush it today? 💪";
  if (total >= 100) return "You're on fire! Keep going! 🔥";
  if (total >= 50) return "Great momentum! Don't stop now! ⚡";
  if (total >= 20) return "Nice progress! Keep pushing! 🚀";
  if (entries >= 5) return "You're in the zone! 🎯";
  return "Good start! Let's build on this! ✨";
}

// Category color palette with more variations
const CATEGORY_COLORS = [
  { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', light: '#d1fae5', text: '#065f46', ring: '#10b981' },
  { bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', light: '#ede9fe', text: '#5b21b6', ring: '#8b5cf6' },
  { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', light: '#fef3c7', text: '#92400e', ring: '#f59e0b' },
  { bg: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', light: '#fce7f3', text: '#9d174d', ring: '#ec4899' },
  { bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', light: '#dbeafe', text: '#1e40af', ring: '#3b82f6' },
  { bg: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', light: '#ccfbf1', text: '#115e59', ring: '#14b8a6' },
  { bg: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', light: '#ffe4e6', text: '#9f1239', ring: '#f43f5e' },
  { bg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', light: '#e0e7ff', text: '#3730a3', ring: '#6366f1' },
];

// Confetti component
function Confetti({ active }: { active: boolean }) {
  if (!active) return null;

  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 1,
    color: ['#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#f43f5e'][Math.floor(Math.random() * 6)],
    rotation: Math.random() * 360,
    size: 8 + Math.random() * 8,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(piece => (
        <div
          key={piece.id}
          className="absolute animate-confetti"
          style={{
            left: `${piece.left}%`,
            top: '-20px',
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${piece.rotation}deg)`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
}

// Progress Ring component
function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  color
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-gray-200"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
}

// Toast notification component
function Toast({
  message,
  onUndo,
  onClose,
  duration = 5000
}: {
  message: string;
  onUndo?: () => void;
  onClose: () => void;
  duration?: number;
}) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev - (100 / (duration / 100));
        if (next <= 0) {
          onClose();
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[280px]">
        <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <span className="flex-1 text-sm font-medium">{message}</span>
        {onUndo && (
          <button
            onClick={onUndo}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition-colors"
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </button>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-2xl overflow-hidden">
          <div
            className="h-full bg-emerald-400 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <style>{`
        @keyframes slide-up {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Floating Action Button
function FloatingActionButton({
  categories,
  onQuickLog,
  disabled,
  getCategoryColor,
}: {
  categories: Category[];
  onQuickLog: (categoryId: string, amount: number) => void;
  disabled: boolean;
  getCategoryColor: (index: number) => typeof CATEGORY_COLORS[0];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show top 4 categories
  const topCategories = categories.slice(0, 4);

  return (
    <div ref={fabRef} className="fixed bottom-6 right-6 z-40">
      {/* Category bubbles */}
      <div className={`absolute bottom-16 right-0 flex flex-col gap-2 items-end transition-all duration-300 ${
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        {topCategories.map((cat, idx) => {
          const color = getCategoryColor(idx);
          return (
            <button
              key={cat.id}
              onClick={() => {
                onQuickLog(cat.id, 1);
                setIsOpen(false);
              }}
              disabled={disabled}
              className="flex items-center gap-2 pl-4 pr-3 py-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50"
            >
              <span className="text-sm font-medium text-gray-700">{cat.name}</span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                style={{ background: color.bg }}
              >
                <Plus className="w-4 h-4" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:shadow-xl hover:scale-105 ${
          isOpen
            ? 'bg-gray-800 rotate-45'
            : 'bg-gradient-to-br from-emerald-500 to-teal-600'
        }`}
      >
        <Plus className="w-7 h-7 text-white transition-transform" />
      </button>
    </div>
  );
}

export function SalesLog() {
  const { currentShopId } = useShop();
  const { user } = useAuth();

  // Categories from bootstrap (cached)
  const { categories, loading: categoriesLoading } = useCategories();

  // Achievements from React Query
  const { data: achievementsData, isLoading: achievementsLoading } = useTodayAchievements(currentShopId);
  const { data: summaryData, isLoading: summaryLoading } = useTodaySummary(currentShopId);
  const invalidateAchievements = useInvalidateAchievements(currentShopId);

  const todayAchievements = achievementsData ?? [];
  const todaySummary = summaryData ?? [];
  const loading = categoriesLoading || achievementsLoading || summaryLoading;

  const [saving, setSaving] = useState(false);

  // UI state
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [customInputValues, setCustomInputValues] = useState<Record<string, string>>({});
  const [editingAchievement, setEditingAchievement] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedActivity, setExpandedActivity] = useState(true);

  // Celebration & feedback state
  const [showConfetti, setShowConfetti] = useState(false);
  const [toast, setToast] = useState<{ message: string; undoEntry?: UndoEntry } | null>(null);
  const [lastDeleted, setLastDeleted] = useState<UndoEntry | null>(null);
  const [animatingButton, setAnimatingButton] = useState<string | null>(null);

  const isToday = selectedDate === formatDate(new Date());
  const userName = (user?.user_metadata as any)?.name || user?.email?.split('@')[0] || 'there';

  // Reload data function
  const loadData = useCallback(async () => {
    invalidateAchievements();
  }, [invalidateAchievements]);

  // Summary map for quick lookup
  const summaryMap = useMemo(() => {
    const map: Record<string, number> = {};
    (todaySummary || []).forEach(s => {
      map[s.category_id] = parseFloat(s.total_achieved) || 0;
    });
    return map;
  }, [todaySummary]);

  // Calculate daily targets (estimate based on category averages or fixed goals)
  const dailyTargets = useMemo(() => {
    const targets: Record<string, number> = {};
    categories.forEach(cat => {
      // Default targets - could be fetched from API in future
      targets[cat.id] = cat.unit === 'currency' ? 1000 : 10;
    });
    return targets;
  }, [categories]);

  // Smart quick amounts based on category unit and current progress
  const getSmartQuickAmounts = (category: Category, currentValue: number): QuickAmount[] => {
    if (category.unit === 'currency') {
      // Currency-based suggestions
      if (currentValue >= 1000) return [{ label: '+500', value: 500 }, { label: '+1K', value: 1000 }, { label: '+2K', value: 2000 }];
      if (currentValue >= 500) return [{ label: '+100', value: 100 }, { label: '+250', value: 250 }, { label: '+500', value: 500 }];
      return [{ label: '+50', value: 50 }, { label: '+100', value: 100 }, { label: '+250', value: 250 }];
    } else {
      // Count-based suggestions
      if (currentValue >= 20) return [{ label: '+5', value: 5 }, { label: '+10', value: 10 }, { label: '+20', value: 20 }];
      if (currentValue >= 10) return [{ label: '+2', value: 2 }, { label: '+5', value: 5 }, { label: '+10', value: 10 }];
      return [{ label: '+1', value: 1 }, { label: '+2', value: 2 }, { label: '+5', value: 5 }];
    }
  };

  // Show celebration
  const celebrate = (big: boolean = false) => {
    if (big) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
    }
  };

  // Quick log handler with undo support - creates individual transaction records
  const handleQuickLog = async (categoryId: string, amount: number) => {
    if (!currentShopId || saving) return;

    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    // Trigger button animation
    const buttonKey = `${categoryId}-${amount}`;
    setAnimatingButton(buttonKey);
    setTimeout(() => setAnimatingButton(null), 300);

    setSaving(true);
    try {
      // Create a new achievement record (individual transaction)
      const newAchievement = await addAchievement(currentShopId, {
        category_id: categoryId,
        occurred_on: selectedDate,
        achieved_value: String(amount),
        source: 'manual',
      });
      await loadData();

      // Check if target reached for celebration
      const currentValue = summaryMap[categoryId] || 0;
      const newValue = currentValue + amount;
      const target = dailyTargets[categoryId] || 10;
      const previousProgress = (currentValue / target) * 100;
      const newProgress = (newValue / target) * 100;

      // Big celebration when hitting 100%
      if (previousProgress < 100 && newProgress >= 100) {
        celebrate(true);
      }

      // Show toast with undo - store the actual achievement ID for deletion
      const undoEntry: UndoEntry = {
        id: newAchievement.id,
        category_id: categoryId,
        category_name: category.name,
        value: amount,
        timestamp: Date.now(),
      };
      setToast({
        message: `+${formatValue(amount, category.unit)} ${category.name}`,
        undoEntry,
      });
      setLastDeleted(undoEntry);
    } catch (err) {
      console.error('Failed to log:', err);
    } finally {
      setSaving(false);
    }
  };

  // Custom input handler - creates individual transaction records
  const handleCustomLog = async (categoryId: string) => {
    const value = parseFloat(customInputValues[categoryId] || '');
    if (!value || !currentShopId) return;

    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    // Trigger animation for custom input button
    setAnimatingButton(`${categoryId}-custom`);
    setTimeout(() => setAnimatingButton(null), 300);

    setSaving(true);
    try {
      // Create a new achievement record (individual transaction)
      const newAchievement = await addAchievement(currentShopId, {
        category_id: categoryId,
        occurred_on: selectedDate,
        achieved_value: String(value),
        source: 'manual',
      });
      setCustomInputValues(prev => ({ ...prev, [categoryId]: '' }));
      await loadData();

      // Check for celebration
      const currentValue = summaryMap[categoryId] || 0;
      const newValue = currentValue + value;
      const target = dailyTargets[categoryId] || 10;
      const previousProgress = (currentValue / target) * 100;
      const newProgress = (newValue / target) * 100;

      if (previousProgress < 100 && newProgress >= 100) {
        celebrate(true);
      }

      // Show toast with undo
      const undoEntry: UndoEntry = {
        id: newAchievement.id,
        category_id: categoryId,
        category_name: category.name,
        value: value,
        timestamp: Date.now(),
      };
      setToast({
        message: `+${formatValue(value, category.unit)} ${category.name}`,
        undoEntry,
      });
      setLastDeleted(undoEntry);
    } catch (err) {
      console.error('Failed to log:', err);
    } finally {
      setSaving(false);
    }
  };

  // Undo handler - deletes the specific achievement by ID
  const handleUndo = async () => {
    if (!lastDeleted || !currentShopId) return;

    try {
      // Delete the specific achievement record
      await deleteAchievement(lastDeleted.id);
      await loadData();
      setToast(null);
      setLastDeleted(null);
    } catch (err) {
      console.error('Failed to undo:', err);
    }
  };

  // Delete handler
  const handleDelete = async (achievementId: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await deleteAchievement(achievementId);
      await loadData();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  // Edit handler - updates the specific achievement by ID
  const handleEdit = async (achievement: DailyAchievement) => {
    if (!currentShopId) return;
    const value = parseFloat(editValue);
    if (!value) return;
    setSaving(true);
    try {
      await updateAchievement(achievement.id, String(value));
      setEditingAchievement(null);
      setEditValue('');
      await loadData();
    } catch (err) {
      console.error('Failed to edit:', err);
    } finally {
      setSaving(false);
    }
  };

  // Get category by ID
  const getCategoryName = (categoryId: string): string => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || categoryId;
  };

  const getCategoryUnit = (categoryId: string): 'count' | 'currency' => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.unit || 'count';
  };

  // Format value based on unit
  const formatValue = (value: number | string, unit: 'count' | 'currency'): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (unit === 'currency') {
      if (num >= 1000) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, notation: 'compact' }).format(num);
      }
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(num);
    }
    return String(Math.round(num));
  };

  // Total today
  const todayTotal = useMemo(() => {
    return Object.values(summaryMap).reduce((sum, val) => sum + val, 0);
  }, [summaryMap]);

  // Categories with progress percentage
  const categoriesWithProgress = useMemo(() => {
    return categories.map((cat, idx) => {
      const current = summaryMap[cat.id] || 0;
      const target = dailyTargets[cat.id] || (cat.unit === 'currency' ? 1000 : 10);
      const progress = Math.min((current / target) * 100, 100);
      return { ...cat, current, target, progress, colorIndex: idx };
    });
  }, [categories, summaryMap, dailyTargets]);

  // Get color for category
  const getCategoryColor = (index: number) => CATEGORY_COLORS[index % CATEGORY_COLORS.length];

  // Count completed categories (>= 100%)
  const completedCount = categoriesWithProgress.filter(c => c.progress >= 100).length;

  if (!currentShopId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Please select a shop first</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-50/30 to-teal-50/40">
      {/* Confetti celebration */}
      <Confetti active={showConfetti} />

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          onUndo={toast.undoEntry ? handleUndo : undefined}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 lg:px-8 pb-24">
        {/* Header with greeting and motivation */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {getGreeting()}, {userName}!
          </h1>
          <p className="text-gray-500 text-sm">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-sm mt-2 font-medium" style={{ color: '#8b5cf6' }}>
            {getMotivationalMessage(todayTotal, todayAchievements.length)}
          </p>
        </div>

        {/* Date Selector Banner */}
        {!isToday && (
          <div className="mb-5 p-3 bg-amber-50/80 backdrop-blur-xl border border-amber-200/50 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700">
              <Clock className="w-4 h-4" />
              <span className="font-medium text-sm">
                Logging for {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <button
              onClick={() => setSelectedDate(formatDate(new Date()))}
              className="text-sm text-amber-700 hover:text-amber-800 font-semibold"
            >
              Back to Today
            </button>
          </div>
        )}

        {/* Stats Cards - Redesigned */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-4 shadow-sm border border-white/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatValue(todayTotal, 'count')}</p>
                <p className="text-xs text-gray-500">Today's Total</p>
              </div>
            </div>
          </div>
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-4 shadow-sm border border-white/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {completedCount}<span className="text-lg text-gray-400">/{categories.length}</span>
                </p>
                <p className="text-xs text-gray-500">Goals Hit</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Overview - Mini rings */}
        {categories.length > 0 && (
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-4 shadow-sm border border-white/50 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Daily Progress</h3>
              <div className="flex items-center gap-1">
                {completedCount > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    <Flame className="w-3 h-3" />
                    {completedCount} completed
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {categoriesWithProgress.map((cat) => {
                const color = getCategoryColor(cat.colorIndex);
                return (
                  <div key={cat.id} className="flex flex-col items-center gap-1 min-w-[60px]">
                    <div className="relative">
                      <ProgressRing progress={cat.progress} size={44} strokeWidth={4} color={color.ring} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-700">{Math.round(cat.progress)}%</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-500 text-center truncate w-full">{cat.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Controls - Date & View Mode */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={formatDate(new Date())}
              className="px-3 py-2 bg-white/70 backdrop-blur-xl border border-white/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center bg-white/50 backdrop-blur-xl rounded-xl p-1 border border-white/50">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              title="Grid view"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border border-white/50 p-10 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
              <Clock className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-gray-900 font-semibold text-xl mb-3">Waiting for Setup</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Your manager needs to set up categories before you can start logging.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Compact Grid View */
          <div className="grid grid-cols-2 gap-3">
            {categoriesWithProgress.map((category) => {
              const color = getCategoryColor(category.colorIndex);
              const quickAmounts = getSmartQuickAmounts(category, category.current);

              return (
                <div
                  key={category.id}
                  className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/50 overflow-hidden"
                >
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{category.name}</h3>
                        <p className="text-xs text-gray-500">
                          <span className="font-semibold" style={{ color: color.text }}>
                            {formatValue(category.current, category.unit)}
                          </span>
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                        {category.unit === 'currency' ? 'value' : 'count'}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="h-2 bg-gray-200/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${category.progress}%`,
                            background: color.bg,
                          }}
                        />
                      </div>
                    </div>

                    {/* Quick buttons - 2x2 grid */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {quickAmounts.slice(0, 3).map(amt => {
                        const buttonKey = `${category.id}-${amt.value}`;
                        const isAnimating = animatingButton === buttonKey;
                        return (
                          <button
                            key={amt.value}
                            onClick={() => handleQuickLog(category.id, amt.value)}
                            disabled={saving}
                            className={`py-2 rounded-lg font-semibold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${
                              isAnimating ? 'animate-pulse scale-95 ring-2 ring-offset-1' : ''
                            }`}
                            style={{
                              backgroundColor: color.light,
                              color: color.text,
                              ...(isAnimating ? { ringColor: color.ring } : {}),
                            }}
                          >
                            {amt.label}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => {
                          setViewMode('list');
                          setTimeout(() => {
                            const input = document.getElementById(`custom-input-${category.id}`);
                            input?.focus();
                          }, 100);
                        }}
                        className="py-2 rounded-lg font-semibold text-xs transition-all border border-dashed border-gray-300/50 text-gray-400 hover:border-gray-400/50"
                      >
                        <Plus className="w-3 h-3 mx-auto" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {categoriesWithProgress.map((category) => {
              const color = getCategoryColor(category.colorIndex);
              const quickAmounts = getSmartQuickAmounts(category, category.current);
              const customValue = customInputValues[category.id] || '';

              return (
                <div
                  key={category.id}
                  className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/50 overflow-hidden"
                >
                  <div className="p-4">
                    {/* Category Header with progress */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <ProgressRing progress={category.progress} size={48} strokeWidth={4} color={color.ring} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-600">{Math.round(category.progress)}%</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{category.name}</h3>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                              {category.unit === 'currency' ? 'value' : 'count'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            <span className="font-semibold" style={{ color: color.text }}>
                              {formatValue(category.current, category.unit)}
                            </span>
                            <span className="text-gray-400"> / {formatValue(category.target, category.unit)}</span>
                          </p>
                        </div>
                      </div>
                      {category.progress >= 100 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100/80 rounded-full">
                          <Star className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                          <span className="text-xs font-semibold text-emerald-600">Done!</span>
                        </div>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="h-2 bg-gray-200/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${category.progress}%`,
                            background: color.bg,
                          }}
                        />
                      </div>
                    </div>

                    {/* Quick Buttons */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {quickAmounts.map(amt => {
                        const buttonKey = `${category.id}-${amt.value}`;
                        const isAnimating = animatingButton === buttonKey;
                        return (
                          <button
                            key={amt.value}
                            onClick={() => handleQuickLog(category.id, amt.value)}
                            disabled={saving}
                            className={`py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${
                              isAnimating ? 'animate-pulse scale-95 ring-2 ring-offset-1' : ''
                            }`}
                            style={{
                              backgroundColor: color.light,
                              color: color.text,
                              ...(isAnimating ? { ringColor: color.ring } : {}),
                            }}
                          >
                            {amt.label}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => {
                          const input = document.getElementById(`custom-input-${category.id}`);
                          input?.focus();
                        }}
                        className="py-2.5 rounded-xl font-semibold text-sm transition-all border-2 border-dashed border-gray-300/50 text-gray-400 hover:border-gray-400/50"
                      >
                        <Plus className="w-4 h-4 mx-auto" />
                      </button>
                    </div>

                    {/* Custom Input */}
                    <div className="flex items-center gap-2 p-2 bg-gray-100/50 rounded-xl">
                      <div className="relative flex-1">
                        <input
                          id={`custom-input-${category.id}`}
                          type="number"
                          value={customValue}
                          onChange={(e) => setCustomInputValues(prev => ({ ...prev, [category.id]: e.target.value }))}
                          placeholder={category.unit === 'currency' ? "Enter value..." : "Enter count..."}
                          className="w-full px-3 py-2 bg-white/80 border border-gray-200/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCustomLog(category.id);
                          }}
                        />
                      </div>
                      <button
                        onClick={() => handleCustomLog(category.id)}
                        disabled={saving || !customValue || parseFloat(customValue) <= 0}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 ${
                          animatingButton === `${category.id}-custom` ? 'animate-pulse scale-95 ring-2 ring-white ring-offset-1' : ''
                        }`}
                        style={{ background: color.bg }}
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Today's Activity - Timeline style */}
        {isToday && todayAchievements.length > 0 && (
          <div className="mt-6 bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/50 overflow-hidden">
            <button
              onClick={() => setExpandedActivity(!expandedActivity)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                Activity Timeline
                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {todayAchievements.length}
                </span>
              </h3>
              {expandedActivity ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {expandedActivity && (
              <div className="border-t border-gray-100">
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[26px] top-0 bottom-0 w-0.5 bg-gray-100" />

                  {todayAchievements.map((achievement, idx) => {
                    const isEditing = editingAchievement === achievement.id;
                    const unit = getCategoryUnit(achievement.category_id);
                    const categoryIndex = categories.findIndex(c => c.id === achievement.category_id);
                    const color = getCategoryColor(categoryIndex >= 0 ? categoryIndex : 0);

                    return (
                      <div key={achievement.id} className="relative px-4 py-3 flex items-center gap-3 hover:bg-gray-50 group">
                        {/* Timeline dot */}
                        <div
                          className="w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 flex-shrink-0"
                          style={{ backgroundColor: color.ring }}
                        />

                        {/* Time */}
                        <span className="text-xs text-gray-400 w-14 flex-shrink-0">
                          {formatTime(achievement.created_at)}
                        </span>

                        {/* Category & Value */}
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <span className="text-sm text-gray-700 truncate">{getCategoryName(achievement.category_id)}</span>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleEdit(achievement);
                                  if (e.key === 'Escape') {
                                    setEditingAchievement(null);
                                    setEditValue('');
                                  }
                                }}
                              />
                              <button onClick={() => handleEdit(achievement)} className="p-1 text-emerald-600 hover:text-emerald-700">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => { setEditingAchievement(null); setEditValue(''); }} className="p-1 text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span
                              className="text-sm font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: color.light, color: color.text }}
                            >
                              +{formatValue(achievement.achieved_value, unit)}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        {!isEditing && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingAchievement(achievement.id); setEditValue(achievement.achieved_value); }}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(achievement.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {isToday && todayAchievements.length === 0 && !loading && categories.length > 0 && (
          <div className="mt-6 bg-gradient-to-br from-purple-100/50 to-indigo-100/50 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/50">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-3">
              <Zap className="w-7 h-7 text-purple-500" />
            </div>
            <h3 className="text-gray-800 font-semibold mb-1">Ready to start?</h3>
            <p className="text-gray-500 text-sm">Log your first achievement today!</p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {categories.length > 0 && (
        <FloatingActionButton
          categories={categories}
          onQuickLog={handleQuickLog}
          disabled={saving}
          getCategoryColor={getCategoryColor}
        />
      )}
    </div>
  );
}
