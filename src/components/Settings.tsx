import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { DEFAULT_MAX_DAILY_REVIEWS } from '../constants';

export function Settings() {
  const { settings, saveSettings, words, addWord } = useApp();
  const [maxDailyReviews, setMaxDailyReviews] = useState(settings.maxDailyReviews || DEFAULT_MAX_DAILY_REVIEWS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveSettings({
        maxDailyReviews: maxDailyReviews || undefined,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  }, [maxDailyReviews, saveSettings]);

  const handleExport = useCallback(() => {
    const data = JSON.stringify(words, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocab-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
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

      <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Review Settings</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Configure your review preferences.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Daily Reviews
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={maxDailyReviews}
              onChange={(e) => setMaxDailyReviews(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Set the maximum number of words to review per day (1-100)
            </p>
          </div>

          {saveSuccess && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 animate-fade-in">
              ✅ Settings saved successfully!
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Data Management</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Export or import your vocabulary data.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleExport}
            disabled={words.length === 0}
            className="px-6 py-4 border-2 border-blue-500 text-blue-600 rounded-xl font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <div className="text-2xl mb-1">📤</div>
            <div>Export Data</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{words.length} words</div>
          </button>

          <label className="px-6 py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors text-center">
            <div className="text-2xl mb-1">📥</div>
            <div>Import Data</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">JSON file</div>
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl shadow-lg border border-gray-200 p-6">
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
