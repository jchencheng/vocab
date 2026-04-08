'use client';

import { useAuth } from './context/AuthContext';
import { useApp } from './context/AppContext';
import { Login } from './components/Login';
import { Navbar } from './components/Navbar';
import { WordList } from './components/WordList';
import { AddWord } from './components/AddWord';
import { Review } from './components/Review';
import { Settings } from './components/Settings';
import { AIMemory } from './components/AIMemory';
import { useState } from 'react';

type View = 'list' | 'add' | 'review' | 'settings' | 'ai-memory';

export default function Home() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isLoading: isAppLoading } = useApp();
  const [currentView, setCurrentView] = useState<View>('list');

  if (isAuthLoading || isAppLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-primary-200 border-t-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen">
      <Navbar currentView={currentView} onViewChange={setCurrentView} />
      <main className="container mx-auto px-4 py-8">
        <div className="animate-fade-in">
          {currentView === 'list' && <WordList />}
          {currentView === 'add' && <AddWord />}
          {currentView === 'review' && <Review />}
          {currentView === 'settings' && <Settings />}
          {currentView === 'ai-memory' && <AIMemory />}
        </div>
      </main>
    </div>
  );
}
