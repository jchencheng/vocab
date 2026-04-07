export const DEFAULT_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;
export const FIRST_INTERVAL = 1;
export const SECOND_INTERVAL = 6;
export const DEFAULT_MAX_DAILY_REVIEWS = 50;
export const MASTERED_INTERVAL_THRESHOLD = 30;

export const DB_NAME = 'VocabDB';
export const DB_VERSION = 1;
export const STORE_WORDS = 'words';
export const STORE_SETTINGS = 'settings';
export const STORE_CONTEXTS = 'contexts';

export const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';

export const TABS = [
  { id: 'add', label: 'Add Word', icon: '➕' },
  { id: 'words', label: 'Word List', icon: '📚' },
  { id: 'review', label: 'Review', icon: '🎯' },
  { id: 'ai', label: 'AI Memory', icon: '🤖' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
] as const;

export const QUALITY_LABELS = [
  'Complete blackout',
  '',
  '',
  '',
  '',
  'Perfect recall',
] as const;
