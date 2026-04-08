'use client';

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
  onPlayAudio?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  isSaveDisabled?: boolean;
  title?: string;
  subtitle?: string;
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
  onPlayAudio,
  onCancel,
  onSave,
  isSaveDisabled,
  title,
  subtitle,
}: WordEditorFormProps) {
  return (
    <div className="bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-medium border border-slate-200/50 dark:border-slate-700/50 p-6 sm:p-8 animate-slide-up">
      {(title || subtitle) && (
        <div className="flex items-start justify-between mb-6 sm:mb-8">
          <div className="flex-1">
            {title && <h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>}
            {subtitle && <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">{subtitle}</p>}
          </div>
          {onPlayAudio && (
            <button
              onClick={onPlayAudio}
              className="ml-3 p-3 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-2xl hover:bg-primary-200 dark:hover:bg-primary-800/30 transition-colors flex-shrink-0 shadow-soft"
            >
              🔊
            </button>
          )}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Word</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={word}
              onChange={(e) => onWordChange(e.target.value)}
              className="flex-1 px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-slate-400"
            />
            {showGetDefinitions && onGetDefinitions && (
              <button
                onClick={onGetDefinitions}
                disabled={isLoading || !word.trim()}
                className="px-5 py-3.5 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-soft whitespace-nowrap"
              >
                {isLoading ? 'Getting...' : 'Get Definitions'}
              </button>
            )}
          </div>
          {error && (
            <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
              <span>⚠️</span>
              {error}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Phonetic</label>
          <input
            type="text"
            value={phonetic}
            onChange={(e) => onPhoneticChange(e.target.value)}
            placeholder="e.g., /ˈæp.əl/"
            className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tags (comma-separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => onTagsChange(e.target.value)}
            placeholder="e.g., TOEFL, business, important"
            className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Meanings</label>
          {meanings.map((meaning, meaningIdx) => (
            <div key={meaningIdx} className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-5 mb-5 border border-slate-200/50 dark:border-slate-600/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Part of Speech
                  </label>
                  <input
                    type="text"
                    value={meaning.partOfSpeech}
                    onChange={(e) => onUpdateMeaning(meaningIdx, 'partOfSpeech', e.target.value)}
                    placeholder="e.g., noun, verb, adjective"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>
                {onRemoveMeaning && meanings.length > 1 && (
                  <button
                    onClick={() => onRemoveMeaning(meaningIdx)}
                    className="ml-4 p-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {meaning.definitions.map((def, defIdx) => (
                  <div key={defIdx} className="border border-slate-200 dark:border-slate-600 rounded-xl p-4 bg-white dark:bg-slate-800">
                    <div className="mb-3">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        Definition {defIdx + 1}
                      </label>
                      <textarea
                        value={def.definition}
                        onChange={(e) => onUpdateDefinition(meaningIdx, defIdx, 'definition', e.target.value)}
                        placeholder="Enter the definition"
                        rows={2}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        Chinese Definition
                      </label>
                      <input
                        type="text"
                        value={def.chineseDefinition || ''}
                        onChange={(e) => onUpdateDefinition(meaningIdx, defIdx, 'chineseDefinition', e.target.value)}
                        placeholder="Enter the Chinese definition"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        Example
                      </label>
                      <input
                        type="text"
                        value={def.example || ''}
                        onChange={(e) => onUpdateDefinition(meaningIdx, defIdx, 'example', e.target.value)}
                        placeholder="Enter an example sentence"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="flex justify-end">
                      {meaning.definitions.length > 1 && (
                        <button
                          onClick={() => onRemoveDefinition(meaningIdx, defIdx)}
                          className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 font-medium"
                        >
                          Remove Definition
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => onAddDefinition(meaningIdx)}
                  className="w-full px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-sm font-medium"
                >
                  + Add Definition
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={onAddMeaning}
            className="w-full px-5 py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors font-medium"
          >
            + Add Meaning
          </button>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Custom Note</label>
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Add your notes..."
            rows={4}
            className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
          />
        </div>
      </div>

      {(onCancel || onSave) && (
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-4 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shadow-soft"
            >
              Cancel
            </button>
          )}
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaveDisabled}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-soft hover:shadow-medium active:scale-[0.98]"
            >
              Add to Vocabulary
            </button>
          )}
        </div>
      )}
    </div>
  );
}
