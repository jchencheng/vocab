'use client';

import { useAuth } from './context/AuthContext';
import { useApp } from './context/AppContext';
import { Login } from './components/Login';
import { Navbar } from './components/Navbar';
import { WordList } from './components/WordList';
import { AddWord } from './components/AddWord';
import { Review } from './components/Review';
import { Settings } from './components/Settings';
import { useState } from 'react';

type View = 'list' | 'add' | 'review' | 'settings';

export default function Home() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isLoading: isAppLoading } = useApp();
  const [currentView, setCurrentView] = useState<View>('list');

  if (isAuthLoading || isAppLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar currentView={currentView} onViewChange={setCurrentView} />
      <main className="container mx-auto px-4 py-6">
        {currentView === 'list' && <WordList />}
        {currentView === 'add' && <AddWord />}
        {currentView === 'review' && <Review />}
        {currentView === 'settings' && <Settings />}
      </main>
    </div>
  );
}
