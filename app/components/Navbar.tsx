'use client';

import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

type View = 'list' | 'add' | 'review' | 'settings' | 'ai-memory';

interface NavbarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export function Navbar({ currentView, onViewChange }: NavbarProps) {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: 'list', label: 'Words', icon: '📚' },
    { id: 'add', label: 'Add', icon: '➕' },
    { id: 'review', label: 'Review', icon: '🔄' },
    { id: 'ai-memory', label: 'AI Memory', icon: '🤖' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-soft">
                <span className="text-xl">📖</span>
              </div>
            </div>
            <div>
              <span className="font-display text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Vocab Master
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`relative px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  currentView === item.id
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {currentView === item.id && (
                  <div className="absolute inset-0 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-800/30" />
                )}
                <span className="relative flex items-center gap-2">
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-xs font-semibold">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium max-w-[150px] truncate">
                  {user?.email}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>

            <button
              className="md:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="text-xl">{mobileMenuOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 dark:border-slate-700 animate-slide-up">
            <div className="flex flex-col gap-2 mb-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    currentView === item.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-800/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-xs font-semibold">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  {user?.email}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="px-3 py-1.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
