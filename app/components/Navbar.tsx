'use client';

import { useAuth } from '../context/AuthContext';

type View = 'list' | 'add' | 'review' | 'settings';

interface NavbarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export function Navbar({ currentView, onViewChange }: NavbarProps) {
  const { user, signOut } = useAuth();

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: 'list', label: 'Words', icon: '📚' },
    { id: 'add', label: 'Add', icon: '➕' },
    { id: 'review', label: 'Review', icon: '🔄' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Vocab Master
            </span>
          </div>

          <div className="flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  currentView === item.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {user?.email}
            </span>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
