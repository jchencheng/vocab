import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { db } from '../lib/indexedDB';

interface Word {
  id: string;
  word: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
      synonyms: string[];
      antonyms: string[];
      chineseDefinition?: string;
    }>;
    synonyms: string[];
    antonyms: string[];
  }>;
  tags: string[];
  createdAt: number;
  nextReviewAt: number;
  reviewCount: number;
  easeFactor: number;
  interval: number;
  quality: number;
  customNote?: string;
}

interface APIConfig {
  id: string;
  name: string;
  apiKey?: string;
  apiEndpoint?: string;
  model?: string;
  isDefault?: boolean;
}

interface AppSettings {
  apis?: APIConfig[];
  currentApiId?: string;
  darkMode?: boolean;
  maxDailyReviews?: number;
}

interface ReviewStats {
  total: number;
  dueToday: number;
  mastered: number;
  learning: number;
}

interface AppContextType {
  words: Word[];
  settings: AppSettings;
  isLoading: boolean;
  refreshWords: () => Promise<void>;
  addWord: (word: Word) => Promise<void>;
  updateWord: (word: Word) => Promise<void>;
  deleteWord: (id: string) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  getStats: () => ReviewStats;
  toggleDarkMode: () => Promise<void>;
  isDarkMode: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [words, setWords] = useState<Word[]>([]);
  const [settings, setSettings] = useState<AppSettings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    initDB();
  }, []);

  // 确保 isDarkMode 状态和 DOM 状态同步
  useEffect(() => {
    console.log('isDarkMode state changed:', isDarkMode);
    // 直接使用 classList.toggle 方法
    document.documentElement.classList.toggle('dark', isDarkMode);
    console.log('Document classList after useEffect:', document.documentElement.classList);
  }, [isDarkMode]);

  async function initDB() {
    try {
      console.log('initDB called');
      await db.init();
      await refreshWords();
      const savedSettings = await db.getSettings();
      console.log('Saved settings:', savedSettings);
      if (savedSettings) {
        // 迁移旧的API设置结构到新的结构
        if (savedSettings.apiKey || savedSettings.apiEndpoint || savedSettings.model) {
          const apiId = crypto.randomUUID();
          const migratedSettings = {
            ...savedSettings,
            apis: [{
              id: apiId,
              name: 'Default',
              apiKey: savedSettings.apiKey,
              apiEndpoint: savedSettings.apiEndpoint,
              model: savedSettings.model,
              isDefault: true
            }],
            currentApiId: apiId
          };
          delete migratedSettings.apiKey;
          delete migratedSettings.apiEndpoint;
          delete migratedSettings.model;
          await saveSettings(migratedSettings);
          setSettings(migratedSettings);
        } else {
          setSettings(savedSettings);
        }
        setIsDarkMode(savedSettings.darkMode || false);
        console.log('Dark mode from settings:', savedSettings.darkMode);
        if (savedSettings.darkMode) {
          console.log('Adding dark class during init');
          document.documentElement.classList.add('dark');
          console.log('Document classList after init:', document.documentElement.classList);
        }
      }
    } catch (error) {
      console.error('Error initializing DB:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleDarkMode() {
    console.log('toggleDarkMode called');
    const newDarkMode = !isDarkMode;
    console.log('New dark mode:', newDarkMode);
    
    // 更新状态
    setIsDarkMode(newDarkMode);
    
    // 保存设置
    await saveSettings({ ...settings, darkMode: newDarkMode });
    console.log('Settings saved');
  }

  async function refreshWords() {
    const allWords = await db.getAllWords();
    setWords(allWords);
  }

  async function addWord(word: Word) {
    await db.addWord(word);
    await refreshWords();
  }

  async function updateWord(word: Word) {
    await db.updateWord(word);
    await refreshWords();
  }

  async function deleteWord(id: string) {
    await db.deleteWord(id);
    await refreshWords();
  }

  async function saveSettings(newSettings: AppSettings) {
    await db.saveSettings(newSettings);
    setSettings(newSettings);
  }

  function getStats(): ReviewStats {
    const now = Date.now();
    const dueToday = words.filter(w => w.nextReviewAt <= now).length;
    const mastered = words.filter(w => w.interval >= 30).length;
    const learning = words.filter(w => w.interval < 30 && w.reviewCount > 0).length;

    return {
      total: words.length,
      dueToday,
      mastered,
      learning,
    };
  }

  return (
    <AppContext.Provider
      value={{
        words,
        settings,
        isLoading,
        refreshWords,
        addWord,
        updateWord,
        deleteWord,
        saveSettings,
        getStats,
        toggleDarkMode,
        isDarkMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
