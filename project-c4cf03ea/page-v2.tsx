'use client';

import React, { useState, useEffect } from 'react';

// Inline SVG icons (no external dependencies)
const Icons = {
  Activity: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  TrendingUp: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  Users: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Settings: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.17 15a1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.17 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V2a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Bell: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Plus: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  BarChart: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  Calendar: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Target: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Sparkles: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
  Menu: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Flame: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>,
  Timer: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="14" x2="12" y2="11"/><path d="M12 2v4"/><circle cx="12" cy="14" r="10"/></svg>,
  Dumbbell: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>,
  Heart: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>,
  Trophy: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
  Zap: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Star: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  ArrowUpRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>,
  ChevronRight: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
  Play: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  CalendarCheck: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>,
  TrendingDown: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
};

// Animated counter
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
    { label: 'Total Users', value: totalUsers, rawValue: 12847, change: '+23%', icon: 'users', color: 'purple', chart: [40, 55, 45, 70, 65, 85, 90] },
    { label: 'Revenue', value: '$' + revenue, rawValue: 8295, change: '+18%', icon: 'trending', color: 'green', chart: [30, 45, 60, 55, 75, 80, 95] },
    { label: 'Active Now', value: activeNow, rawValue: 1423, change: '+5%', icon: 'activity', color: 'cyan', chart: [60, 50, 70, 65, 80, 75, 85] },
    { label: 'Tasks Done', value: tasksDone, rawValue: 8932, change: '+31%', icon: 'target', color: 'orange', chart: [35, 50, 45, 65, 70, 85, 100] },
  ];

  const navItems = [
    { id: 'overview', label: 'Overview', icon: 'activity' },
    { id: 'analytics', label: 'Analytics', icon: 'barchart' },
    { id: 'workouts', label: 'Workouts', icon: 'dumbbell' },
    { id: 'progress', label: 'Progress', icon: 'trending' },
    { id: 'social', label: 'Community', icon: 'users' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const quickActions = [
    { label: 'New Workout', desc: 'Start a session', color: 'btn-purple' },
    { label: 'Analytics', desc: 'View reports', color: 'btn-cyan' },
    { label: 'Calendar', desc: 'Plan ahead', color: 'btn-orange' },
    { label: 'Goals', desc: 'Set targets', color: 'btn-green' },
  ];

  const recentActivity = [
    { name: 'Sarah', action: 'completed HIIT Blast', time: '2 min ago', color: 'orange', icon: 'flame' },
    { name: 'Mike', action: 'hit a new PR: 140kg', time: '15 min ago', color: 'yellow', icon: 'trophy' },
    { name: 'Emma', action: 'finished 5K run', time: '32 min ago', color: 'cyan', icon: 'zap' },
    { name: 'James', action: 'joined Strength Club', time: '1 hr ago', color: 'purple', icon: 'star' },
  ];

  const getActivityIcon = (icon: string) => {
    switch(icon) {
      case 'flame': return <Icons.Flame />;
      case 'trophy': return <Icons.Trophy />;
      case 'zap': return <Icons.Zap />;
      case 'star': return <Icons.Star />;
      default: return <Icons.Activity />;
    }
  };

  const getActivityBg = (color: string) => {
    const map: Record<string, string> = {
      orange: 'rgba(249, 115, 22, 0.15)',
      yellow: 'rgba(234, 179, 8, 0.15)',
      cyan: 'rgba(6, 182, 212, 0.15)',
      purple: 'rgba(139, 92, 246, 0.15)',
    };
    return map[color] || 'rgba(255,255,255,0.05)';
  };

  const getActivityIconColor = (color: string) => {
    const map: Record<string, string> = {
      orange: '#fb923c',
      yellow: '#facc15',
      cyan: '#22d3ee',
      purple: '#c084fc',
    };
    return map[color] || '#a1a1aa';
  };

  return (
    <div className="app-bg">
      {/* Floating orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Header */}
      <header className="header glass">
        <div className="header-left">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Icons.Menu />
          </button>
          <div className="logo-box">
            <Icons.Sparkles />
          </div>
          <div className="logo-text">
            <h1>FitTrack Pro</h1>
            <p>Your fitness journey</p>
          </div>
        </div>
        <div className="header-right">
          <div className="search-box">
            <Icons.Search />
            <input type="text" placeholder="Search workouts, plans..." />
          </div>
          <button className="notif-btn">
            <Icons.Bell />
            <span className="notif-dot" />
          </button>
          <div className="user-section">
            <div className="user-info">
              <p className="name">Alex Johnson</p>
              <p className="level">Intermediate</p>
            </div>
            <div className="user-avatar">AJ</div>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      <div className={`overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div className="app-layout">
        {/* Sidebar */}
        <aside className="sidebar glass-strong">
          <div className="goal-card">
            <div className="goal-header">
              <span>Weekly Goal</span>
              <span className="pct">75%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '75%' }} />
            </div>
            <p>4 of 5 workouts completed</p>
          </div>

          <div>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              >
                {item.icon === 'activity' && <Icons.Activity />}
                {item.icon === 'barchart' && <Icons.BarChart />}
                {item.icon === 'dumbbell' && <Icons.Dumbbell />}
                {item.icon === 'trending' && <Icons.TrendingUp />}
                {item.icon === 'users' && <Icons.Users />}
                {item.icon === 'settings' && <Icons.Settings />}
                {item.label}
              </button>
            ))}
          </div>

          <div className="streak-card">
            <div className="streak-icon">
              <Icons.Flame />
            </div>
            <div className="streak-text">
              <p>12 Day Streak!</p>
              <span>Keep it burning 🔥</span>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        <aside className={`sidebar-mobile glass-strong ${sidebarOpen ? 'open' : ''}`}>
          <div style={{ padding: '20px 16px' }}>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              >
                {item.icon === 'activity' && <Icons.Activity />}
                {item.icon === 'barchart' && <Icons.BarChart />}
                {item.icon === 'dumbbell' && <Icons.Dumbbell />}
                {item.icon === 'trending' && <Icons.TrendingUp />}
                {item.icon === 'users' && <Icons.Users />}
                {item.icon === 'settings' && <Icons.Settings />}
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          <div className="welcome">
            <h2>Welcome back, <span className="gradient-text">Alex!</span></h2>
            <p>You&apos;re on fire! You&apos;ve completed 4 workouts this week.</p>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            {stats.map((stat, i) => (
              <div
                key={i}
                className={`stat-card stat-card-${stat.color}`}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="stat-header">
                  <div className={`stat-icon-box icon-${stat.color}`}>
                    {stat.icon === 'users' && <Icons.Users />}
                    {stat.icon === 'trending' && <Icons.TrendingUp />}
                    {stat.icon === 'activity' && <Icons.Activity />}
                    {stat.icon === 'target' && <Icons.Target />}
                  </div>
                  <span className="stat-change">
                    <Icons.ArrowUpRight />
                    {stat.change}
                  </span>
                </div>
                <p className="stat-value">{stat.value}</p>
                <p className="stat-label">{stat.label}</p>
                <div className="sparkline">
                  {stat.chart.map((val, j) => (
                    <div
                      key={j}
                      className={`spark-bar spark-${stat.color}`}
                      style={{
                        height: `${val}%`,
                        opacity: hoveredCard === i ? 1 : 0.6,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="actions-grid">
            {quickActions.map((action, i) => (
              <button key={i} className={`action-btn ${action.color}`}>
                {i === 0 && <Icons.Plus />}
                {i === 1 && <Icons.BarChart />}
                {i === 2 && <Icons.Calendar />}
                {i === 3 && <Icons.Trophy />}
                <span className="label">{action.label}</span>
                <span className="desc">{action.desc}</span>
              </button>
            ))}
          </div>

          {/* Content Grid */}
          <div className="content-grid">
            {/* Activity Feed */}
            <div className="card glass">
              <div className="card-header">
                <div>
                  <h3>Recent Activity</h3>
                  <p>What&apos;s happening in your fitness circle</p>
                </div>
                <button className="view-all">
                  View all <Icons.ChevronRight />
                </button>
              </div>
              <div>
                {recentActivity.map((item, i) => (
                  <div key={i} className="activity-item">
                    <div className="activity-icon" style={{ background: getActivityBg(item.color), color: getActivityIconColor(item.color) }}>
                      {getActivityIcon(item.icon)}
                    </div>
                    <div className="activity-info">
                      <p><span className="name">{item.name}</span> <span className="action">{item.action}</span></p>
                      <p className="time">{item.time}</p>
                    </div>
                    <button className="like-btn">
                      <Icons.Heart />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Plan */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Today&apos;s Plan</h3>

              <div className="plan-card">
                <div className="glow" />
                <div className="plan-tag">
                  <Icons.Dumbbell />
                  <span>Strength</span>
                </div>
                <h4>Upper Body Power</h4>
                <p className="meta">5 exercises &bull; 45 min</p>
                <div className="plan-actions">
                  <button className="btn-primary">
                    <Icons.Play /> Start
                  </button>
                  <button className="btn-icon">
                    <Icons.Timer />
                  </button>
                </div>
              </div>

              <div className="mini-stats">
                <div className="mini-stat">
                  <Icons.Flame style={{ color: '#fb923c' }} />
                  <span className="num">2,847</span>
                  <span className="lbl">Calories burned</span>
                </div>
                <div className="mini-stat">
                  <Icons.Timer style={{ color: '#22d3ee' }} />
                  <span className="num">12h 30m</span>
                  <span className="lbl">Total time</span>
                </div>
              </div>

              <div className="next-workout">
                <div>
                  <p>Next up</p>
                  <p className="title">HIIT Cardio Blast</p>
                </div>
                <span className="when">Tomorrow</span>
              </div>
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="bottom-stats glass">
            <div className="bottom-grid">
              <div className="bottom-item">
                <div className="icon-box" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>
                  <Icons.CalendarCheck />
                </div>
                <span className="num">24</span>
                <span className="lbl">Workout Days</span>
              </div>
              <div className="bottom-item">
                <div className="icon-box" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
                  <Icons.TrendingDown />
                </div>
                <span className="num">6.5 kg</span>
                <span className="lbl">Weight Lost</span>
              </div>
              <div className="bottom-item">
                <div className="icon-box" style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#fb923c' }}>
                  <Icons.Trophy />
                </div>
                <span className="num">8</span>
                <span className="lbl">Achievements</span>
              </div>
              <div className="bottom-item">
                <div className="icon-box" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
                  <Icons.Heart />
                </div>
                <span className="num">156</span>
                <span className="lbl">Community Likes</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
