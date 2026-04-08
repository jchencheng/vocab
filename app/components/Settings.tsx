'use client';

import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';

export function Settings() {
  const { settings, saveSettings, words, addWord } = useApp();
  const [maxDailyReviews, setMaxDailyReviews] = useState(settings.maxDailyReviews || 50);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveSettings({
        ...settings,
        maxDailyReviews,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  }, [maxDailyReviews, settings, saveSettings]);

  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(words, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vocab-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [words]);

  const handleImport = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedWords = JSON.parse(e.target?.result as string);
        for (const word of importedWords) {
          await addWord(word);
        }
        window.location.reload();
      } catch (err) {
        alert('Failed to import file. Please check the JSON format.');
      }
    };
    reader.readAsText(file);
  }, [addWord]);

  return (
    <div className="max-w-3xl mx-auto p-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Settings</h2>
        <p className="text-gray-600 dark:text-gray-400">Configure your preferences and manage data</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Review Settings</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Maximum Daily Reviews
          </label>
          <input
            type="number"
            min="1"
            max="200"
            value={maxDailyReviews}
            onChange={(e) => setMaxDailyReviews(parseInt(e.target.value) || 50)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Maximum number of words to review per day
          </p>
        </div>

        {saveSuccess && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-sm">
            Settings saved successfully!
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Data Management</h3>
        
        <div className="space-y-4">
          <div>
            <button
              onClick={handleExport}
              className="w-full py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Export Data (JSON)
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Import Data
            </label>
            <input
              type="file"
              accept=".json"
              onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">About</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>📖 VocabMaster - Your Personal Vocabulary Book</p>
          <p>All data is securely stored in the cloud using Supabase.</p>
          <p>Your data is synchronized across devices and never lost.</p>
        </div>
      </div>
    </div>
  );
}
