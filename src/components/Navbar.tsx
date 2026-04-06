

import { useApp } from '../context/AppContext';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const { isDarkMode, toggleDarkMode } = useApp();
  const tabs = [
    { id: 'add', label: 'Add Word', icon: '➕' },
    { id: 'words', label: 'Word List', icon: '📚' },
    { id: 'review', label: 'Review', icon: '🎯' },
    { id: 'ai', label: 'AI Memory', icon: '🤖' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50 dark:bg-gray-900 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              VocabMaster
            </h1>
          </div>
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  flex items-center gap-2
                  ${activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
            <button
              onClick={toggleDarkMode}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span>{isDarkMode ? '☀️' : '🌙'}</span>
              <span className="hidden sm:inline">{isDarkMode ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
