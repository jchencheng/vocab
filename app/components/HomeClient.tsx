'use client';

import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Login } from './Login';
import { Navbar } from './Navbar';
import { DashboardServer } from './DashboardServer';
import { Suspense, lazy, useState } from 'react';

// 懒加载其他页面组件
const WordList = lazy(() => import('./WordList').then(m => ({ default: m.WordList })));
const AddWord = lazy(() => import('./AddWord').then(m => ({ default: m.AddWord })));
const WordBookList = lazy(() => import('./WordBookList').then(m => ({ default: m.WordBookList })));
const Review = lazy(() => import('./Review').then(m => ({ default: m.Review })));
const Settings = lazy(() => import('./Settings').then(m => ({ default: m.Settings })));
const AIMemory = lazy(() => import('./AIMemory').then(m => ({ default: m.AIMemory })));

// 页面加载骨架屏
function PageSkeleton() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary-200 border-t-primary-600"></div>
    </div>
  );
}

// Dashboard 骨架屏
function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white animate-pulse">
        <div className="h-8 bg-white/20 rounded w-48 mb-2"></div>
        <div className="h-4 bg-white/20 rounded w-64"></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

type View = 'home' | 'list' | 'add' | 'wordbooks' | 'review' | 'settings' | 'ai-memory';

interface HomeClientProps {
  userId: string;
}

export function HomeClient({ userId }: HomeClientProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isLoading: isAppLoading } = useApp();
  const [currentView, setCurrentView] = useState<View>('home');

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
          {currentView === 'home' && (
            <Suspense fallback={<DashboardSkeleton />}>
              <DashboardServer
                userId={userId}
                onViewChange={setCurrentView}
              />
            </Suspense>
          )}
          {currentView === 'list' && (
            <Suspense fallback={<PageSkeleton />}>
              <WordList />
            </Suspense>
          )}
          {currentView === 'add' && (
            <Suspense fallback={<PageSkeleton />}>
              <AddWord />
            </Suspense>
          )}
          {currentView === 'wordbooks' && (
            <Suspense fallback={<PageSkeleton />}>
              <WordBookList />
            </Suspense>
          )}
          {currentView === 'review' && (
            <Suspense fallback={<PageSkeleton />}>
              <Review />
            </Suspense>
          )}
          {currentView === 'settings' && (
            <Suspense fallback={<PageSkeleton />}>
              <Settings />
            </Suspense>
          )}
          {currentView === 'ai-memory' && (
            <Suspense fallback={<PageSkeleton />}>
              <AIMemory />
            </Suspense>
          )}
        </div>
      </main>
    </div>
  );
}
