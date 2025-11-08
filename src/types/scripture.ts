// Scripture Type Definitions

export interface TextToken {
  id: string;
  text: string;
  position: number;
  verseId: string;
  presentation: {
    emphasis?: 'italic' | 'bold' | 'small-caps' | 'red-letter';
    semanticType?: 'divine-name' | 'proper-noun' | 'quotation';
    precedingPunctuation?: string;
    followingPunctuation?: string;
  };
}

export interface Verse {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  tokens: TextToken[];
  presentation?: {
    paragraphStart?: boolean;
    paragraphEnd?: boolean;
    sectionStart?: boolean;
    layoutType?: 'prose' | 'poetry' | 'quotation' | 'list';
    indentLevel?: number;
    verseNumberDisplay?: 'inline' | 'superscript' | 'margin' | 'hidden';
  };
}

export interface Chapter {
  id: string;
  book: string;
  chapter: number;
  translation: string;
  heading: {
    summary: string;
    topics: string[];
  };
  sections: Array<{
    id: string;
    startVerse: number;
    endVerse: number;
    heading: string;
  }>;
  verses: Verse[];
  presentation?: {
    displayHeading?: boolean;
    twoColumn?: boolean;
    chapterNumberDisplay?: 'standard' | 'decorative' | 'hidden';
  };
}

export interface Book {
  id: string;
  name: string;
  category: string;
  chapters: number;
}

export interface Translation {
  id: string;
  name: string;
  abbreviation: string;
  language: string;
  copyright: string;
  books: Book[];
}

export interface ScriptureManifest {
  version: string;
  translations: Translation[];
}

export interface TranslationManifest {
  id: string;
  name: string;
  abbreviation: string;
  language: string;
  copyright: string;
  books: Book[];
}

