'use client';

import React, { useState } from 'react';
import { Activity, TrendingUp, Users, Settings, Bell, Search, Plus, BarChart3, Calendar, Target, Sparkles, Menu } from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const stats = [
    { label: 'Total Users', value: '12,847', change: '+23%', icon: Users, color: 'blue' },
    { label: 'Revenue', value: '8,295', change: '+18%', icon: TrendingUp, color: 'green' },
    { label: 'Active Now', value: '1,423', change: '+5%', icon: Activity, color: 'purple' },
    { label: 'Tasks Done', value: '8,932', change: '+31%', icon: Target, color: 'orange' },
  ];

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'projects', label: 'Projects', icon: Target },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className='min-h-screen bg-gray-950 text-white'>
      <header className='border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50'>
        <div className='flex items-center justify-between px-4 py-3'>
          <div className='flex items-center gap-3'>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className='lg:hidden p-2 hover:bg-gray-800 rounded-lg'>
              <Menu className='w-5 h-5' />
            </button>
            <div className='flex items-center gap-2'>
              <Sparkles className='w-6 h-6 text-purple-400' />
              <span className='font-bold text-lg'>Dashboard</span>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <div className='hidden md:flex items-center bg-gray-800 rounded-lg px-3 py-1.5'>
              <Search className='w-4 h-4 text-gray-500 mr-2' />
              <input type='text' placeholder='Search...' className='bg-transparent text-sm outline-none w-48 text-white' />
            </div>
            <button className='relative p-2 hover:bg-gray-800 rounded-lg'>
              <Bell className='w-5 h-5' />
              <span className='absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full'></span>
            </button>
            <div className='w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-sm font-bold'>U</div>
          </div>
        </div>
      </header>

      <div className='flex'>
        <aside className={(sidebarOpen ? 'translate-x-0 ' : '-translate-x-full ') + 'lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gray-900 border-r border-gray-800 transition-transform duration-200'}>
          <div className='p-4 space-y-1'>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ' + (activeTab === item.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white')}
              >
                <item.icon className='w-4 h-4' />
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <main className='flex-1 p-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
            {stats.map((stat, i) => (
              <div key={i} className='bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors'>
                <div className='flex items-center justify-between mb-3'>
                  <stat.icon className={'w-5 h-5 text-' + stat.color + '-400'} />
                  <span className='text-xs text-green-400'>{stat.change}</span>
                </div>
                <p className='text-2xl font-bold'>{stat.value}</p>
                <p className='text-sm text-gray-500'>{stat.label}</p>
              </div>
            ))}
          </div>

          <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-6'>
            <button className='bg-blue-500 hover:bg-blue-400 text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-colors'>
              <Plus className='w-6 h-6' />
              <span className='text-sm font-medium'>New Project</span>
            </button>
            <button className='bg-green-500 hover:bg-green-400 text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-colors'>
              <BarChart3 className='w-6 h-6' />
              <span className='text-sm font-medium'>Analytics</span>
            </button>
            <button className='bg-purple-500 hover:bg-purple-400 text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-colors'>
              <Calendar className='w-6 h-6' />
              <span className='text-sm font-medium'>Calendar</span>
            </button>
            <button className='bg-gray-500 hover:bg-gray-400 text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-colors'>
              <Settings className='w-6 h-6' />
              <span className='text-sm font-medium'>Settings</span>
            </button>
          </div>

          <div className='bg-gray-900 border border-gray-800 rounded-xl p-4'>
            <h3 className='font-semibold mb-4'>Recent Activity</h3>
            <div className='space-y-3'>
              {['Sarah completed a task', 'Mike joined the team', 'Emma shared a project', 'James left a comment'].map((item, i) => (
                <div key={i} className='flex items-center gap-3 p-2 hover:bg-gray-800 rounded-lg transition-colors'>
                  <div className='w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold'>{item[0]}</div>
                  <p className='text-sm'>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
