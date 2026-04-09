export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

export function parseTags(tagsInput: string): string[] {
  return tagsInput
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

export function joinTags(tags: string[]): string {
  return tags.join(', ');
}

interface HighlightPart {
  type: 'highlight';
  word: string;
  definition: string | undefined;
}

interface TextPart {
  type: 'text';
  content: string;
}

type ContentPart = HighlightPart | TextPart;

export function formatContentWithHighlights(content: string): ContentPart[] {
  return content
    .split(/(\*\*[^*]+\*\*)/g)
    .map(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const innerContent = part.slice(2, -2);
        const [word, definition] = innerContent.split('（');
        return {
          type: 'highlight' as const,
          word,
          definition: definition ? `（${definition}` : undefined,
        };
      }
      return { type: 'text' as const, content: part };
    });
}

export function extractJsonFromText(text: string): string | null {
  // 尝试找到JSON对象
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }
  
  let jsonStr = jsonMatch[0];
  
  // 1. 先处理转义字符问题，避免后续处理时被干扰
  jsonStr = jsonStr.replace(/(["\\])/g, '\\$1');
  
  // 2. 修复语音字段格式问题（支持各种拼写和格式）
  // 处理 phonetic 字段
  jsonStr = jsonStr.replace(/"phonetic":\s*(\/[^\/]+\/)/g, '"phonetic": "$1"');
  // 处理 pronunciation 字段
  jsonStr = jsonStr.replace(/"pronunciation":\s*(\/[^\/]+\/)/g, '"pronunciation": "$1"');
  
  // 3. 修复所有可能的正则表达式格式值
  jsonStr = jsonStr.replace(/"([a-zA-Z_]+)":\s*(\/[^\/]+\/)/g, '"$1": "$2"');
  
  // 4. 确保所有字符串值都有引号
  jsonStr = jsonStr.replace(/([{,])\s*("[a-zA-Z_]+"\s*:\s*)([^"\s\{\}\[,\]\:])([^"\s\{\}\[,\]\:]*)(\s*[},])/g, '$1$2"$3$4"$5');
  
  // 5. 特别处理数字、布尔值和null
  jsonStr = jsonStr.replace(/"(\d+\.?\d*)"/g, '$1');
  jsonStr = jsonStr.replace(/"(true|false)"/g, '$1');
  jsonStr = jsonStr.replace(/"(null)"/g, '$1');
  
  // 6. 确保JSON格式正确（添加缺失的逗号等）
  jsonStr = jsonStr.replace(/([}\]])(\s*)([{\[])/g, '$1,$2$3');
  jsonStr = jsonStr.replace(/([,{])(\s*)(})/g, '$1$2');
  
  return jsonStr;
}

/**
 * Bionic Reading 处理函数
 * 将英文文本转换为 Bionic Reading 格式（单词前半部分加粗）
 * 保留中文和标点符号不变
 */
export function applyBionicReading(text: string): string {
  // 匹配英文单词（包含连字符和撇号）
  return text.replace(/[a-zA-Z]+(?:[''-][a-zA-Z]+)*/g, (word) => {
    if (word.length <= 1) return word;
    
    // 计算需要加粗的字符数（约前半部分，向上取整）
    const boldLength = Math.ceil(word.length * 0.5);
    const boldPart = word.slice(0, boldLength);
    const normalPart = word.slice(boldLength);
    
    return `<b>${boldPart}</b>${normalPart}`;
  });
}

/**
 * 将文本分割为需要处理和不需要处理的部分
 * 英文部分应用 Bionic Reading，中文和标点保持不变
 */
export function formatWithBionicReading(text: string): Array<{ type: 'bionic' | 'normal'; content: string }> {
  const parts: Array<{ type: 'bionic' | 'normal'; content: string }> = [];
  
  // 使用更简单的方法：逐个字符扫描
  let currentPart = '';
  let isCurrentEnglish = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    // 检查字符是否是英文字母、连字符或撇号
    const isEnglish = /[a-zA-Z'\-]/.test(char);
    
    if (i === 0) {
      // 第一个字符
      currentPart = char;
      isCurrentEnglish = isEnglish;
    } else if (isEnglish === isCurrentEnglish) {
      // 同类型字符，继续累积
      currentPart += char;
    } else {
      // 类型变化，保存当前部分
      if (currentPart) {
        parts.push({
          type: isCurrentEnglish ? 'bionic' : 'normal',
          content: isCurrentEnglish ? applyBionicReading(currentPart) : currentPart
        });
      }
      // 开始新部分
      currentPart = char;
      isCurrentEnglish = isEnglish;
    }
  }
  
  // 保存最后一部分
  if (currentPart) {
    parts.push({
      type: isCurrentEnglish ? 'bionic' : 'normal',
      content: isCurrentEnglish ? applyBionicReading(currentPart) : currentPart
    });
  }
  
  return parts;
}
