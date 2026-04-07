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
