# Scripture Data Structure & Import Strategy

This document defines the data structure for scripture text with presentation metadata and strategies for importing from various sources.

## Table of Contents

- [Visual Presentation Data Model](#visual-presentation-data-model)
- [Scripture Import Sources](#scripture-import-sources)
- [Import Pipeline](#import-pipeline)
- [Tokenization Strategy](#tokenization-strategy)
- [Storage Format](#storage-format)

## Visual Presentation Data Model

### Extended Data Structures

```typescript
// Extended verse structure with presentation metadata
interface Verse {
  id: string;                    // "gen.1.1"
  book: string;                  // "genesis"
  chapter: number;               // 1
  verse: number;                 // 1
  tokens: TextToken[];           // Word-level tokens
  translation: string;           // "KJV", "ESV", "BookOfMormon"
  
  // Presentation metadata
  presentation: VersePresentationMetadata;
}

interface VersePresentationMetadata {
  // Structural
  paragraphStart?: boolean;      // True if verse starts a new paragraph
  paragraphEnd?: boolean;        // True if verse ends a paragraph
  sectionStart?: boolean;        // True if verse starts a new section
  
  // Layout
  layoutType: LayoutType;        // "prose" | "poetry" | "list" | "quotation"
  indentLevel: number;           // 0-5 (for poetry, nested quotes, etc.)
  
  // Typography
  verseNumberDisplay: VerseNumberDisplay; // How to show verse number
  
  // Context
  speaker?: string;              // "Jesus", "Peter", etc. (for red-letter or speaker identification)
  
  // Custom styling hints
  styleHints?: string[];         // ["divine-name", "emphasis", "inscription"]
}

type LayoutType = 
  | "prose"           // Normal paragraph text
  | "poetry"          // Poetic structure (Psalms, etc.)
  | "list"            // List items
  | "quotation"       // Quoted speech
  | "letter-opening"  // Epistle salutations
  | "letter-closing"; // Epistle signatures

type VerseNumberDisplay =
  | "inline"          // (1) Normal inline display
  | "superscript"     // ¹ Superscript number
  | "margin"          // Number in margin
  | "hidden";         // Hide verse number (for poetry continuation)

interface Chapter {
  id: string;                    // "gen.1"
  book: string;                  // "genesis"
  chapter: number;               // 1
  translation: string;           // "KJV"
  
  // Chapter metadata
  heading?: ChapterHeading;
  sections: Section[];           // Sections within chapter
  verses: Verse[];               // All verses
  
  // Chapter-level presentation
  presentation: ChapterPresentationMetadata;
}

interface ChapterHeading {
  summary: string;               // "The Creation" (brief summary)
  description?: string;          // Longer description (optional)
  topics?: string[];             // ["creation", "light", "darkness"]
}

interface Section {
  id: string;                    // "gen.1.section-1"
  startVerse: number;            // 1
  endVerse: number;              // 5
  heading: string;               // "The First Day"
  subheading?: string;           // Additional context
}

interface ChapterPresentationMetadata {
  displayHeading: boolean;       // Show/hide chapter heading
  twoColumn: boolean;            // Poetry often uses two columns
  chapterNumberDisplay: "standard" | "decorative" | "hidden";
}

interface Book {
  id: string;                    // "genesis"
  name: string;                  // "Genesis"
  fullName: string;              // "The First Book of Moses, called Genesis"
  abbreviation: string;          // "Gen"
  testament?: Testament;         // "old" | "new" (for Bible)
  category: BookCategory;        // Genre/type
  chapters: Chapter[];
  
  // Book metadata
  metadata: BookMetadata;
}

type Testament = "old" | "new";

type BookCategory = 
  | "law"              // Torah/Pentateuch
  | "history"          // Historical books
  | "wisdom"           // Wisdom literature
  | "prophets-major"   // Major prophets
  | "prophets-minor"   // Minor prophets
  | "gospels"          // Four gospels
  | "acts"             // Acts of the Apostles
  | "epistles-paul"    // Pauline epistles
  | "epistles-general" // General epistles
  | "apocalyptic"      // Revelation
  | "bom-book";        // Book of Mormon book

interface BookMetadata {
  author?: string;
  dateWritten?: string;
  audience?: string;
  purpose?: string;
  themes: string[];
  chapterCount: number;
  verseCount: number;
}
```

### Token Structure with Presentation

```typescript
interface TextToken {
  id: string;                    // "gen.1.1.3"
  text: string;                  // "beginning"
  position: number;              // Position in verse
  verseId: string;               // "gen.1.1"
  
  // Linguistic data
  originalLanguage?: OriginalLanguageData;
  
  // Presentation
  presentation?: TokenPresentationMetadata;
}

interface OriginalLanguageData {
  text: string;                  // "בְּרֵאשִׁית" (Hebrew) or "Ἐν" (Greek)
  transliteration?: string;      // "bereshit" or "en"
  strongs?: string;              // "H7225" or "G1722"
  morphology?: string;           // "noun:feminine:singular"
  lemma?: string;                // Base form
}

interface TokenPresentationMetadata {
  // Special formatting
  emphasis?: EmphasisType;       // "italic" | "bold" | "small-caps"
  
  // Semantic hints
  semanticType?: SemanticType;   // "divine-name", "proper-noun", etc.
  
  // Typography
  case?: "upper" | "title" | "small-caps"; // For names of God, etc.
  
  // Punctuation context
  precedingPunctuation?: string; // "(" or "[" or """
  followingPunctuation?: string; // "," or "." or "?"
}

type EmphasisType = "italic" | "bold" | "small-caps" | "red-letter";

type SemanticType = 
  | "divine-name"      // LORD, Jehovah, YHWH
  | "proper-noun"      // Person or place names
  | "quotation"        // Quoted text
  | "added"            // Translator additions [in brackets]
  | "uncertain"        // Uncertain translation
  | "poetic-line";     // Poetry line marker
```

## Scripture Import Sources

### Book of Mormon

**Primary Source: churchofjesuschrist.org**

The Church of Jesus Christ provides structured scripture data:

```typescript
// services/BookOfMormonImporter.ts
import * as Effect from 'effect/Effect';

interface ChurchScriptureAPI {
  baseUrl: string;
  endpoint: (book: string, chapter: number) => string;
}

const CHURCH_API: ChurchScriptureAPI = {
  baseUrl: 'https://www.churchofjesuschrist.org',
  endpoint: (book, chapter) => 
    `/study/api/v3/language-pages/type/content?lang=eng&uri=/scriptures/bofm/${book}/${chapter}`
};

export class BookOfMormonImporter extends Effect.Service<BookOfMormonImporter>()(
  'BookOfMormonImporter',
  {
    effect: Effect.gen(function* () {
      
      const fetchChapter = (
        book: string,
        chapter: number
      ): Effect.Effect<RawScriptureData, HttpError> =>
        Effect.tryPromise({
          try: async () => {
            const url = CHURCH_API.baseUrl + CHURCH_API.endpoint(book, chapter);
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch');
            return response.json();
          },
          catch: (e) => new HttpError({ cause: e }),
        });
      
      const parseChurchData = (
        raw: RawScriptureData
      ): Effect.Effect<Chapter, ParseError> =>
        Effect.gen(function* () {
          // Extract chapter content
          const content = raw.content;
          const verses: Verse[] = [];
          
          // Parse sections and verses
          for (const section of content.sections || []) {
            const sectionHeading = section.title || '';
            
            for (const verse of section.verses || []) {
              const verseNumber = parseInt(verse.number);
              const verseId = `${book}.${chapter}.${verseNumber}`;
              
              // Tokenize verse text
              const tokens = yield* tokenizeText(verse.text, verseId);
              
              // Determine presentation metadata
              const presentation = inferPresentation(verse, section);
              
              verses.push({
                id: verseId,
                book,
                chapter,
                verse: verseNumber,
                tokens,
                translation: 'BookOfMormon',
                presentation,
              });
            }
          }
          
          // Extract chapter heading
          const heading: ChapterHeading | undefined = content.heading ? {
            summary: content.heading.summary || '',
            description: content.heading.description,
            topics: content.heading.topics || [],
          } : undefined;
          
          return {
            id: `${book}.${chapter}`,
            book,
            chapter,
            translation: 'BookOfMormon',
            heading,
            sections: extractSections(content),
            verses,
            presentation: {
              displayHeading: true,
              twoColumn: false,
              chapterNumberDisplay: 'standard',
            },
          };
        });
      
      return {
        fetchChapter,
        parseChurchData,
      } as const;
    }),
  }
) {}
```

**Book of Mormon Structure:**
```
Books: [
  "1-ne", "2-ne", "jacob", "enos", "jarom", "omni",
  "w-of-m", "mosiah", "alma", "hel", "3-ne", "4-ne",
  "morm", "ether", "moro"
]

Example URL:
https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/1?lang=eng
```

### Holy Bible

**Multiple Source Options:**

#### Option 1: ESV API (Recommended for ESV)

```typescript
// services/ESVImporter.ts
export class ESVImporter extends Effect.Service<ESVImporter>()(
  'ESVImporter',
  {
    effect: Effect.gen(function* () {
      const API_KEY = process.env.ESV_API_KEY || '';
      const BASE_URL = 'https://api.esv.org/v3/passage/text/';
      
      const fetchPassage = (
        reference: string // "Genesis 1"
      ): Effect.Effect<RawESVData, HttpError> =>
        Effect.tryPromise({
          try: async () => {
            const response = await fetch(
              `${BASE_URL}?q=${encodeURIComponent(reference)}&include-headings=true&include-footnotes=false`,
              {
                headers: {
                  'Authorization': `Token ${API_KEY}`,
                },
              }
            );
            if (!response.ok) throw new Error('ESV API error');
            return response.json();
          },
          catch: (e) => new HttpError({ cause: e }),
        });
      
      return { fetchPassage } as const;
    }),
  }
) {}
```

#### Option 2: Bible Gateway Scraper

```typescript
// services/BibleGatewayImporter.ts
export class BibleGatewayImporter extends Effect.Service<BibleGatewayImporter>()(
  'BibleGatewayImporter',
  {
    effect: Effect.gen(function* () {
      
      const fetchChapter = (
        book: string,
        chapter: number,
        version: string = 'NIV'
      ): Effect.Effect<string, HttpError> =>
        Effect.tryPromise({
          try: async () => {
            const url = `https://www.biblegateway.com/passage/?search=${book}+${chapter}&version=${version}`;
            const response = await fetch(url);
            return response.text();
          },
          catch: (e) => new HttpError({ cause: e }),
        });
      
      const parseHTML = (html: string): Effect.Effect<Chapter, ParseError> =>
        Effect.gen(function* () {
          // Parse HTML to extract verses
          // This would use a library like 'cheerio' or 'jsdom'
          // ... implementation
          return parsedChapter;
        });
      
      return {
        fetchChapter,
        parseHTML,
      } as const;
    }),
  }
) {}
```

#### Option 3: Open Bible Data (JSON)

Use pre-existing JSON datasets:

- **github.com/scrollmapper/bible_databases**: Multiple translations in JSON/SQL
- **github.com/thiagobodruk/bible**: Bible in JSON format
- **openbible.com**: Various APIs and data downloads

```typescript
// services/OpenBibleImporter.ts
export class OpenBibleImporter extends Effect.Service<OpenBibleImporter>()(
  'OpenBibleImporter',
  {
    effect: Effect.gen(function* () {
      
      const loadFromJSON = (
        filePath: string
      ): Effect.Effect<BibleData[], DatabaseError> =>
        Effect.tryPromise({
          try: async () => {
            const response = await fetch(filePath);
            return response.json();
          },
          catch: (e) => new DatabaseError({ cause: e }),
        });
      
      return { loadFromJSON } as const;
    }),
  }
) {}
```

#### Option 4: OSIS XML Format

OSIS (Open Scripture Information Standard) is a comprehensive XML format:

```typescript
// services/OSISImporter.ts
export class OSISImporter extends Effect.Service<OSISImporter>()(
  'OSISImporter',
  {
    effect: Effect.gen(function* () {
      
      const parseOSIS = (
        xmlContent: string
      ): Effect.Effect<Book[], ParseError> =>
        Effect.gen(function* () {
          // Parse OSIS XML
          // Handles:
          // - <div type="book">
          // - <chapter osisID="Gen.1">
          // - <verse osisID="Gen.1.1">
          // - <title> for headings
          // - <l> for poetry lines
          // - <q> for quotations
          
          return parsedBooks;
        });
      
      return { parseOSIS } as const;
    }),
  }
) {}
```

## Import Pipeline

### Complete Import Workflow

```typescript
// services/ScriptureImportPipeline.ts
import * as Effect from 'effect/Effect';

export class ScriptureImportPipeline extends Effect.Service<ScriptureImportPipeline>()(
  'ScriptureImportPipeline',
  {
    effect: Effect.gen(function* () {
      
      const importBookOfMormon = (): Effect.Effect<Book[], ImportError> =>
        Effect.gen(function* () {
          const importer = yield* BookOfMormonImporter;
          const books: Book[] = [];
          
          const bookList = [
            { id: '1-ne', name: '1 Nephi', chapters: 22 },
            { id: '2-ne', name: '2 Nephi', chapters: 33 },
            { id: 'jacob', name: 'Jacob', chapters: 7 },
            // ... etc
          ];
          
          for (const bookInfo of bookList) {
            const chapters: Chapter[] = [];
            
            for (let ch = 1; ch <= bookInfo.chapters; ch++) {
              const rawData = yield* importer.fetchChapter(bookInfo.id, ch);
              const chapter = yield* importer.parseChurchData(rawData);
              chapters.push(chapter);
              
              // Save to static JSON for distribution
              yield* saveChapterToFile(chapter);
            }
            
            books.push({
              id: bookInfo.id,
              name: bookInfo.name,
              fullName: bookInfo.name,
              abbreviation: bookInfo.id,
              category: 'bom-book',
              chapters,
              metadata: {
                themes: [],
                chapterCount: bookInfo.chapters,
                verseCount: chapters.reduce((sum, ch) => sum + ch.verses.length, 0),
              },
            });
          }
          
          return books;
        });
      
      const importBible = (
        translation: string = 'KJV'
      ): Effect.Effect<Book[], ImportError> =>
        Effect.gen(function* () {
          // Use appropriate importer based on translation
          const importer = yield* selectImporter(translation);
          
          const bibleBooks = yield* importer.importAllBooks(translation);
          
          // Save to static JSON
          for (const book of bibleBooks) {
            for (const chapter of book.chapters) {
              yield* saveChapterToFile(chapter);
            }
          }
          
          return bibleBooks;
        });
      
      const saveChapterToFile = (
        chapter: Chapter
      ): Effect.Effect<void, FileSystemError> =>
        Effect.gen(function* () {
          const path = `public/scripture/translations/${chapter.translation}/${chapter.book}/chapter-${chapter.chapter}.json`;
          const content = JSON.stringify(chapter, null, 2);
          
          // In build process, write to filesystem
          // In browser, this would be a no-op (data already exists)
          yield* Effect.tryPromise({
            try: async () => {
              // Node.js file writing during build
              // await fs.writeFile(path, content);
            },
            catch: (e) => new FileSystemError({ cause: e }),
          });
        });
      
      return {
        importBookOfMormon,
        importBible,
      } as const;
    }),
  }
) {}
```

## Tokenization Strategy

### Word-Level Tokenization

```typescript
// utils/tokenization.ts
import * as Effect from 'effect/Effect';

export const tokenizeText = (
  text: string,
  verseId: string
): Effect.Effect<TextToken[], ParseError> =>
  Effect.gen(function* () {
    const tokens: TextToken[] = [];
    
    // Split on whitespace but preserve punctuation context
    const words = text.split(/\s+/);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Extract punctuation
      const { 
        preceding, 
        core, 
        following 
      } = extractPunctuation(word);
      
      // Create token
      const token: TextToken = {
        id: `${verseId}.${i + 1}`,
        text: core,
        position: i + 1,
        verseId,
        presentation: {
          precedingPunctuation: preceding || undefined,
          followingPunctuation: following || undefined,
          emphasis: detectEmphasis(core),
          semanticType: detectSemanticType(core),
        },
      };
      
      tokens.push(token);
    }
    
    return tokens;
  });

function extractPunctuation(word: string): {
  preceding: string;
  core: string;
  following: string;
} {
  // Extract leading punctuation
  const leadMatch = word.match(/^([^\w]+)/);
  const preceding = leadMatch ? leadMatch[1] : '';
  
  // Extract trailing punctuation
  const trailMatch = word.match(/([^\w]+)$/);
  const following = trailMatch ? trailMatch[1] : '';
  
  // Core word
  const core = word.slice(
    preceding.length,
    word.length - following.length
  );
  
  return { preceding, core, following };
}

function detectEmphasis(word: string): EmphasisType | undefined {
  // Check for all-caps (divine name)
  if (word === word.toUpperCase() && word.length > 2) {
    return 'small-caps';
  }
  return undefined;
}

function detectSemanticType(word: string): SemanticType | undefined {
  // Detect divine names
  const divineNames = ['LORD', 'GOD', 'JEHOVAH', 'YHWH'];
  if (divineNames.includes(word.toUpperCase())) {
    return 'divine-name';
  }
  
  // Detect proper nouns (capitalized mid-sentence)
  if (word[0] === word[0].toUpperCase()) {
    return 'proper-noun';
  }
  
  return undefined;
}
```

### Presentation Inference

```typescript
// utils/presentationInference.ts

export function inferPresentation(
  verse: RawVerseData,
  section: RawSectionData
): VersePresentationMetadata {
  // Detect layout type
  const layoutType = detectLayoutType(verse.text, section.type);
  
  // Detect paragraph boundaries
  const paragraphStart = verse.text.startsWith('¶') || verse.isParagraphStart;
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
    sectionStart: verse.number === section.startVerse,
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
```

## Storage Format

### File Organization

```
public/scripture/
├── manifest.json                     # Index of all translations
├── translations/
│   ├── kjv/
│   │   ├── metadata.json             # KJV-specific metadata
│   │   ├── genesis/
│   │   │   ├── metadata.json         # Book metadata
│   │   │   ├── chapter-1.json        # Full chapter data
│   │   │   ├── chapter-2.json
│   │   │   └── ...
│   │   ├── exodus/
│   │   └── ...
│   ├── esv/
│   │   └── ...
│   └── bofm/
│       ├── metadata.json
│       ├── 1-ne/
│       │   ├── metadata.json
│       │   ├── chapter-1.json
│       │   └── ...
│       └── ...
└── original-languages/               # Optional: Hebrew/Greek data
    ├── hebrew/
    │   └── genesis/
    │       └── chapter-1.json        # Strong's, morphology, etc.
    └── greek/
        └── matthew/
            └── chapter-1.json
```

### Example Chapter File

```json
{
  "id": "gen.1",
  "book": "genesis",
  "chapter": 1,
  "translation": "kjv",
  "heading": {
    "summary": "The Creation",
    "description": "God creates the heavens and the earth in six days",
    "topics": ["creation", "light", "darkness", "heaven", "earth"]
  },
  "sections": [
    {
      "id": "gen.1.section-1",
      "startVerse": 1,
      "endVerse": 5,
      "heading": "The First Day"
    },
    {
      "id": "gen.1.section-2",
      "startVerse": 6,
      "endVerse": 8,
      "heading": "The Second Day"
    }
  ],
  "verses": [
    {
      "id": "gen.1.1",
      "book": "genesis",
      "chapter": 1,
      "verse": 1,
      "translation": "kjv",
      "tokens": [
        {
          "id": "gen.1.1.1",
          "text": "In",
          "position": 1,
          "verseId": "gen.1.1"
        },
        {
          "id": "gen.1.1.2",
          "text": "the",
          "position": 2,
          "verseId": "gen.1.1"
        },
        {
          "id": "gen.1.1.3",
          "text": "beginning",
          "position": 3,
          "verseId": "gen.1.1"
        },
        {
          "id": "gen.1.1.4",
          "text": "God",
          "position": 4,
          "verseId": "gen.1.1",
          "presentation": {
            "semanticType": "proper-noun"
          }
        },
        {
          "id": "gen.1.1.5",
          "text": "created",
          "position": 5,
          "verseId": "gen.1.1"
        },
        {
          "id": "gen.1.1.6",
          "text": "the",
          "position": 6,
          "verseId": "gen.1.1"
        },
        {
          "id": "gen.1.1.7",
          "text": "heaven",
          "position": 7,
          "verseId": "gen.1.1"
        },
        {
          "id": "gen.1.1.8",
          "text": "and",
          "position": 8,
          "verseId": "gen.1.1"
        },
        {
          "id": "gen.1.1.9",
          "text": "the",
          "position": 9,
          "verseId": "gen.1.1"
        },
        {
          "id": "gen.1.1.10",
          "text": "earth",
          "position": 10,
          "verseId": "gen.1.1",
          "presentation": {
            "followingPunctuation": "."
          }
        }
      ],
      "presentation": {
        "paragraphStart": true,
        "paragraphEnd": false,
        "sectionStart": true,
        "layoutType": "prose",
        "indentLevel": 0,
        "verseNumberDisplay": "inline"
      }
    }
  ],
  "presentation": {
    "displayHeading": true,
    "twoColumn": false,
    "chapterNumberDisplay": "standard"
  }
}
```

### Manifest File

```json
{
  "version": "1.0.0",
  "translations": [
    {
      "id": "kjv",
      "name": "King James Version",
      "abbreviation": "KJV",
      "language": "en",
      "copyright": "Public Domain",
      "books": [
        {
          "id": "genesis",
          "name": "Genesis",
          "testament": "old",
          "category": "law",
          "chapters": 50
        }
      ]
    },
    {
      "id": "bofm",
      "name": "The Book of Mormon",
      "abbreviation": "BoM",
      "language": "en",
      "copyright": "© Intellectual Reserve, Inc.",
      "books": [
        {
          "id": "1-ne",
          "name": "1 Nephi",
          "category": "bom-book",
          "chapters": 22
        }
      ]
    }
  ]
}
```

## Import Build Script

### One-Time Import Process

```typescript
// scripts/importScriptures.ts
import * as Effect from 'effect/Effect';
import { ScriptureImportPipeline } from '../src/services/ScriptureImportPipeline';
import * as fs from 'fs/promises';

const importAll = Effect.gen(function* () {
  const pipeline = yield* ScriptureImportPipeline;
  
  console.log('📖 Importing Book of Mormon...');
  const bofmBooks = yield* pipeline.importBookOfMormon();
  console.log(`✅ Imported ${bofmBooks.length} books from Book of Mormon`);
  
  console.log('📖 Importing Bible (KJV)...');
  const kjvBooks = yield* pipeline.importBible('kjv');
  console.log(`✅ Imported ${kjvBooks.length} books from KJV Bible`);
  
  // Generate manifest
  const manifest = yield* generateManifest([
    { id: 'bofm', books: bofmBooks },
    { id: 'kjv', books: kjvBooks },
  ]);
  
  yield* Effect.tryPromise({
    try: () => fs.writeFile(
      'public/scripture/manifest.json',
      JSON.stringify(manifest, null, 2)
    ),
    catch: (e) => new FileSystemError({ cause: e }),
  });
  
  console.log('✅ Scripture import complete!');
});

// Run import
Effect.runPromise(importAll)
  .then(() => console.log('Done!'))
  .catch((error) => console.error('Import failed:', error));
```

### NPM Scripts

```json
{
  "scripts": {
    "import:bofm": "tsx scripts/importScriptures.ts --source=bofm",
    "import:bible": "tsx scripts/importScriptures.ts --source=kjv",
    "import:all": "tsx scripts/importScriptures.ts",
    "validate:scripture": "tsx scripts/validateScripture.ts"
  }
}
```

## Recommended Approach

### Phase 1: Book of Mormon (Easiest)

1. Use churchofjesuschrist.org API
2. Clean, structured data available
3. No licensing concerns
4. Import all books: ~6,000 verses

### Phase 2: Bible - KJV (Public Domain)

1. Use existing JSON dataset (github.com/thiagobodruk/bible)
2. Public domain, no licensing issues
3. Add presentation metadata
4. Import Old + New Testament: ~31,000 verses

### Phase 3: Modern Translations (Optional)

1. ESV API (requires API key)
2. NIV, NASB (require licensing)
3. Add based on user demand

## Next Steps

1. **Update ARCHITECTURE.md** with extended data structures
2. **Create import scripts** in `/scripts` directory
3. **Build importers** for Book of Mormon and Bible
4. **Generate static JSON files** during build process
5. **Update UI components** to use presentation metadata
6. **Test with real scripture data**

---

**See also:**
- [Architecture Documentation](./ARCHITECTURE.md)
- [Data Flow Documentation](./DATA_FLOW.md)

