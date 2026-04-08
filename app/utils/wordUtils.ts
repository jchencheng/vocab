import type { Word, ReviewStats } from '../types';
import { MASTERED_INTERVAL_THRESHOLD } from '../constants';

export function getIntervalText(interval: number): string {
  if (interval === 0) return 'New';
  if (interval === 1) return '1 day';
  if (interval < 30) return `${interval} days`;
  if (interval < 365) return `${Math.round(interval / 30)} months`;
  return `${Math.round(interval / 365)} years`;
}

export function getChineseDefinition(word: Word): string {
  const defs = word.meanings.flatMap(m => 
    m.definitions.map((d: any) => d.chineseDefinition || d.definition)
  );
  return defs.slice(0, 3).join('; ');
}

export function getExampleSentence(word: Word): string | null {
  // 遍历所有 meanings 和 definitions，找到第一个有 example 的
  for (const meaning of word.meanings) {
    for (const def of meaning.definitions) {
      if (def.example && def.example.trim()) {
        return def.example;
      }
    }
  }
  return null;
}

export function calculateStats(words: Word[]): ReviewStats {
  const now = Date.now();
  const dueToday = words.filter(w => w.nextReviewAt <= now).length;
  const mastered = words.filter(w => w.interval >= MASTERED_INTERVAL_THRESHOLD).length;
  const learning = words.filter(w => w.interval < MASTERED_INTERVAL_THRESHOLD && w.reviewCount > 0).length;

  return {
    total: words.length,
    dueToday,
    mastered,
    learning,
  };
}

export function getAllTags(words: Word[]): string[] {
  return Array.from(new Set(words.flatMap(w => w.tags))).sort();
}

export function filterWords(
  words: Word[],
  searchQuery: string,
  selectedTag: string | null
): Word[] {
  let filtered = [...words];

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(w => w.word.toLowerCase().includes(query));
  }

  if (selectedTag) {
    filtered = filtered.filter(w => w.tags.includes(selectedTag));
  }

  return filtered.sort((a, b) => b.createdAt - a.createdAt);
}

export function playAudio(phonetics: Word['phonetics']): void {
  const audioUrl = phonetics?.find(p => p.audio)?.audio;
  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play().catch(console.error);
  }
}

export function hasAudio(phonetics: Word['phonetics']): boolean {
  return phonetics?.some(p => p.audio) ?? false;
}
