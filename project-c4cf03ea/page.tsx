'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity, TrendingUp, Users, Settings, Bell, Search, Plus,
  BarChart3, Calendar, Target, Sparkles, Menu, Flame, Timer,
  Dumbbell, Heart, Trophy, Zap, ArrowUpRight, ChevronRight,
  Star, TrendingDown, CalendarCheck, Play, Pause, RotateCcw
} from 'lucide-react';

// Animated counter hook
function useCountUp(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration]);
  return count.toLocaleString();
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const totalUsers = useCountUp(12847);
  const revenue = useCountUp(8295);
  const activeNow = useCountUp(1423);
  const tasksDone = useCountUp(8932);

  const stats = [
    {
      label: 'Total Users',
      value: totalUsers,
      rawValue: 12847,
      change: '+23%',
      icon: Users,
      gradient: 'bg-gradient-card-purple',
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/20',
      glow: 'glow-purple',
      chart: [40, 55, 45, 70, 65, 85, 90]
    },
    {
      label: 'Revenue',
      value: '$' + revenue,
      rawValue: 8295,
      change: '+18%',
      icon: TrendingUp,
      gradient: 'bg-gradient-card-green',
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/20',
      glow: 'glow-cyan',
      chart: [30, 45, 60, 55, 75, 80, 95]
    },
    {
      label: 'Active Now',
      value: activeNow,
      rawValue: 1423,
      change: '+5%',
      icon: Activity,
      gradient: 'bg-gradient-card-cyan',
      iconColor: 'text-cyan-400',
      iconBg: 'bg-cyan-500/20',
      glow: 'glow-cyan',
      chart: [60, 50, 70, 65, 80, 75, 85]
    },
    {
      label: 'Tasks Done',
      value: tasksDone,
      rawValue: 8932,
      change: '+31%',
      icon: Target,
      gradient: 'bg-gradient-card-orange',
      iconColor: 'text-orange-400',
      iconBg: 'bg-orange-500/20',
      glow: 'glow-orange',
      chart: [35, 50, 45, 65, 70, 85, 100]
    },
  ];

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'social', label: 'Community', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const quickActions = [
    { label: 'New Workout', icon: Plus, gradient: 'btn-gradient-purple', desc: 'Start a session' },
    { label: 'Analytics', icon: BarChart3, gradient: 'btn-gradient-cyan', desc: 'View reports' },
    { label: 'Calendar', icon: Calendar, gradient: 'btn-gradient-orange', desc: 'Plan ahead' },
    { label: 'Goals', icon: Trophy, gradient: 'btn-gradient-green', desc: 'Set targets' },
  ];

  const recentActivity = [
    { name: 'Sarah', action: 'completed HIIT Blast', time: '2 min ago', icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/20' },
    { name: 'Mike', action: 'hit a new PR: 140kg', time: '15 min ago', icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    { name: 'Emma', action: 'finished 5K run', time: '32 min ago', icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    { name: 'James', action: 'joined Strength Club', time: '1 hr ago', icon: Star, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  ];

  const weeklyGoal = 75;

  return (
    <div className="min-h-screen mesh-bg text-white relative overflow-hidden">
      {/* Floating orbs background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-pulse-glow" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-pink-600/10 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/15 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl btn-gradient-purple flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight">FitTrack Pro</h1>
                <p className="text-xs text-gray-400">Your fitness journey</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center glass rounded-xl px-4 py-2 gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search workouts, plans..."
                className="bg-transparent text-sm outline-none w-48 text-white placeholder-gray-500"
              />
            </div>
            <button className="relative p-2.5 rounded-xl hover:bg-white/10 transition-colors">
              <Bell className="w-5 h-5 text-gray-300" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full animate-pulse" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">Alex Johnson</p>
                <p className="text-xs text-gray-400">Intermediate</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold shadow-lg shadow-purple-500/25">
                AJ
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative z-10">
        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-72 glass-strong border-r border-white/5 transition-transform duration-300 pt-20 lg:pt-0`}
        >
          <div className="p-4 space-y-1">
            {/* Weekly Progress */}
            <div className="mb-6 p-4 rounded-xl bg-gradient-card-purple gradient-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-300">Weekly Goal</span>
                <span className="text-xs text-purple-400">{weeklyGoal}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full progress-gradient rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${weeklyGoal}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">4 of 5 workouts completed</p>
            </div>

            {/* Nav items */}
            <div className="space-y-1">
              {navItems.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === item.id
                      ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/20 text-white shadow-lg shadow-purple-500/10 border border-purple-500/20'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-purple-400' : ''}`} />
                  {item.label}
                  {activeTab === item.id && (
                    <ChevronRight className="w-4 h-4 ml-auto text-purple-400" />
                  )}
                </button>
              ))}
            </div>

            {/* Streak Card */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-orange-500/20 to-yellow-500/10 border border-orange-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/30 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-orange-300">12 Day Streak!</p>
                  <p className="text-xs text-gray-400">Keep it burning 🔥</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          {/* Welcome Section */}
          <div className="mb-8 animate-slide-up">
            <h2 className="text-3xl font-bold mb-2">
              Welcome back, <span className="text-gradient-purple">Alex!</span>
            </h2>
            <p className="text-gray-400">You're on fire! You've completed 4 workouts this week.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {stats.map((stat, i) => (
              <div
                key={i}
                className={`relative glass rounded-2xl p-5 stat-card cursor-pointer gradient-border ${stat.glow}`}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`absolute inset-0 rounded-2xl ${stat.gradient} opacity-50`} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium bg-emerald-500/10 px-2 py-1 rounded-full">
                      <ArrowUpRight className="w-3 h-3" />
                      {stat.change}
                    </div>
                  </div>
                  <p className="text-2xl font-bold mb-1">{stat.value}</p>
                  <p className="text-sm text-gray-400 mb-3">{stat.label}</p>

                  {/* Mini sparkline */}
                  <div className="flex items-end gap-1 h-8">
                    {stat.chart.map((value, j) => (
                      <div
                        key={j}
                        className={`flex-1 rounded-t-sm transition-all duration-300 ${
                          hoveredCard === i ? 'opacity-100' : 'opacity-60'
                        }`}
                        style={{
                          height: `${value}%`,
                          background: `linear-gradient(to top, ${
                            i === 0 ? 'rgba(139,92,246,0.6)' :
                            i === 1 ? 'rgba(34,197,94,0.6)' :
                            i === 2 ? 'rgba(6,182,212,0.6)' :
                            'rgba(249,115,22,0.6)'
                          }, transparent)`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {quickActions.map((action, i) => (
              <button
                key={i}
                className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${action.gradient}`}
                style={{ animationDelay: `${i * 75}ms` }}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <action.icon className="w-6 h-6 text-white/90 mb-3" />
                  <p className="font-semibold text-white text-sm">{action.label}</p>
                  <p className="text-xs text-white/60 mt-1">{action.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Activity Feed */}
            <div className="lg:col-span-2 glass rounded-2xl p-6 gradient-border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Recent Activity</h3>
                  <p className="text-sm text-gray-400">What's happening in your fitness circle</p>
                </div>
                <button className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
                  View all <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {recentActivity.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all duration-200 group cursor-pointer"
                  >
                    <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        <span className="text-white">{item.name}</span>{' '}
                        <span className="text-gray-400">{item.action}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.time}</p>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-lg">
                      <Heart className="w-4 h-4 text-gray-400 hover:text-pink-400 transition-colors" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Workout */}
            <div className="glass rounded-2xl p-6 gradient-border">
              <h3 className="text-lg font-semibold mb-4">Today's Plan</h3>

              <div className="space-y-4">
                {/* Workout Card */}
                <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-purple-600/30 to-pink-600/20 border border-purple-500/30">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <Dumbbell className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-purple-300 font-medium uppercase tracking-wider">Strength</span>
                    </div>
                    <h4 className="font-bold text-lg mb-1">Upper Body Power</h4>
                    <p className="text-sm text-gray-400 mb-4">5 exercises • 45 min</p>

                    <div className="flex items-center gap-3">
                      <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium">
                        <Play className="w-4 h-4" />
                        Start
                      </button>
                      <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <Timer className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stats mini cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-white/5 text-center">
                    <Flame className="w-5 h-5 text-orange-400 mx-auto mb-2" />
                    <p className="text-xl font-bold">2,847</p>
                    <p className="text-xs text-gray-500">Calories burned</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 text-center">
                    <Timer className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                    <p className="text-xl font-bold">12h 30m</p>
                    <p className="text-xs text-gray-500">Total time</p>
                  </div>
                </div>

                {/* Next workout */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Next up</p>
                      <p className="font-medium text-sm">HIIT Cardio Blast</p>
                    </div>
                    <span className="text-xs text-gray-500">Tomorrow</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Stats Bar */}
          <div className="mt-8 glass rounded-2xl p-6 gradient-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                  <CalendarCheck className="w-6 h-6 text-purple-400" />
                </div>
                <p className="text-2xl font-bold">24</p>
                <p className="text-sm text-gray-400">Workout Days</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mx-auto mb-3">
                  <TrendingDown className="w-6 h-6 text-cyan-400" />
                </div>
                <p className="text-2xl font-bold">6.5 kg</p>
                <p className="text-sm text-gray-400">Weight Lost</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-6 h-6 text-orange-400" />
                </div>
                <p className="text-2xl font-bold">8</p>
                <p className="text-sm text-gray-400">Achievements</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mx-auto mb-3">
                  <Heart className="w-6 h-6 text-pink-400" />
                </div>
                <p className="text-2xl font-bold">156</p>
                <p className="text-sm text-gray-400">Community Likes</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
