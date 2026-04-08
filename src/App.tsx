import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Login } from './components/Login';
import { Navbar } from './components/Navbar';
import { AddWord } from './components/AddWord';
import { WordList } from './components/WordList';
import { Review } from './components/Review';
import { AIMemory } from './components/AIMemory';
import { Settings } from './components/Settings';

function AppContent() {
  const [activeTab, setActiveTab] = useState('add');
  const { isLoading } = useApp();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Show loading while checking auth state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">📖</div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  // Show loading while loading app data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">📖</div>
          <p className="text-gray-600 dark:text-gray-400">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 dark:text-gray-200">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="pb-4 sm:pb-8">
        {activeTab === 'add' && <AddWord />}
        {activeTab === 'words' && <WordList />}
        {activeTab === 'review' && <Review />}
        {activeTab === 'ai' && <AIMemory />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
