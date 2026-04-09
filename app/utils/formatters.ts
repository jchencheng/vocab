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

/**
 * 从文本中提取并修复JSON对象
 * 使用多阶段修复策略处理各种格式问题
 */
export function extractJsonFromText(text: string): string | null {
  // 阶段1：提取JSON对象
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }
  
  let jsonStr = jsonMatch[0];
  
  // 阶段2：预处理 - 修复常见的格式问题
  
  // 2.1 修复中文冒号（：）为英文冒号（:）
  jsonStr = jsonStr.replace(/(["\w])\s*：\s*/g, '$1: ');
  
  // 2.2 修复语音字段格式问题（将 /phonetic/ 转换为 "/phonetic/"）
  jsonStr = jsonStr.replace(/"phonetic":\s*(\/[^\/]+\/)/g, '"phonetic": "$1"');
  
  // 2.3 修复缺失的逗号（在字符串值后，下一个属性前）
  // 匹配："value"\n"key" 或 "value"  "key"
  jsonStr = jsonStr.replace(/("[^"]*")\s*\n\s*("\w+")/g, '$1,\n$2');
  jsonStr = jsonStr.replace(/("[^"]*")\s+("\w+")/g, '$1, $2');
  
  // 阶段3：使用字符扫描方式修复缺少引号的字符串值
  let result = '';
  let i = 0;
  
  while (i < jsonStr.length) {
    const char = jsonStr[i];
    
    // 检测属性名后的冒号
    if (char === ':' && i + 1 < jsonStr.length) {
      result += char;
      i++;
      
      // 跳过冒号后的空白字符
      while (i < jsonStr.length && /\s/.test(jsonStr[i])) {
        result += jsonStr[i];
        i++;
      }
      
      if (i >= jsonStr.length) break;
      
      const nextChar = jsonStr[i];
      
      // 如果值已经以引号开头，或者是对象/数组/数字/布尔值/null，则不需要处理
      if (nextChar === '"' || nextChar === '{' || nextChar === '[' || 
          /\d/.test(nextChar) || nextChar === '-' ||
          jsonStr.substring(i).startsWith('true') ||
          jsonStr.substring(i).startsWith('false') ||
          jsonStr.substring(i).startsWith('null')) {
        continue;
      }
      
      // 这是一个无引号的字符串值，需要添加引号
      const { value, endIndex } = extractUnquotedValue(jsonStr, i);
      result += '"' + value + '"';
      i = endIndex;
      continue;
    } else {
      result += char;
      i++;
    }
  }
  
  jsonStr = result;
  
  // 阶段4：后处理 - 修复剩余的格式问题
  
  // 4.1 修复可能的重复引号问题
  jsonStr = jsonStr.replace(/""/g, '"');
  
  // 4.2 修复JSON格式问题（添加缺失的逗号等）
  jsonStr = jsonStr.replace(/([}\]])(\s*)([{\[])/g, '$1,$2$3');
  jsonStr = jsonStr.replace(/([,{])(\s*)(})/g, '$1$2');
  
  // 4.3 修复属性之间缺失的逗号
  jsonStr = jsonStr.replace(/("\w+":\s*"[^"]*")\s*("\w+":)/g, '$1, $2');
  
  return jsonStr;
}

/**
 * 提取无引号的字符串值
 * 返回提取的值和结束位置
 */
function extractUnquotedValue(jsonStr: string, startIndex: number): { value: string; endIndex: number } {
  let i = startIndex;
  let parenDepth = 0;  // 圆括号深度
  let bracketDepth = 0;  // 方括号深度
  let braceDepth = 0;  // 花括号深度
  let inString = false;
  let valueEnd = startIndex;
  
  while (i < jsonStr.length) {
    const c = jsonStr[i];
    
    // 处理字符串内的引号
    if (c === '"' && (i === 0 || jsonStr[i-1] !== '\\')) {
      inString = !inString;
    }
    
    if (!inString) {
      // 跟踪各种括号的深度
      if (c === '(') {
        parenDepth++;
      } else if (c === ')') {
        parenDepth--;
      } else if (c === '[') {
        bracketDepth++;
      } else if (c === ']') {
        if (bracketDepth === 0 && parenDepth === 0 && braceDepth === 0) {
          valueEnd = i;
          break;
        }
        bracketDepth--;
      } else if (c === '{') {
        braceDepth++;
      } else if (c === '}') {
        if (bracketDepth === 0 && parenDepth === 0 && braceDepth === 0) {
          valueEnd = i;
          break;
        }
        braceDepth--;
      } else if (c === ',' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
        valueEnd = i;
        break;
      }
    }
    
    i++;
  }
  
  // 如果没有找到结束符，使用字符串末尾
  if (valueEnd === startIndex) {
    valueEnd = jsonStr.length;
  }
  
  const value = jsonStr.substring(startIndex, valueEnd).trim();
  return { value: value || '', endIndex: valueEnd };
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

export function getIntervalText(interval: number): string {
  const days = interval;
  if (days < 1) return '< 1d';
  if (days === 1) return '1d';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}m`;
  return `${Math.floor(days / 365)}y`;
}

export function playAudio(phonetics: any[]): void {
  const audioUrl = phonetics.find(p => p.audio)?.audio;
  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play().catch(err => console.error('Error playing audio:', err));
  }
}

export function hasAudio(phonetics: any[]): boolean {
  return phonetics.some(p => p.audio);
}
