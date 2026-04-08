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
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : null;
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
  
  // 正则匹配：英文单词序列或中文/标点/数字序列
  const regex = /([a-zA-Z]+(?:[''-][a-zA-Z]+)*\s*)+|([^a-zA-Z]+)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const englishPart = match[1];
    const nonEnglishPart = match[2];
    
    if (englishPart && englishPart.trim()) {
      // 英文部分应用 Bionic Reading
      parts.push({
        type: 'bionic',
        content: applyBionicReading(englishPart)
      });
    } else if (nonEnglishPart) {
      // 中文、标点、数字等保持不变
      parts.push({
        type: 'normal',
        content: nonEnglishPart
      });
    }
  }
  
  return parts;
}
