import type { Meaning } from '../types';

interface WordEditorFormProps {
  word: string;
  phonetic: string;
  meanings: Meaning[];
  tags: string;
  note: string;
  onWordChange: (value: string) => void;
  onPhoneticChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onUpdateMeaning: (meaningIdx: number, field: 'partOfSpeech', value: string) => void;
  onUpdateDefinition: (meaningIdx: number, defIdx: number, field: 'definition' | 'example' | 'chineseDefinition', value: string) => void;
  onAddDefinition: (meaningIdx: number) => void;
  onRemoveDefinition: (meaningIdx: number, defIdx: number) => void;
  onAddMeaning: () => void;
  onRemoveMeaning?: (meaningIdx: number) => void;
  showGetDefinitions?: boolean;
  onGetDefinitions?: () => void;
  isLoading?: boolean;
  error?: string;
}

export function WordEditorForm({
  word,
  phonetic,
  meanings,
  tags,
  note,
  onWordChange,
  onPhoneticChange,
  onTagsChange,
  onNoteChange,
  onUpdateMeaning,
  onUpdateDefinition,
  onAddDefinition,
  onRemoveDefinition,
  onAddMeaning,
  onRemoveMeaning,
  showGetDefinitions,
  onGetDefinitions,
  isLoading,
  error,
}: WordEditorFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Word</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={word}
            onChange={(e) => onWordChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {showGetDefinitions && onGetDefinitions && (
            <button
              onClick={onGetDefinitions}
              disabled={isLoading || !word.trim()}
              className="px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity whitespace-nowrap"
            >
              {isLoading ? 'Getting...' : 'Get Definitions'}
            </button>
          )}
        </div>
        {error && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phonetic</label>
        <input
          type="text"
          value={phonetic}
          onChange={(e) => onPhoneticChange(e.target.value)}
          placeholder="e.g., /ˈæp.əl/"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma-separated)</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => onTagsChange(e.target.value)}
          placeholder="e.g., TOEFL, business, important"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meanings</label>
        {meanings.map((meaning, meaningIdx) => (
          <div key={meaningIdx} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Part of Speech
                </label>
                <input
                  type="text"
                  value={meaning.partOfSpeech}
                  onChange={(e) => onUpdateMeaning(meaningIdx, 'partOfSpeech', e.target.value)}
                  placeholder="e.g., noun, verb, adjective"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {onRemoveMeaning && meanings.length > 1 && (
                <button
                  onClick={() => onRemoveMeaning(meaningIdx)}
                  className="ml-3 p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="space-y-3">
              {meaning.definitions.map((def, defIdx) => (
                <div key={defIdx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Definition {defIdx + 1}
                    </label>
                    <textarea
                      value={def.definition}
                      onChange={(e) => onUpdateDefinition(meaningIdx, defIdx, 'definition', e.target.value)}
                      placeholder="Enter the definition"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Chinese Definition
                    </label>
                    <input
                      type="text"
                      value={def.chineseDefinition || ''}
                      onChange={(e) => onUpdateDefinition(meaningIdx, defIdx, 'chineseDefinition', e.target.value)}
                      placeholder="Enter the Chinese definition"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Example
                    </label>
                    <input
                      type="text"
                      value={def.example || ''}
                      onChange={(e) => onUpdateDefinition(meaningIdx, defIdx, 'example', e.target.value)}
                      placeholder="Enter an example sentence"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    {meaning.definitions.length > 1 && (
                      <button
                        onClick={() => onRemoveDefinition(meaningIdx, defIdx)}
                        className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      >
                        Remove Definition
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={() => onAddDefinition(meaningIdx)}
                className="w-full px-3 py-2 border border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
              >
                + Add Definition
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={onAddMeaning}
          className="w-full px-4 py-3 border border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          + Add Meaning
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custom Note</label>
        <textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Add your notes..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
    </div>
  );
}
