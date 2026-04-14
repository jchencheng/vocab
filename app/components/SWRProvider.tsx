'use client';

import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';

// 全局 SWR 配置
const swrConfig = {
  // 错误重试策略
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  
  // 数据刷新策略
  refreshInterval: 0, // 默认不自动刷新
  revalidateOnFocus: true, // 窗口聚焦时重新验证
  revalidateOnReconnect: true, // 网络恢复时重新验证
  revalidateIfStale: true, // 使用缓存数据时后台更新
  
  // 去重策略
  dedupingInterval: 5000, // 5秒内相同请求去重
  
  // 错误处理
  onError: (error: Error, key: string) => {
    console.error(`SWR Error [${key}]:`, error);
  },
  
  // 数据比较函数
  compare: (a: any, b: any) => {
    return JSON.stringify(a) === JSON.stringify(b);
  },
};

interface SWRProviderProps {
  children: ReactNode;
  fallback?: Record<string, any>;
}

export function SWRProvider({ children, fallback }: SWRProviderProps) {
  return (
    <SWRConfig 
      value={{
        ...swrConfig,
        fallback,
      }}
    >
      {children}
    </SWRConfig>
  );
}
