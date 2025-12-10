import { useState } from 'react';
import { Calendar, TrendingUp, Award, Target, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { SALES_CATEGORIES } from '../types';

export function WeeklyBreakdown() {
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [expandedEmployees, setExpandedEmployees] = useState<string[]>(['1']);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const employees = [
    { id: '1', name: 'Maria Ionescu', role: 'senior' },
    { id: '2', name: 'Ion Popescu', role: 'senior' },
    { id: '3', name: 'Ana Marin', role: 'junior' },
    { id: '4', name: 'George Dumitrescu', role: 'junior' },
    { id: '5', name: 'Elena Vasilescu', role: 'senior' }
  ];

  const weeks = [
    { number: 1, dates: 'Nov 1-7', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    { number: 2, dates: 'Nov 8-14', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    { number: 3, dates: 'Nov 15-21', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    { number: 4, dates: 'Nov 22-28', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    { number: 5, dates: 'Nov 29-30', days: ['Sat', 'Sun'] }
  ];

  const toggleEmployee = (employeeId: string) => {
    setExpandedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const toggleDay = (employeeId: string, day: string) => {
    const key = `${employeeId}-${day}`;
    setExpandedDay(expandedDay === key ? null : key);
  };

  // Mock data for daily progress
  const getDailyData = (employeeId: string, day: string) => {
    const target = Math.floor(Math.random() * 20) + 10;
    const achieved = Math.floor(Math.random() * target * 1.2);
    return { target, achieved };
  };

  // Mock data for category breakdown on a specific day
  const getDailyCategoryData = (employeeId: string, day: string) => {
    return SALES_CATEGORIES.map(cat => {
      const target = Math.floor(Math.random() * 5) + 1;
      const achieved = Math.floor(Math.random() * target * 1.3);
      return {
        category: cat,
        target,
        achieved
      };
    });
  };

  const getWeeklyTotal = (employeeId: string) => {
    const target = Math.floor(Math.random() * 100) + 80;
    const achieved = Math.floor(Math.random() * 120) + 60;
    return { target, achieved, percentage: Math.round((achieved / target) * 100) };
  };

  // Calculate team totals
  const getTeamTotals = () => {
    const teamTarget = employees.reduce((sum, emp) => {
      const { target } = getWeeklyTotal(emp.id);
      return sum + target;
    }, 0);

    const teamAchieved = employees.reduce((sum, emp) => {
      const { achieved } = getWeeklyTotal(emp.id);
      return sum + achieved;
    }, 0);

    return {
      target: teamTarget,
      achieved: teamAchieved,
      percentage: Math.round((teamAchieved / teamTarget) * 100)
    };
  };

  const teamTotals = getTeamTotals();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Weekly Progress Tracking</h1>
        <p className="text-gray-600">Monitor daily and weekly performance for each team member</p>
      </div>

      {/* Week Selector */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4 overflow-x-auto">
          {weeks.map(week => (
            <button
              key={week.number}
              onClick={() => setSelectedWeek(week.number)}
              className={`flex-shrink-0 px-6 py-3 rounded-lg transition-all ${
                selectedWeek === week.number
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="text-sm">Week {week.number}</div>
              <div className="text-xs opacity-80">{week.dates}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Employee Progress Cards */}
      <div className="space-y-4">
        {employees.map(employee => {
          const weeklyTotal = getWeeklyTotal(employee.id);
          const isExpanded = expandedEmployees.includes(employee.id);
          const currentWeek = weeks.find(w => w.number === selectedWeek)!;

          return (
            <div key={employee.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Employee Header */}
              <div
                onClick={() => toggleEmployee(employee.id)}
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full ${
                      employee.role === 'senior' ? 'bg-gradient-to-br from-purple-600 to-blue-600' : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                    } flex items-center justify-center`}>
                      <span className="text-white text-lg">{employee.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-gray-900">{employee.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                          employee.role === 'senior' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {employee.role}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Week {selectedWeek} Performance</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {/* Weekly Stats */}
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-gray-600">Target:</span>
                        <span className="text-gray-900">{weeklyTotal.target}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Achieved:</span>
                        <span className={`${weeklyTotal.achieved >= weeklyTotal.target ? 'text-emerald-600' : 'text-gray-900'}`}>
                          {weeklyTotal.achieved}
                        </span>
                      </div>
                    </div>
                    {/* Progress Circle */}
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="#e5e7eb"
                          strokeWidth="6"
                          fill="none"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke={weeklyTotal.percentage >= 100 ? '#10b981' : weeklyTotal.percentage >= 70 ? '#3b82f6' : '#a855f7'}
                          strokeWidth="6"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 28}`}
                          strokeDashoffset={`${2 * Math.PI * 28 * (1 - Math.min(weeklyTotal.percentage, 100) / 100)}`}
                          className="transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm text-gray-900">{weeklyTotal.percentage}%</span>
                      </div>
                    </div>
                    {/* Expand Icon */}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        weeklyTotal.percentage >= 100 ? 'bg-emerald-600' : weeklyTotal.percentage >= 70 ? 'bg-blue-600' : 'bg-purple-600'
                      }`}
                      style={{ width: `${Math.min(weeklyTotal.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Daily Breakdown */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  <h4 className="text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    Daily Breakdown
                  </h4>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
                    {currentWeek.days.map((day, idx) => {
                      const dailyData = getDailyData(employee.id, day);
                      const dailyPercentage = Math.round((dailyData.achieved / dailyData.target) * 100);
                      const dayKey = `${employee.id}-${day}`;
                      const isDayExpanded = expandedDay === dayKey;
                      
                      return (
                        <div key={idx}>
                          <div 
                            onClick={() => toggleDay(employee.id, day)}
                            className="bg-white rounded-lg p-4 border border-gray-200 cursor-pointer hover:border-purple-300 hover:shadow-md transition-all"
                          >
                            <div className="text-center mb-3">
                              <p className="text-xs text-gray-500 mb-1">{day}</p>
                              <p className="text-sm text-gray-900">Nov {selectedWeek * 7 - 7 + idx + 1}</p>
                            </div>
                            
                            {/* Mini Progress Circle */}
                            <div className="relative w-12 h-12 mx-auto mb-3">
                              <svg className="w-12 h-12 transform -rotate-90">
                                <circle
                                  cx="24"
                                  cy="24"
                                  r="20"
                                  stroke="#e5e7eb"
                                  strokeWidth="4"
                                  fill="none"
                                />
                                <circle
                                  cx="24"
                                  cy="24"
                                  r="20"
                                  stroke={dailyPercentage >= 100 ? '#10b981' : dailyPercentage >= 70 ? '#3b82f6' : '#a855f7'}
                                  strokeWidth="4"
                                  fill="none"
                                  strokeDasharray={`${2 * Math.PI * 20}`}
                                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - Math.min(dailyPercentage, 100) / 100)}`}
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs text-gray-900">{dailyPercentage}%</span>
                              </div>
                            </div>

                            <div className="text-center space-y-1">
                              <div className="text-xs text-gray-600">
                                <span className="text-gray-500">Target:</span> {dailyData.target}
                              </div>
                              <div className="text-xs">
                                <span className="text-gray-500">Done:</span>{' '}
                                <span className={dailyData.achieved >= dailyData.target ? 'text-emerald-600' : 'text-gray-900'}>
                                  {dailyData.achieved}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-center mt-2 text-purple-600">
                              <ChevronRight className={`w-4 h-4 transition-transform ${isDayExpanded ? 'rotate-90' : ''}`} />
                            </div>
                          </div>

                          {/* Category Details for Day */}
                          {isDayExpanded && (
                            <div className="mt-2 bg-white rounded-lg p-4 border border-purple-200 shadow-lg">
                              <p className="text-xs text-gray-700 mb-3">Sales Breakdown for {day}</p>
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {getDailyCategoryData(employee.id, day).map((item, catIdx) => (
                                  <div key={catIdx} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                                    <span className="text-gray-600 truncate pr-2">{item.category.name}</span>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className={item.achieved >= item.target ? 'text-emerald-600' : 'text-gray-900'}>
                                        {item.achieved}
                                      </span>
                                      <span className="text-gray-400">/</span>
                                      <span className="text-gray-500">{item.target}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Top Categories for this week */}
                  <div className="mt-6">
                    <h4 className="text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      Top Performing Categories
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {SALES_CATEGORIES.slice(0, 3).map(cat => {
                        const catTarget = Math.floor(Math.random() * 20) + 10;
                        const catAchieved = Math.floor(Math.random() * 25) + 8;
                        const catPercentage = Math.round((catAchieved / catTarget) * 100);

                        return (
                          <div key={cat.id} className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-sm text-gray-700 mb-2">{cat.name}</p>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-600">{catAchieved} / {catTarget}</span>
                              <span className={`text-xs ${catPercentage >= 100 ? 'text-emerald-600' : 'text-gray-900'}`}>
                                {catPercentage}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  catPercentage >= 100 ? 'bg-emerald-600' : 'bg-purple-600'
                                }`}
                                style={{ width: `${Math.min(catPercentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Week Summary - Enhanced */}
      <div className="mt-6 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl shadow-lg p-6 text-white">
        <h3 className="mb-4 flex items-center gap-2">
          <Award className="w-5 h-5" />
          Week {selectedWeek} Team Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-sm opacity-90 mb-1">Team Target</p>
            <p className="text-2xl">{teamTotals.target}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-sm opacity-90 mb-1">Team Achieved</p>
            <p className="text-2xl">{teamTotals.achieved}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-sm opacity-90 mb-1">Team Average</p>
            <p className="text-2xl">{teamTotals.percentage}%</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-sm opacity-90 mb-1">Gap</p>
            <p className={`text-2xl ${teamTotals.achieved >= teamTotals.target ? 'text-emerald-200' : 'text-amber-200'}`}>
              {teamTotals.achieved >= teamTotals.target ? '+' : ''}{teamTotals.achieved - teamTotals.target}
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-sm opacity-90 mb-1">Top Performer</p>
            <p className="text-lg">{employees[0].name.split(' ')[0]}</p>
            <p className="text-xs opacity-75">{getWeeklyTotal(employees[0].id).percentage}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
