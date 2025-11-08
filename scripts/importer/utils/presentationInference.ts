// Presentation metadata inference utilities

import type { 
  VersePresentationMetadata, 
  LayoutType,
  RawVerseData,
  RawSectionData
} from "../types";

export function inferPresentation(
  verse: RawVerseData,
  section: RawSectionData,
  verseNumber: number
): VersePresentationMetadata {
  // Detect layout type
  const layoutType = detectLayoutType(verse.text, section.type);
  
  // Detect paragraph boundaries
  const paragraphStart = verse.isParagraphStart || verse.text.startsWith('¶');
  const paragraphEnd = verse.isParagraphEnd || false;
  
  // Detect indentation (poetry, nested quotes)
  const indentLevel = detectIndentLevel(verse.text, layoutType);
  
  // Determine verse number display
  const verseNumberDisplay = layoutType === 'poetry' && indentLevel > 0
    ? 'hidden'
    : 'inline';
  
  return {
    paragraphStart,
    paragraphEnd,
    sectionStart: verseNumber === (section.startVerse || 1),
    layoutType,
    indentLevel,
    verseNumberDisplay,
    speaker: verse.speaker || undefined,
    styleHints: extractStyleHints(verse),
  };
}

function detectLayoutType(text: string, sectionType?: string): LayoutType {
  if (sectionType === 'poetry' || sectionType === 'psalm') {
    return 'poetry';
  }
  
  if (text.includes('"') || text.includes('"')) {
    return 'quotation';
  }
  
  if (text.match(/^\d+\./)) {
    return 'list';
  }
  
  return 'prose';
}

function detectIndentLevel(text: string, layoutType: LayoutType): number {
  if (layoutType !== 'poetry') return 0;
  
  // Count leading spaces or detect poetry markers
  const leadingSpaces = text.match(/^\s*/)?.[0].length || 0;
  return Math.floor(leadingSpaces / 2);
}

function extractStyleHints(verse: RawVerseData): string[] {
  const hints: string[] = [];
  
  if (verse.class?.includes('divine-name')) {
    hints.push('divine-name');
  }
  
  if (verse.emphasis) {
    hints.push('emphasis');
  }
  
  return hints;
}

