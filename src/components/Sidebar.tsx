import { useState } from 'react';
import {
  LayoutDashboard,
  Target,
  Users,
  TrendingUp,
  Calendar,
  Settings,
  BarChart3,
  Menu,
  X,
  LogOut,
  FolderTree,
  PlusCircle,
  Radio,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useShop } from '../contexts/ShopContext';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { currentRole, canSeeTeam } = useShop();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      view: 'dashboard'
    },
    {
      id: 'target-management',
      label: 'Targets',
      icon: Target,
      view: 'target-management'
    },
    {
      id: 'weekly-breakdown',
      label: 'Weekly Progress',
      icon: Calendar,
      view: 'weekly-breakdown'
    },
    {
      id: 'progress',
      label: 'Progress',
      icon: TrendingUp,
      view: 'progress-tracking'
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      icon: BarChart3,
      view: 'leaderboard'
    }
  ];

  const handleNavigation = (view: string) => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
          </div>
          <span className="text-white">Bright Sigma</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 mt-16"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative
        top-16 lg:top-0
        left-0
        h-[calc(100vh-4rem)] lg:h-screen
        w-72
        bg-slate-900
        border-r border-slate-800
        flex flex-col
        z-40
        transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Desktop Header */}
        <div className="hidden lg:block p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-white">Bright Sigma</h1>
              <p className="text-slate-400 text-xs">Sales Analytics Platform</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {/* Dashboard */}
            <button
              onClick={() => handleNavigation('dashboard')}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                ${currentView === 'dashboard'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Dashboard</span>
            </button>

            {/* Log Sales - shown right after Dashboard for all users */}
            <button
              onClick={() => handleNavigation('sales-log')}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                ${currentView === 'sales-log'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <PlusCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Log Sales</span>
            </button>

            {/* Team - shown after Dashboard if user has permission */}
            {canSeeTeam && (
              <button
                onClick={() => handleNavigation('employee-management')}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${currentView === 'employee-management'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <Users className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Team</span>
              </button>
            )}

            {/* Categories - shown for owners and managers */}
            {canSeeTeam && (
              <button
                onClick={() => handleNavigation('categories')}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${currentView === 'categories'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <FolderTree className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Categories</span>
              </button>
            )}

            {/* Live Feed - shown for owners and managers */}
            {canSeeTeam && (
              <button
                onClick={() => handleNavigation('live-feed')}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${currentView === 'live-feed'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <Radio className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Live Feed</span>
              </button>
            )}

            {/* Remaining menu items */}
            {menuItems.filter(item => item.id !== 'dashboard').map(item => {
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.view)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                    ${isActive
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          {/* Settings */}
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">Settings</span>
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-medium shadow-lg shadow-emerald-500/20">
              <span>{(user?.email || 'U').charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{user?.email || 'Signed in'}</p>
              <p className="text-xs text-slate-400 truncate">{currentRole || 'Member'}</p>
            </div>
            <button
              onClick={() => signOut()}
              aria-label="Logout"
              className="group relative p-2.5 rounded-lg bg-slate-700/50 hover:bg-gradient-to-r hover:from-rose-500 hover:to-orange-500 transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/20"
            >
              <LogOut className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors duration-300" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
