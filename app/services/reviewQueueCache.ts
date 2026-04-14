import type { Word } from '../types';

interface ReviewQueueCache {
  queue: Word[];
  currentIndex: number;
  reviewDate: string;
  userId: string;
  maxDailyReviews: number;
  studyMode: string;
  primaryWordBookId?: string | null;
}

const CACHE_KEY_PREFIX = 'review-queue-cache-v1';

/**
 * 获取缓存键
 */
function getCacheKey(userId: string, date: string): string {
  return `${CACHE_KEY_PREFIX}-${userId}-${date}`;
}

/**
 * 从 LocalStorage 获取缓存
 */
export function getLocalCache(userId: string, date: string): ReviewQueueCache | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = getCacheKey(userId, date);
    const cached = localStorage.getItem(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Error reading local cache:', error);
  }
  return null;
}

/**
 * 保存缓存到 LocalStorage
 */
export function setLocalCache(cache: ReviewQueueCache): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getCacheKey(cache.userId, cache.reviewDate);
    localStorage.setItem(key, JSON.stringify(cache));
    
    // 清理旧缓存（保留最近7天）
    cleanupOldCaches(cache.userId, cache.reviewDate);
  } catch (error) {
    console.error('Error saving local cache:', error);
  }
}

/**
 * 清理旧缓存
 */
function cleanupOldCaches(userId: string, currentDate: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const prefix = `${CACHE_KEY_PREFIX}-${userId}-`;
    const sevenDaysAgo = new Date(currentDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const dateStr = key.replace(prefix, '');
        const cacheDate = new Date(dateStr);
        if (cacheDate < sevenDaysAgo) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old caches:', error);
  }
}

/**
 * 从服务端获取缓存
 */
export async function fetchServerCache(
  userId: string,
  date: string,
  maxDailyReviews: number,
  studyMode: string,
  primaryWordBookId?: string | null
): Promise<{ queue: Word[]; currentIndex: number; isNew: boolean } | null> {
  try {
    const params = new URLSearchParams({
      userId,
      date,
      maxDailyReviews: String(maxDailyReviews),
      studyMode,
    });
    
    if (primaryWordBookId) {
      params.set('primaryWordBookId', primaryWordBookId);
    }
    
    const response = await fetch(`/api/review-queue?${params}`);
    
    // 如果服务端返回 501 (Not Implemented) 或 404，说明数据库函数不存在，优雅降级
    if (response.status === 501 || response.status === 404) {
      console.warn('Server cache not available, falling back to local cache');
      return null;
    }
    
    if (!response.ok) {
      console.error('Error fetching server cache:', await response.text());
      return null;
    }
    
    const data = await response.json();
    return {
      queue: data.queue || [],
      currentIndex: data.currentIndex || 0,
      isNew: data.isNew ?? true,
    };
  } catch (error) {
    console.error('Error fetching server cache:', error);
    return null;
  }
}

/**
 * 保存缓存到服务端
 */
export async function saveServerCache(cache: ReviewQueueCache): Promise<boolean> {
  try {
    const response = await fetch('/api/review-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: cache.userId,
        reviewDate: cache.reviewDate,
        queueData: cache.queue,
        currentIndex: cache.currentIndex,
        maxDailyReviews: cache.maxDailyReviews,
        studyMode: cache.studyMode,
        primaryWordBookId: cache.primaryWordBookId,
      }),
    });
    
    // 如果服务端返回 501 (Not Implemented) 或 404，说明数据库函数不存在，优雅降级
    if (response.status === 501 || response.status === 404) {
      console.warn('Server cache not available, falling back to local cache only');
      return false;
    }
    
    return response.ok;
  } catch (error) {
    console.error('Error saving server cache:', error);
    return false;
  }
}

/**
 * 更新服务端进度
 */
export async function updateServerProgress(
  userId: string,
  date: string,
  currentIndex: number
): Promise<boolean> {
  try {
    const response = await fetch('/api/review-queue', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        reviewDate: date,
        currentIndex,
      }),
    });
    
    // 如果服务端返回 501 (Not Implemented) 或 404，说明数据库函数不存在，优雅降级
    if (response.status === 501 || response.status === 404) {
      console.warn('Server progress update not available, using local cache only');
      return false;
    }
    
    return response.ok;
  } catch (error) {
    console.error('Error updating server progress:', error);
    return false;
  }
}

/**
 * 获取复习队列（优先从缓存获取，支持跨设备同步）
 * 
 * 策略：
 * 1. 先检查 LocalStorage 缓存
 * 2. 如果本地缓存有效，直接使用
 * 3. 如果本地缓存无效或过期，从服务端获取
 * 4. 如果服务端也没有，返回 null（需要生成新队列）
 */
export async function getReviewQueue(
  userId: string,
  date: string,
  maxDailyReviews: number,
  studyMode: string,
  primaryWordBookId?: string | null
): Promise<{ queue: Word[]; currentIndex: number; fromCache: boolean; paramsChanged?: boolean } | null> {
  // 1. 检查本地缓存
  const localCache = getLocalCache(userId, date);
  
  if (localCache) {
    // 检查缓存参数是否匹配
    const paramsMatch =
      localCache.maxDailyReviews === maxDailyReviews &&
      localCache.studyMode === studyMode &&
      localCache.primaryWordBookId === primaryWordBookId;
    
    if (paramsMatch && localCache.queue.length > 0) {
      console.log('Using local cache for review queue');
      return {
        queue: localCache.queue,
        currentIndex: localCache.currentIndex,
        fromCache: true,
      };
    }
    
    // 参数不匹配但缓存存在（学习模式切换），保留进度但标记参数变化
    if (localCache.queue.length > 0) {
      console.log('Study mode changed, preserving progress but will regenerate queue');
      return {
        queue: localCache.queue,
        currentIndex: localCache.currentIndex,
        fromCache: true,
        paramsChanged: true,
      };
    }
  }
  
  // 2. 从服务端获取缓存
  const serverCache = await fetchServerCache(
    userId,
    date,
    maxDailyReviews,
    studyMode,
    primaryWordBookId
  );
  
  if (serverCache && !serverCache.isNew && serverCache.queue.length > 0) {
    console.log('Using server cache for review queue');
    
    // 保存到本地缓存
    setLocalCache({
      queue: serverCache.queue,
      currentIndex: serverCache.currentIndex,
      reviewDate: date,
      userId,
      maxDailyReviews,
      studyMode,
      primaryWordBookId,
    });
    
    return {
      queue: serverCache.queue,
      currentIndex: serverCache.currentIndex,
      fromCache: true,
    };
  }
  
  // 3. 没有有效缓存，需要生成新队列
  return null;
}

/**
 * 保存复习队列到缓存（本地 + 服务端）
 */
export async function saveReviewQueue(
  queue: Word[],
  currentIndex: number,
  userId: string,
  date: string,
  maxDailyReviews: number,
  studyMode: string,
  primaryWordBookId?: string | null
): Promise<void> {
  const cache: ReviewQueueCache = {
    queue,
    currentIndex,
    reviewDate: date,
    userId,
    maxDailyReviews,
    studyMode,
    primaryWordBookId,
  };
  
  // 保存到本地
  setLocalCache(cache);
  
  // 保存到服务端（异步，不阻塞）
  saveServerCache(cache).catch(console.error);
}

/**
 * 更新复习进度
 */
export async function updateReviewProgress(
  userId: string,
  date: string,
  currentIndex: number
): Promise<void> {
  // 更新本地缓存
  const localCache = getLocalCache(userId, date);
  if (localCache) {
    localCache.currentIndex = currentIndex;
    setLocalCache(localCache);
  }
  
  // 更新服务端（异步，不阻塞）
  updateServerProgress(userId, date, currentIndex).catch(console.error);
}
