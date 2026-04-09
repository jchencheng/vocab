/**
 * 百度通用文本翻译 API 服务（通过后端代理）
 * 文档: https://fanyi-api.baidu.com/product/11
 * 
 * 注意：百度翻译标准版 QPS 限制为 1
 * 优化：使用批量翻译接口，多个query用 \n 连接，一次调用翻译多个文本
 */

/**
 * 使用本地 API 路由翻译单个文本
 * @param text 要翻译的文本
 * @param from 源语言，默认为 'en'（英语）
 * @param to 目标语言，默认为 'zh'（中文）
 * @returns 翻译结果
 */
export async function translateWithBaidu(
  text: string,
  from: string = 'en',
  to: string = 'zh'
): Promise<string> {
  if (!text || text.trim() === '') {
    return '';
  }

  try {
    const results = await batchTranslateWithBaidu([text], from, to);
    return results[0] || '';
  } catch (error) {
    console.error('[Baidu Translate] Error:', error);
    throw error;
  }
}

/**
 * 批量翻译多个文本（使用 \n 连接，一次API调用）
 * @param texts 要翻译的文本数组
 * @param from 源语言，默认为 'en'（英语）
 * @param to 目标语言，默认为 'zh'（中文）
 * @returns 翻译结果数组
 */
export async function batchTranslateWithBaidu(
  texts: string[],
  from: string = 'en',
  to: string = 'zh'
): Promise<string[]> {
  if (texts.length === 0) {
    return [];
  }

  // 过滤空文本
  const validTexts = texts.filter(t => t && t.trim() !== '');
  if (validTexts.length === 0) {
    return texts.map(() => '');
  }

  console.log('[Baidu Translate] Batch request:', {
    count: validTexts.length,
    texts: validTexts.map(t => t.substring(0, 30) + (t.length > 30 ? '...' : '')),
    from,
    to,
  });

  try {
    // 调用批量翻译 API 路由
    const response = await fetch('/api/translate/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: validTexts,
        from,
        to,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    console.log('[Baidu Translate] Batch response:', {
      from: data.from,
      to: data.to,
      resultCount: data.translations?.length || 0,
    });

    return data.translations || [];
  } catch (error) {
    console.error('[Baidu Translate] Batch error:', error);
    throw error;
  }
}

/**
 * 批量翻译多个定义
 * @param definitions 要翻译的定义数组
 * @returns 翻译后的结果数组
 */
export async function batchTranslateDefinitions(
  definitions: { definition: string; example?: string }[]
): Promise<{ definition: string; example?: string; chineseDefinition: string }[]> {
  if (definitions.length === 0) {
    return [];
  }

  console.log('[Baidu Translate] Translating', definitions.length, 'definitions in one batch');

  // 准备要翻译的文本数组 - 只翻译 definition，不翻译 example
  const textsToTranslate = definitions.map(def => def.definition);

  try {
    // 一次性批量翻译所有文本
    const translations = await batchTranslateWithBaidu(textsToTranslate, 'en', 'zh');

    // 将翻译结果映射回原始定义
    const results = definitions.map((def, index) => ({
      definition: def.definition,
      example: def.example || '',
      chineseDefinition: translations[index] || '',
    }));

    console.log('[Baidu Translate] Batch translation completed');
    return results;
  } catch (error) {
    console.error('[Baidu Translate] Batch translation failed:', error);
    // 如果批量翻译失败，返回空翻译
    return definitions.map(def => ({
      definition: def.definition,
      example: def.example || '',
      chineseDefinition: '',
    }));
  }
}

/**
 * 检查百度翻译 API 配置是否有效
 * 通过调用本地 API 路由检查配置状态
 */
export async function isBaiduTranslateConfigured(): Promise<boolean> {
  try {
    const response = await fetch('/api/translate/config', {
      method: 'GET',
    });
    if (response.ok) {
      const data = await response.json();
      return data.configured;
    }
    return false;
  } catch {
    // 如果配置检查端点不存在，尝试直接翻译一个测试文本
    try {
      await translateWithBaidu('test');
      return true;
    } catch (error: any) {
      return !error.message?.includes('配置缺失');
    }
  }
}

/**
 * 同步检查百度翻译 API 配置状态（用于快速检查）
 * 注意：此函数仅检查环境变量是否存在，不验证配置有效性
 */
export function isBaiduTranslateConfiguredSync(): boolean {
  // 在客户端无法直接访问 process.env
  // 返回 true 让实际请求时处理错误
  return true;
}

/**
 * 获取百度翻译 API 配置状态信息
 */
export function getBaiduTranslateConfigStatus(): {
  configured: boolean;
  appId: string;
  hasSecretKey: boolean;
} {
  return {
    configured: true, // 由后端检查
    appId: '由后端配置',
    hasSecretKey: true,
  };
}
