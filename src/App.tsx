import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { AddWord } from './components/AddWord';
import { WordList } from './components/WordList';
import { Review } from './components/Review';
import { AIMemory } from './components/AIMemory';
import { Settings } from './components/Settings';

function AppContent() {
  const [activeTab, setActiveTab] = useState('add');
  const { isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">📖</div>
          <p className="text-gray-600">Loading...</p>
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
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
