// 服务端组件 - 负责数据获取
import {
  fetchDashboardStatsServer,
  fetchRecentWordsServer,
  fetchSettingsServer,
} from '../services/serverData';
import { DashboardClient } from './DashboardClient';
import { DashboardSkeleton } from './DashboardSkeleton';

interface DashboardServerProps {
  userId: string;
  onViewChange: (view: 'list' | 'add' | 'wordbooks' | 'review' | 'settings' | 'ai-memory') => void;
}

export async function DashboardServer({ userId, onViewChange }: DashboardServerProps) {
  // 并行获取所有数据
  const [stats, recentWords, settings] = await Promise.all([
    fetchDashboardStatsServer(userId),
    fetchRecentWordsServer(userId, 10),
    fetchSettingsServer(userId),
  ]);

  // 转换最近单词数据格式
  const formattedRecentWords = recentWords.map((word) => ({
    id: word.id,
    word: word.word,
    phonetic: word.phonetic,
    createdAt: word.createdAt,
  }));

  // 准备统计数据
  const dashboardStats = {
    ...stats,
    streak: 0, // 暂时无法获取，需要额外的 API
  };

  return (
    <DashboardClient
      onViewChange={onViewChange}
      initialStats={dashboardStats}
      initialRecentWords={formattedRecentWords}
      initialSettings={settings || { maxDailyReviews: 20, darkMode: false, studyMode: 'book-priority', primaryWordBookId: null }}
    />
  );
}

// 加载状态组件
export { DashboardSkeleton };
