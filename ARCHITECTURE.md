# Scripture Tag System - Architecture Documentation

## Project Overview

A word-level scripture tagging and annotation system that enables precise, granular tagging with N-cardinality (multiple tags per word/word group). The system provides a flexible display layer for viewing scripture with overlaid tags, filtering by tags, and user-customizable presentation styles.

**Core Philosophy:** Local-first, privacy-focused, offline-capable, with optional sync capabilities in the future.

## Technology Stack

### Frontend Framework
- **SolidJS** - Fine-grained reactive framework
  - Ideal for word-level updates (only affected words re-render on tag changes)
  - Superior performance for frequent filter toggles
  - Smaller bundle size (~7KB base)
  - Natural reactive primitives (signals & stores)

### State Management
- **Solid Stores** (`solid-js/store`) - Built-in reactive state
  - Manages UI state and cached data
  - Fine-grained reactivity for optimal rendering
  - Deep mutation tracking with `produce()`

### Business Logic Layer
- **Effect-TS** - Functional effect system
  - Type-safe error handling
  - Composable business logic
  - Dependency injection for services
  - Testable, pure functions

### Persistence Layer
- **SQLite WASM** - Browser-based SQLite with OPFS (for tags & annotations only)
  - Official SQLite compiled to WebAssembly
  - OPFS (Origin Private File System) for persistence
  - Full SQL query support with indexes
  - Stores user-generated data (tags, annotations, styles)
  - ~500KB WASM bundle with excellent performance
- **Static JSON Files** - Scripture data served from public directory
  - Pre-tokenized scripture in structured JSON format
  - Loaded on-demand via standard HTTP requests
  - No caching layer (relies on browser/CDN caching)

### UI Components
- **Kobalte** - Headless UI primitives
  - Accessible by default (ARIA compliant)
  - Unstyled, fully customizable
  - Components: Popover, Dropdown, Combobox, ToggleGroup

### Styling
- **TailwindCSS** - Utility-first CSS framework
- **CSS Variables** - Dynamic tag colors and styles

### Build Tool
- **Vite** - Fast development and optimized builds
- **TypeScript** - Type safety across all layers

## Architecture Layers

The application follows a clean layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────┐
│                  UI Layer                        │
│         (SolidJS Components + Kobalte)           │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              ViewModel Layer                     │
│    (Solid Stores + EffectTS binding adapters)   │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│            Business Logic Layer                  │
│         (EffectTS Services & Effects)            │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│            Persistence Layer                     │
│     (SQLite WASM + OPFS + Static Files)         │
└─────────────────────────────────────────────────┘
```



## Core Data Structures

### Text Representation

```typescript
interface TextToken {
  id: string;              // Unique identifier (e.g., "gen.1.1.3")
  text: string;            // The actual word
  position: number;        // Position within verse
  verseId: string;         // Reference (book.chapter.verse)
  presentation: {
    emphasis?: 'italic' | 'bold' | 'small-caps' | 'red-letter';
    semanticType?: 'divine-name' | 'proper-noun' | 'quotation';
    precedingPunctuation?: string;
    followingPunctuation?: string;
  };
}

interface Verse {
  id: string;              // "gen.1.1"
  book: string;            // "gen"
  chapter: number;         // 1
  verse: number;           // 1
  tokens: TextToken[];
  translation: string;     // "kjv", "bofm", "dc", "pgp"
  presentation: {
    paragraphStart: boolean;
    paragraphEnd: boolean;
    sectionStart: boolean;
    layoutType: 'prose' | 'poetry' | 'quotation' | 'list';
    indentLevel: number;
    verseNumberDisplay: 'inline' | 'superscript' | 'margin' | 'hidden';
  };
}

interface Chapter {
  id: string;              // "gen.1"
  book: string;            // "gen"
  chapter: number;         // 1
  translation: string;     // "kjv", "bofm", "dc", "pgp"
  heading: {
    summary: string;       // Chapter summary from original text
    topics: string[];      // Array of topic keywords (optional)
  };
  sections: Array<{
    id: string;
    startVerse: number;
    endVerse: number;
    heading: string;
  }>;
  verses: Verse[];
  presentation: {
    displayHeading: boolean;
    twoColumn: boolean;
    chapterNumberDisplay: 'standard' | 'decorative' | 'hidden';
  };
}
```

### Tagging Layer (Decoupled from Text)

```typescript
interface Tag {
  id: string;              // UUID
  name: string;            // User-defined name
  description?: string;    // Optional description
  category?: string;       // Group related tags
  metadata: {
    color?: string;        // Default color (#hex)
    icon?: string;         // Optional icon identifier
    priority?: number;     // For overlap resolution (higher = top)
  };
  createdAt: Date;
  userId: string;          // For future multi-user support
}

interface TagAnnotation {
  id: string;              // UUID
  tagId: string;           // Reference to Tag
  tokenIds: string[];      // Array supports word groups
  userId: string;
  note?: string;           // Optional user notes
  createdAt: Date;
  lastModified: Date;
  version: number;         // For conflict resolution
}
```

### Presentation Layer (Separate from Data)

```typescript
interface TagStyle {
  tagId: string;
  userId?: string;         // User-specific overrides
  style: {
    backgroundColor?: string;
    textColor?: string;
    underlineStyle?: 'solid' | 'dashed' | 'dotted' | 'wavy' | 'double';
    underlineColor?: string;
    fontWeight?: 'normal' | 'bold' | 'semibold';
    icon?: string;
    iconPosition?: 'before' | 'after' | 'above' | 'below';
    opacity?: number;      // For layered overlays
  };
}
```

## SQLite Database Schema

```sql
-- db/schema.sql
-- SQLite schema for scripture tagging system
-- Note: Scripture data is NOT stored in SQLite; it's loaded from static JSON files

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  color TEXT,
  icon TEXT,
  priority INTEGER,
  created_at INTEGER NOT NULL,
  user_id TEXT NOT NULL
);

CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_tags_user_id ON tags(user_id);

-- Annotations table
CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  tag_id TEXT NOT NULL,
  token_ids TEXT NOT NULL,  -- JSON array stored as TEXT
  user_id TEXT NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL,
  last_modified INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_annotations_tag_id ON annotations(tag_id);
CREATE INDEX idx_annotations_user_id ON annotations(user_id);
CREATE INDEX idx_annotations_last_modified ON annotations(last_modified);

-- Tag styles table
CREATE TABLE IF NOT EXISTS tag_styles (
  tag_id TEXT PRIMARY KEY,
  user_id TEXT,
  background_color TEXT,
  text_color TEXT,
  underline_style TEXT,
  underline_color TEXT,
  font_weight TEXT,
  icon TEXT,
  icon_position TEXT,
  opacity REAL,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_tag_styles_user_id ON tag_styles(user_id);
```

### Index Strategy

- **tags**: Indexed by `id` (primary), `name`, `category`, `userId` for fast lookups and filtering
- **annotations**: 
  - Primary key: `id`
  - Indexed: `tagId`, `userId`, `lastModified` for efficient queries
  - `tokenIds` stored as JSON text (use JSON functions to query: `json_each(token_ids)`)
- **tag_styles**: Indexed by `tagId` (primary) and `userId` for user-specific style overrides

**Note:** Scripture data is NOT stored in SQLite. It's loaded from pre-generated static JSON files in the `public/scripture/` directory.

## EffectTS Business Logic Layer

### Service Architecture

Effect-TS provides the business logic layer with:
- Type-safe error handling
- Composable operations
- Dependency injection
- Testability

```typescript
// services/TagService.ts
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { TagRepository } from './repositories/TagRepository';

export class TagService extends Effect.Service<TagService>()('TagService', {
  effect: Effect.gen(function* () {
    const repo = yield* TagRepository;

    const createTag = (
      name: string,
      category?: string,
      metadata?: Tag['metadata']
    ): Effect.Effect<Tag, TagError> =>
      Effect.gen(function* () {
        // Validation
        if (name.trim().length === 0) {
          return yield* Effect.fail(new TagError({ reason: 'EmptyName' }));
        }

        // Check for duplicates
        const existing = yield* repo.findByName(name);
        if (existing) {
          return yield* Effect.fail(new TagError({ reason: 'DuplicateName' }));
        }

        // Create tag
        const tag: Tag = {
          id: crypto.randomUUID(),
          name: name.trim(),
          category,
          metadata: metadata || {},
          createdAt: new Date(),
          userId: 'default', // TODO: Get from auth context
        };

        yield* repo.save(tag);
        return tag;
      });

    const deleteTag = (tagId: string): Effect.Effect<void, TagError> =>
      Effect.gen(function* () {
        // Check if tag exists
        const tag = yield* repo.findById(tagId);
        if (!tag) {
          return yield* Effect.fail(new TagError({ reason: 'NotFound' }));
        }

        // Delete all annotations with this tag
        const annotationRepo = yield* AnnotationRepository;
        yield* annotationRepo.deleteByTagId(tagId);

        // Delete the tag
        yield* repo.delete(tagId);
      });

    const getAllTags = (): Effect.Effect<Tag[], never> =>
      repo.getAll();

    return {
      createTag,
      deleteTag,
      getAllTags,
    } as const;
  }),
  dependencies: [TagRepository.Default],
}) {}
```

### Repository Layer (Effect-TS + SQLite WASM)

```typescript
// services/repositories/TagRepository.ts
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { SQLiteService } from '../SQLiteService';

export class TagRepository extends Effect.Service<TagRepository>()(
  'TagRepository',
  {
    effect: Effect.gen(function* () {
      const sqlite = yield* SQLiteService;

      const save = (tag: Tag): Effect.Effect<void, DatabaseError> =>
        sqlite.execute(
          `INSERT OR REPLACE INTO tags 
           (id, name, description, category, color, icon, priority, created_at, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tag.id,
            tag.name,
            tag.description || null,
            tag.category || null,
            tag.metadata.color || null,
            tag.metadata.icon || null,
            tag.metadata.priority || null,
            tag.createdAt.getTime(),
            tag.userId,
          ]
        );

      const findById = (id: string): Effect.Effect<Tag | undefined, DatabaseError> =>
        sqlite.query<Tag>(
          'SELECT * FROM tags WHERE id = ?',
          [id]
        ).pipe(
          Effect.map((rows) => rows[0] ? mapRowToTag(rows[0]) : undefined)
        );

      const findByName = (name: string): Effect.Effect<Tag | undefined, DatabaseError> =>
        sqlite.query(
          'SELECT * FROM tags WHERE name = ? LIMIT 1',
          [name]
        ).pipe(
          Effect.map((rows) => rows[0] ? mapRowToTag(rows[0]) : undefined)
        );

      const getAll = (): Effect.Effect<Tag[], DatabaseError> =>
        sqlite.query('SELECT * FROM tags ORDER BY name').pipe(
          Effect.map((rows) => rows.map(mapRowToTag))
        );

      const delete_ = (id: string): Effect.Effect<void, DatabaseError> =>
        sqlite.execute('DELETE FROM tags WHERE id = ?', [id]);

      return {
        save,
        findById,
        findByName,
        getAll,
        delete: delete_,
      } as const;
    }),
    dependencies: [SQLiteService.Default],
  }
) {}

// Helper to map SQLite row to Tag object
function mapRowToTag(row: any): Tag {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    metadata: {
      color: row.color,
      icon: row.icon,
      priority: row.priority,
    },
    createdAt: new Date(row.created_at),
    userId: row.user_id,
  };
}
```

### Git Sync Service

The Git Sync Service enables version control of annotations by exporting to/importing from SQLite database files in the repository.

```typescript
// services/GitSyncService.ts
import * as Effect from 'effect/Effect';
import { SQLiteService } from './SQLiteService';

export class GitSyncService extends Effect.Service<GitSyncService>()(
  'GitSyncService',
  {
    effect: Effect.gen(function* () {
      const sqlite = yield* SQLiteService;
      
      // Export current database to downloadable SQLite file
      const exportToFile = (
        userId: string,
        filename?: string
      ): Effect.Effect<void, DatabaseError> =>
        Effect.gen(function* () {
          // Use SQLite's vacuum into or export API to create a compact copy
          const dbFile = yield* sqlite.exportDatabase();
          
          // Generate downloadable file
          const blob = new Blob([dbFile], {
            type: 'application/vnd.sqlite3',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename || `${userId}-annotations.sqlite`;
          a.click();
          URL.revokeObjectURL(url);
        });
      
      // Import from repository SQLite database file
      const importFromRepository = (
        mergeStrategy: 'replace' | 'merge' | 'skip-existing'
      ): Effect.Effect<void, DatabaseError | HttpError> =>
        Effect.gen(function* () {
          // Fetch manifest of available database files
          const manifest = yield* Effect.tryPromise({
            try: async () => {
              const res = await fetch('/data/annotations/manifest.json');
              if (!res.ok) throw new Error('Manifest not found');
              return res.json() as Promise<{ files: string[] }>;
            },
            catch: (e) => new HttpError({ cause: e }),
          });
          
          // Load and merge each database file
          for (const filename of manifest.files) {
            const dbArrayBuffer = yield* Effect.tryPromise({
              try: async () => {
                const res = await fetch(`/data/annotations/${filename}`);
                if (!res.ok) throw new Error(`Failed to load ${filename}`);
                return res.arrayBuffer();
              },
              catch: (e) => new HttpError({ cause: e }),
            });
            
            // Merge the imported database into current database
            if (mergeStrategy === 'replace' && manifest.files[0] === filename) {
              // Replace with first file, then merge rest
              yield* sqlite.importDatabase(new Uint8Array(dbArrayBuffer), 'replace');
            } else {
              yield* sqlite.importDatabase(
                new Uint8Array(dbArrayBuffer), 
                mergeStrategy
              );
            }
          }
        });
      
      // Import from user-uploaded SQLite file
      const importFromFile = (
        file: File,
        mergeStrategy: 'replace' | 'merge' | 'skip-existing'
      ): Effect.Effect<void, DatabaseError> =>
        Effect.gen(function* () {
          const arrayBuffer = yield* Effect.tryPromise({
            try: () => file.arrayBuffer(),
            catch: (e) => new DatabaseError({ cause: e }),
          });
          
          yield* sqlite.importDatabase(
            new Uint8Array(arrayBuffer),
            mergeStrategy
          );
        });
      
      return {
        exportToFile,
        importFromRepository,
        importFromFile,
      } as const;
    }),
    dependencies: [SQLiteService.Default],
  }
) {}
```

### SQLite Service

The SQLite Service provides the core database interface running in a Web Worker with OPFS persistence.

```typescript
// services/SQLiteService.ts
import * as Effect from 'effect/Effect';
import * as Context from 'effect/Context';

export class SQLiteService extends Context.Tag('SQLiteService')<
  SQLiteService,
  {
    readonly query: <T = any>(sql: string, params?: any[]) => Effect.Effect<T[], DatabaseError>;
    readonly execute: (sql: string, params?: any[]) => Effect.Effect<void, DatabaseError>;
    readonly exportDatabase: () => Effect.Effect<Uint8Array, DatabaseError>;
    readonly importDatabase: (
      data: Uint8Array,
      strategy: 'replace' | 'merge' | 'skip-existing'
    ) => Effect.Effect<void, DatabaseError>;
  }
>() {}

// Implementation uses Web Worker for OPFS access
export const makeSQLiteService = Effect.gen(function* () {
  const worker = new Worker(
    new URL('../workers/sqlite-worker.ts', import.meta.url),
    { type: 'module' }
  );
  
  let requestId = 0;
  const pending = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();
  
  worker.onmessage = (e) => {
    const { id, result, error } = e.data;
    const handler = pending.get(id);
    
    if (handler) {
      if (error) {
        handler.reject(new DatabaseError({ cause: error }));
      } else {
        handler.resolve(result);
      }
      pending.delete(id);
    }
  };
  
  const sendRequest = <T>(type: string, payload: any): Effect.Effect<T, DatabaseError> =>
    Effect.async<T, DatabaseError>((resume) => {
      const id = requestId++;
      
      pending.set(id, {
        resolve: (result) => resume(Effect.succeed(result)),
        reject: (error) => resume(Effect.fail(error)),
      });
      
      worker.postMessage({ id, type, payload });
    });
  
  return {
    query: <T = any>(sql: string, params: any[] = []) =>
      sendRequest<T[]>('query', { sql, params }),
    
    execute: (sql: string, params: any[] = []) =>
      sendRequest<void>('execute', { sql, params }),
    
    exportDatabase: () =>
      sendRequest<Uint8Array>('export', {}),
    
    importDatabase: (data: Uint8Array, strategy: 'replace' | 'merge' | 'skip-existing') =>
      sendRequest<void>('import', { data, strategy }),
  } as const;
});

export const SQLiteServiceLive = Layer.effect(SQLiteService, makeSQLiteService);
```

### Annotation Service

```typescript
// services/AnnotationService.ts
import * as Effect from 'effect/Effect';

export class AnnotationService extends Effect.Service<AnnotationService>()(
  'AnnotationService',
  {
    effect: Effect.gen(function* () {
      const repo = yield* AnnotationRepository;
      const tagRepo = yield* TagRepository;

      const createAnnotation = (
        tagId: string,
        tokenIds: string[],
        note?: string
      ): Effect.Effect<TagAnnotation, AnnotationError> =>
        Effect.gen(function* () {
          // Validate tag exists
          const tag = yield* tagRepo.findById(tagId);
          if (!tag) {
            return yield* Effect.fail(
              new AnnotationError({ reason: 'TagNotFound' })
            );
          }

          // Validate tokens
          if (tokenIds.length === 0) {
            return yield* Effect.fail(
              new AnnotationError({ reason: 'NoTokens' })
            );
          }

          const annotation: TagAnnotation = {
            id: crypto.randomUUID(),
            tagId,
            tokenIds,
            userId: 'default',
            note,
            createdAt: new Date(),
            lastModified: new Date(),
            version: 1,
          };

          yield* repo.save(annotation);
          return annotation;
        });

      const getAnnotationsForToken = (
        tokenId: string
      ): Effect.Effect<TagAnnotation[], DatabaseError> =>
        Effect.gen(function* () {
          // Use SQLite JSON functions to query token_ids array
          const rows = yield* repo.query(
            `SELECT * FROM annotations 
             WHERE EXISTS (
               SELECT 1 FROM json_each(token_ids) 
               WHERE json_each.value = ?
             )`,
            [tokenId]
          );
          return rows.map(mapRowToAnnotation);
        });

      const getAnnotationsForVerse = (
        verseId: string
      ): Effect.Effect<TagAnnotation[], DatabaseError> =>
        repo.findByVerseId(verseId);

      const updateAnnotation = (
        annotationId: string,
        updates: Partial<Pick<TagAnnotation, 'note' | 'tokenIds'>>
      ): Effect.Effect<TagAnnotation, AnnotationError> =>
        Effect.gen(function* () {
          const existing = yield* repo.findById(annotationId);
          if (!existing) {
            return yield* Effect.fail(
              new AnnotationError({ reason: 'NotFound' })
            );
          }

          const updated: TagAnnotation = {
            ...existing,
            ...updates,
            lastModified: new Date(),
            version: existing.version + 1,
          };

          yield* repo.save(updated);
          return updated;
        });

      const deleteAnnotation = (
        annotationId: string
      ): Effect.Effect<void, AnnotationError> =>
        Effect.gen(function* () {
          const existing = yield* repo.findById(annotationId);
          if (!existing) {
            return yield* Effect.fail(
              new AnnotationError({ reason: 'NotFound' })
            );
          }

          yield* repo.delete(annotationId);
        });

      return {
        createAnnotation,
        getAnnotationsForToken,
        getAnnotationsForVerse,
        updateAnnotation,
        deleteAnnotation,
      } as const;
    }),
    dependencies: [AnnotationRepository.Default, TagRepository.Default],
  }
) {}
```

## ViewModel Layer: Bridging EffectTS and SolidJS

The ViewModel layer adapts Effect-TS business logic to SolidJS reactive primitives.

### Store Structure

```typescript
// stores/scriptureStore.ts
import { createStore } from 'solid-js/store';
import { createSignal, createMemo } from 'solid-js';
import * as Effect from 'effect/Effect';
import { TagService, AnnotationService } from '../services';

export interface ScriptureState {
  tags: Map<string, Tag>;
  annotations: TagAnnotation[];
  tagStyles: Map<string, TagStyle>;
  
  // UI state
  selectedTokens: Set<string>;
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;  // Last git sync timestamp
}

export function createScriptureStore() {
  // Solid Store for complex nested data
  const [state, setState] = createStore<ScriptureState>({
    tags: new Map(),
    annotations: [],
    tagStyles: new Map(),
    selectedTokens: new Set(),
    isLoading: false,
    error: null,
    lastSync: null,
  });

  // Signals for simple UI state
  const [activeFilters, setActiveFilters] = createSignal<Set<string>>(new Set());
  const [highlightMode, setHighlightMode] = createSignal<'all' | 'filtered' | 'selected'>('all');

  // Computed values
  const visibleAnnotations = createMemo(() => {
    const filters = activeFilters();
    if (filters.size === 0) return state.annotations;
    return state.annotations.filter(ann => filters.has(ann.tagId));
  });

  // Token → Annotations map (memoized)
  const tokenTagMap = createMemo(() => {
    const map = new Map<string, TagAnnotation[]>();
    for (const annotation of visibleAnnotations()) {
      for (const tokenId of annotation.tokenIds) {
        if (!map.has(tokenId)) map.set(tokenId, []);
        map.get(tokenId)!.push(annotation);
      }
    }
    return map;
  });

  // ViewModel adapters (Effect → Solid)
  const runEffect = <A, E>(
    effect: Effect.Effect<A, E>,
    onSuccess?: (result: A) => void,
    onError?: (error: E) => void
  ) => {
    setState('isLoading', true);
    setState('error', null);

    Effect.runPromise(effect)
      .then((result) => {
        onSuccess?.(result);
        setState('isLoading', false);
      })
      .catch((error) => {
        onError?.(error);
        setState('error', String(error));
        setState('isLoading', false);
      });
  };

  // Actions (calling EffectTS services)
  const actions = {
    createTag: (name: string, category?: string) => {
      const effect = TagService.pipe(
        Effect.flatMap((service) => service.createTag(name, category))
      );

      runEffect(effect, (tag) => {
        setState('tags', (tags) => new Map(tags).set(tag.id, tag));
      });
    },

    deleteTag: (tagId: string) => {
      const effect = TagService.pipe(
        Effect.flatMap((service) => service.deleteTag(tagId))
      );

      runEffect(effect, () => {
        setState('tags', (tags) => {
          const newTags = new Map(tags);
          newTags.delete(tagId);
          return newTags;
        });
        setState('annotations', (anns) =>
          anns.filter((a) => a.tagId !== tagId)
        );
      });
    },

    loadAllTags: () => {
      const effect = TagService.pipe(
        Effect.flatMap((service) => service.getAllTags())
      );

      runEffect(effect, (tags) => {
        setState('tags', new Map(tags.map((t) => [t.id, t])));
      });
    },

    createAnnotation: (tagId: string, tokenIds: string[], note?: string) => {
      const effect = AnnotationService.pipe(
        Effect.flatMap((service) =>
          service.createAnnotation(tagId, tokenIds, note)
        )
      );

      runEffect(effect, (annotation) => {
        setState('annotations', (anns) => [...anns, annotation]);
        setState('selectedTokens', new Set());
      });
    },

    deleteAnnotation: (annotationId: string) => {
      const effect = AnnotationService.pipe(
        Effect.flatMap((service) => service.deleteAnnotation(annotationId))
      );

      runEffect(effect, () => {
        setState('annotations', (anns) =>
          anns.filter((a) => a.id !== annotationId)
        );
      });
    },

    // Git Sync Actions
    exportToRepository: (userId: string) => {
      const effect = GitSyncService.pipe(
        Effect.flatMap((service) => service.exportToFile(userId))
      );

      runEffect(effect, () => {
        setState('lastSync', new Date());
        console.log('📤 Exported! Save to public/data/annotations/ and commit.');
      });
    },

    importFromRepository: (strategy: 'merge' | 'replace' | 'skip-existing' = 'merge') => {
      const effect = GitSyncService.pipe(
        Effect.flatMap((service) => service.importFromRepository(strategy))
      );

      runEffect(effect, () => {
        // Reload all data from SQLite into store
        loadAllData();
        setState('lastSync', new Date());
        console.log('📥 Imported from repository!');
      });
    },

    toggleTagFilter: (tagId: string) => {
      setActiveFilters((prev) => {
        const next = new Set(prev);
        if (next.has(tagId)) {
          next.delete(tagId);
        } else {
          next.add(tagId);
        }
        return next;
      });
    },

    toggleTokenSelection: (tokenId: string) => {
      setState('selectedTokens', (prev) => {
        const next = new Set(prev);
        if (next.has(tokenId)) {
          next.delete(tokenId);
        } else {
          next.add(tokenId);
        }
        return next;
      });
    },

    clearSelection: () => {
      setState('selectedTokens', new Set());
    },
  };
  
  // Helper to load all data from SQLite (tags, annotations, styles only)
  const loadAllData = () => {
    const effect = Effect.gen(function* () {
      const sqlite = yield* SQLiteService;
      
      const [tags, annotations, styles] = yield* Effect.all([
        sqlite.query<Tag>('SELECT * FROM tags'),
        sqlite.query<TagAnnotation>('SELECT * FROM annotations'),
        sqlite.query<TagStyle>('SELECT * FROM tag_styles'),
      ]);
      
      return { 
        tags: tags.map(mapRowToTag), 
        annotations: annotations.map(mapRowToAnnotation), 
        styles: styles.map(mapRowToTagStyle)
      };
    });
    
    runEffect(effect, ({ tags, annotations, styles }) => {
      setState('tags', new Map(tags.map((t) => [t.id, t])));
      setState('annotations', annotations);
      setState('tagStyles', new Map(styles.map((s) => [s.tagId, s])));
    });
  };
  
  // Auto-import from repository on mount
  onMount(() => {
    importFromRepository('merge');
  });

  return {
    state,
    activeFilters,
    highlightMode,
    visibleAnnotations,
    tokenTagMap,
    setHighlightMode,
    ...actions,
  };
}

// Create singleton store instance
export const scriptureStore = createScriptureStore();
```

### Context Provider

```typescript
// contexts/ScriptureContext.tsx
import { createContext, useContext, ParentComponent } from 'solid-js';
import { createScriptureStore } from '../stores/scriptureStore';

const ScriptureContext = createContext<ReturnType<typeof createScriptureStore>>();

export const ScriptureProvider: ParentComponent = (props) => {
  const store = createScriptureStore();

  return (
    <ScriptureContext.Provider value={store}>
      {props.children}
    </ScriptureContext.Provider>
  );
};

export const useScripture = () => {
  const context = useContext(ScriptureContext);
  if (!context) {
    throw new Error('useScripture must be used within ScriptureProvider');
  }
  return context;
};
```

## Scripture Data Loading

### Imported Scripture Collections

The system currently includes four complete scripture collections:

**1. King James Version (KJV)** - 66 books
- **Old Testament** (39 books):
  - Law: Genesis, Exodus, Leviticus, Numbers, Deuteronomy
  - History: Joshua, Judges, Ruth, 1-2 Samuel, 1-2 Kings, 1-2 Chronicles, Ezra, Nehemiah, Esther
  - Wisdom: Job, Psalms (150 chapters), Proverbs, Ecclesiastes, Song of Solomon
  - Major Prophets: Isaiah, Jeremiah, Lamentations, Ezekiel, Daniel
  - Minor Prophets: Hosea, Joel, Amos, Obadiah, Jonah, Micah, Nahum, Habakkuk, Zephaniah, Haggai, Zechariah, Malachi
- **New Testament** (27 books):
  - Gospels: Matthew, Mark, Luke, John
  - Acts of the Apostles
  - Pauline Epistles: Romans, 1-2 Corinthians, Galatians, Ephesians, Philippians, Colossians, 1-2 Thessalonians, 1-2 Timothy, Titus, Philemon
  - General Epistles: Hebrews, James, 1-2 Peter, 1-2-3 John, Jude
  - Apocalyptic: Revelation

**2. The Book of Mormon (BoM)** - 15 books
- 1 Nephi (22 chapters)
- 2 Nephi (33 chapters)
- Jacob, Enos, Jarom, Omni, Words of Mormon
- Mosiah (29 chapters)
- Alma (63 chapters)
- Helaman (16 chapters)
- 3 Nephi (30 chapters)
- 4 Nephi, Mormon (9 chapters), Ether (15 chapters), Moroni (10 chapters)

**3. Doctrine and Covenants (D&C)** - 138 sections

**4. Pearl of Great Price (PGP)** - 5 books
- Moses (8 chapters)
- Abraham (5 chapters)
- Joseph Smith—Matthew (1 chapter)
- Joseph Smith—History (1 chapter)
- Articles of Faith (1 chapter)

**Total Content:**
- 4 translations
- 224 books
- ~1,500+ chapters
- Word-level tokenization with presentation metadata

### Data Format Examples

**Token Example** (from Genesis 1:1):
```json
{
  "id": "gen.1.1.4",
  "text": "God",
  "position": 4,
  "verseId": "gen.1.1",
  "presentation": {
    "semanticType": "divine-name"
  }
}
```

**Verse Example** (Genesis 1:1):
```json
{
  "id": "gen.1.1",
  "book": "gen",
  "chapter": 1,
  "verse": 1,
  "tokens": [/* array of tokens */],
  "translation": "kjv",
  "presentation": {
    "paragraphStart": false,
    "paragraphEnd": false,
    "sectionStart": true,
    "layoutType": "prose",
    "indentLevel": 0,
    "verseNumberDisplay": "inline"
  }
}
```

**Chapter Example** (Genesis 1):
```json
{
  "id": "gen.1",
  "book": "gen",
  "chapter": 1,
  "translation": "kjv",
  "heading": {
    "summary": "God creates this earth and its heaven...",
    "topics": []
  },
  "sections": [],
  "verses": [/* array of verses */],
  "presentation": {
    "displayHeading": true,
    "twoColumn": false,
    "chapterNumberDisplay": "standard"
  }
}
```

**Notes on Data Format:**
- All `presentation` objects are always present (even if empty: `{}`)
- Punctuation is stored in `presentation.followingPunctuation` or `presentation.precedingPunctuation`
- Token IDs follow format: `{book}.{chapter}.{verse}.{position}`
- Verse/Chapter IDs follow format: `{book}.{chapter}[.{verse}]`
- Divine names and proper nouns are marked with `semanticType`

### Static File Structure

```
public/
  scripture/
    manifest.json          # Index of all translations and books
    translations/
      kjv/
        manifest.json      # KJV translation metadata
        gen/
          chapter-1.json
          chapter-2.json
          ...
        ex/
          chapter-1.json
          ...
        [all other OT/NT books]
      bofm/
        manifest.json      # Book of Mormon translation metadata
        1-ne/
          chapter-1.json
          ...
        2-ne/
          ...
        [all other BoM books]
      dc/
        manifest.json      # D&C translation metadata
        dc/
          chapter-1.json
          chapter-2.json
          ...
      pgp/
        manifest.json      # Pearl of Great Price translation metadata
        moses/
          chapter-1.json
          ...
        abr/
          ...
        [other PGP books]
```

### Scripture Manifest Interfaces

```typescript
// types/scripture.ts
export interface ScriptureManifest {
  version: string;
  translations: Translation[];
}

export interface Translation {
  id: string;              // "kjv", "bofm", "dc", "pgp"
  name: string;            // "King James Version"
  abbreviation: string;    // "KJV"
  language: string;        // "en"
  copyright: string;       // Copyright notice
  books: BookMetadata[];
}

export interface BookMetadata {
  id: string;              // "gen", "1-ne", "dc"
  name: string;            // "Genesis", "1 Nephi"
  category: string;        // "law", "gospels", "bom-book", etc.
  chapters: number;        // Total chapter count
}
```

### Scripture Loader Service

```typescript
// services/ScriptureLoader.ts
import * as Effect from 'effect/Effect';

export class ScriptureLoader extends Effect.Service<ScriptureLoader>()(
  'ScriptureLoader',
  {
    effect: Effect.gen(function* () {
      const loadManifest = (): Effect.Effect<ScriptureManifest, HttpError> =>
        Effect.tryPromise({
          try: async () => {
            const response = await fetch('/scripture/manifest.json');
            if (!response.ok) throw new Error('Failed to load manifest');
            return response.json();
          },
          catch: (error) => new HttpError({ cause: error }),
        });

      const loadChapter = (
        translation: string,
        book: string,
        chapter: number
      ): Effect.Effect<Chapter, HttpError> =>
        Effect.tryPromise({
          try: async () => {
            const response = await fetch(
              `/scripture/translations/${translation}/${book}/chapter-${chapter}.json`
            );
            if (!response.ok) throw new Error('Failed to load chapter');
            return response.json();
          },
          catch: (error) => new HttpError({ cause: error }),
        });

      return {
        loadManifest,
        loadChapter,
      } as const;
    }),
  }
) {}
```

**Note:** Scripture chapters are loaded from static JSON files on-demand. No caching in SQLite. Browsers and CDNs handle HTTP caching automatically.

## UI Components

### Tagged Word Component

```typescript
// components/TaggedWord.tsx
import { createMemo, Show, For } from 'solid-js';
import { useScripture } from '../contexts/ScriptureContext';
import { Popover } from '@kobalte/core';

interface TaggedWordProps {
  token: TextToken;
}

export function TaggedWord(props: TaggedWordProps) {
  const scripture = useScripture();

  // Fine-grained reactivity: only this word re-renders when its tags change
  const annotations = createMemo(
    () => scripture.tokenTagMap().get(props.token.id) || []
  );

  const tags = createMemo(() =>
    annotations()
      .map((ann) => scripture.state.tags.get(ann.tagId))
      .filter(Boolean) as Tag[]
  );

  const isSelected = createMemo(() =>
    scripture.state.selectedTokens.has(props.token.id)
  );

  const compositeStyle = createMemo(() => {
    const tagList = tags();
    const baseStyle: Record<string, string> = {};
    
    // Apply presentation metadata from token
    const pres = props.token.presentation;
    if (pres) {
      if (pres.emphasis === 'italic') baseStyle['font-style'] = 'italic';
      if (pres.emphasis === 'bold') baseStyle['font-weight'] = 'bold';
      if (pres.emphasis === 'small-caps') baseStyle['font-variant'] = 'small-caps';
      if (pres.emphasis === 'red-letter') baseStyle['color'] = '#c53030';
      
      if (pres.semanticType === 'divine-name') {
        baseStyle['font-variant'] = 'small-caps';
        baseStyle['letter-spacing'] = '0.05em';
      }
    }
    
    // Add tag styles
    if (tagList.length > 0) {
      const styles = tagList.map(
        (tag) => scripture.state.tagStyles.get(tag.id) || { style: tag.metadata }
      );
      const tagStyles = computeCompositeStyle(styles.map((s) => s.style));
      Object.assign(baseStyle, tagStyles);
    }
    
    return baseStyle;
  });

  const handleClick = () => {
    scripture.toggleTokenSelection(props.token.id);
  };

  return (
    <Popover.Root>
      <Popover.Trigger
        as="span"
        class="tagged-word inline-block cursor-pointer px-0.5 transition-colors"
        classList={{
          'ring-2 ring-blue-500': isSelected(),
          'hover:bg-gray-100': tags().length === 0,
          // Presentation-based classes
          'font-semibold': props.token.presentation?.semanticType === 'proper-noun',
        }}
        style={compositeStyle()}
        onClick={handleClick}
      >
        {props.token.text}
        
        {/* Multiple underlines for overlapping tags */}
        <Show when={tags().length > 0}>
          <span class="absolute bottom-0 left-0 right-0 pointer-events-none">
            <For each={tags()}>
              {(tag, index) => (
                <span
                  class="absolute left-0 right-0 border-b-2"
                  style={{
                    'border-color': tag.metadata.color || '#000',
                    bottom: `${index() * 3}px`,
                  }}
                />
              )}
            </For>
          </span>
        </Show>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content class="z-50 rounded-lg bg-white shadow-lg p-4 max-w-xs">
          <div class="space-y-2">
            <div class="font-semibold text-sm text-gray-700">
              {props.token.text}
            </div>
            
            <Show when={tags().length > 0}>
              <div class="space-y-1">
                <div class="text-xs font-medium text-gray-500">Tags:</div>
                <For each={annotations()}>
                  {(annotation) => {
                    const tag = scripture.state.tags.get(annotation.tagId);
                    return (
                      <div
                        class="flex items-center gap-2 text-sm"
                        style={{ color: tag?.metadata.color }}
                      >
                        <span class="font-medium">{tag?.name}</span>
                        <Show when={annotation.note}>
                          <span class="text-gray-600 text-xs">
                            {annotation.note}
                          </span>
                        </Show>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Show>
          </div>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

### Tag Filter Sidebar

```typescript
// components/TagFilterSidebar.tsx
import { For, createMemo } from 'solid-js';
import { useScripture } from '../contexts/ScriptureContext';
import { ToggleButton } from '@kobalte/core';

export function TagFilterSidebar() {
  const scripture = useScripture();

  const tagList = createMemo(() =>
    Array.from(scripture.state.tags.values())
  );

  const tagsByCategory = createMemo(() => {
    const groups = new Map<string, Tag[]>();
    for (const tag of tagList()) {
      const category = tag.category || 'Uncategorized';
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category)!.push(tag);
    }
    return Array.from(groups.entries());
  });

  return (
    <aside class="w-64 border-r border-gray-200 p-4 overflow-y-auto">
      <h2 class="text-lg font-semibold mb-4">Tag Filters</h2>

      <For each={tagsByCategory()}>
        {([category, tags]) => (
          <div class="mb-6">
            <h3 class="text-sm font-medium text-gray-600 mb-2">
              {category}
            </h3>
            <div class="space-y-1">
              <For each={tags}>
                {(tag) => <TagFilterButton tag={tag} />}
              </For>
            </div>
          </div>
        )}
      </For>
    </aside>
  );
}

function TagFilterButton(props: { tag: Tag }) {
  const scripture = useScripture();

  const isActive = createMemo(() =>
    scripture.activeFilters().has(props.tag.id)
  );

  const annotationCount = createMemo(
    () =>
      scripture.state.annotations.filter((ann) => ann.tagId === props.tag.id)
        .length
  );

  return (
    <ToggleButton.Root
      pressed={isActive()}
      onChange={() => scripture.toggleTagFilter(props.tag.id)}
      class="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors"
      classList={{
        'bg-blue-50 text-blue-700': isActive(),
        'hover:bg-gray-100 text-gray-700': !isActive(),
      }}
    >
      <div class="flex items-center gap-2">
        <span
          class="w-3 h-3 rounded-full"
          style={{ 'background-color': props.tag.metadata.color }}
        />
        <span class="font-medium">{props.tag.name}</span>
      </div>
      <span class="text-xs text-gray-500">
        {annotationCount()}
      </span>
    </ToggleButton.Root>
  );
}
```

### Git Sync Panel Component

```typescript
// components/GitSyncPanel.tsx
import { Show, createSignal } from 'solid-js';
import { useScripture } from '../contexts/ScriptureContext';

export function GitSyncPanel() {
  const scripture = useScripture();
  const [syncing, setSyncing] = createSignal(false);
  
  const handleExport = async () => {
    setSyncing(true);
    await scripture.exportToRepository('default-user');
    setSyncing(false);
  };
  
  const handleImport = async () => {
    setSyncing(true);
    await scripture.importFromRepository('merge');
    setSyncing(false);
  };
  
  return (
    <div class="git-sync-panel p-4 border rounded-lg bg-gray-50">
      <h3 class="font-semibold mb-4 flex items-center gap-2">
        <span>📦</span>
        Git Sync
      </h3>
      
      <div class="space-y-3">
        <div>
          <button
            onClick={handleExport}
            disabled={syncing()}
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing() ? 'Exporting...' : '📤 Export Database'}
          </button>
          <p class="text-xs text-gray-600 mt-1">
            Downloads SQLite database file. Save to <code class="bg-gray-200 px-1 rounded">public/data/annotations/</code> and commit to git.
          </p>
        </div>
        
        <div>
          <button
            onClick={handleImport}
            disabled={syncing()}
            class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {syncing() ? 'Importing...' : '📥 Import from Repository'}
          </button>
          <p class="text-xs text-gray-600 mt-1">
            Loads and merges SQLite databases from committed files in the repository.
          </p>
        </div>
      </div>
      
      <Show when={scripture.state.lastSync}>
        <div class="mt-4 pt-3 border-t border-gray-200">
          <p class="text-xs text-gray-500">
            Last synced: {scripture.state.lastSync?.toLocaleString()}
          </p>
        </div>
      </Show>
    </div>
  );
}
```

### Scripture Display (Presentation-Driven)

```typescript
// components/ScriptureDisplay.tsx
import { For, Show, createResource, createMemo } from 'solid-js';
import { useScripture } from '../contexts/ScriptureContext';
import * as Effect from 'effect/Effect';
import { ScriptureLoader } from '../services/ScriptureLoader';

interface ScriptureDisplayProps {
  translation: string;
  book: string;
  chapter: number;
}

export function ScriptureDisplay(props: ScriptureDisplayProps) {
  const scripture = useScripture();

  // Load chapter data from static JSON files
  const [chapterData] = createResource(
    () => [props.translation, props.book, props.chapter] as const,
    async ([translation, book, chapter]) => {
      const effect = ScriptureLoader.pipe(
        Effect.flatMap((loader) =>
          loader.loadChapter(translation, book, chapter)
        )
      );
      return Effect.runPromise(effect);
    }
  );

  return (
    <div class="max-w-4xl mx-auto p-8">
      <Show when={!chapterData.loading} fallback={<LoadingSkeleton />}>
        <ChapterDisplay chapter={chapterData()!} />
      </Show>
    </div>
  );
}

function ChapterDisplay(props: { chapter: Chapter }) {
  const { chapter } = props;
  
  return (
    <div class="chapter">
      {/* Chapter Heading */}
      <Show when={chapter.presentation.displayHeading && chapter.heading}>
        <div class="chapter-heading mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">
            {chapter.heading.summary}
          </h2>
          <Show when={chapter.heading.topics.length > 0}>
            <div class="text-sm text-gray-600">
              {chapter.heading.topics.join(' • ')}
            </div>
          </Show>
        </div>
      </Show>
      
      {/* Chapter Number */}
      <Show when={chapter.presentation.chapterNumberDisplay !== 'hidden'}>
        <div 
          class="chapter-number mb-6 text-4xl font-bold text-gray-300"
          classList={{
            'text-center': chapter.presentation.chapterNumberDisplay === 'decorative',
          }}
        >
          {chapter.chapter}
        </div>
      </Show>
      
      {/* Verses with sections */}
      <div 
        classList={{
          'columns-2 gap-8': chapter.presentation.twoColumn,
        }}
      >
        <For each={chapter.verses}>
          {(verse) => {
            // Check if verse starts a new section
            const section = chapter.sections.find(s => s.startVerse === verse.verse);
            
            return (
              <>
                <Show when={section}>
                  <SectionHeading heading={section!.heading} />
                </Show>
                <VerseDisplay verse={verse} />
              </>
            );
          }}
        </For>
      </div>
    </div>
  );
}

function SectionHeading(props: { heading: string }) {
  return (
    <h3 class="section-heading text-lg font-semibold text-gray-700 mt-6 mb-3">
      {props.heading}
    </h3>
  );
}

function VerseDisplay(props: { verse: Verse }) {
  const { verse } = props;
  const pres = verse.presentation;
  
  return (
    <div 
      class="verse"
      classList={{
        'mb-4': pres.paragraphEnd,
        'mt-4': pres.paragraphStart,
        'break-inside-avoid': true,
      }}
      data-verse-id={verse.id}
      style={{
        'margin-left': `${pres.indentLevel * 1.5}rem`,
      }}
    >
      <div 
        class="flex gap-3"
        classList={{
          'items-baseline': pres.layoutType === 'prose',
          'items-start': pres.layoutType === 'poetry',
        }}
      >
        {/* Verse Number */}
        <Show when={pres.verseNumberDisplay !== 'hidden'}>
          <span 
            class="verse-number flex-shrink-0"
            classList={{
              'text-sm text-gray-500 font-medium': pres.verseNumberDisplay === 'inline',
              'text-xs text-gray-400': pres.verseNumberDisplay === 'superscript',
              'absolute left-0': pres.verseNumberDisplay === 'margin',
            }}
          >
            {verse.verse}
          </span>
        </Show>
        
        {/* Verse Text */}
        <div 
          class="verse-text leading-relaxed"
          classList={{
            'font-serif': pres.layoutType === 'prose',
            'italic': pres.layoutType === 'poetry',
            'pl-4 border-l-2 border-gray-300': pres.layoutType === 'quotation',
          }}
        >
          {/* Tokens with presentation and punctuation */}
          <For each={verse.tokens}>
            {(token, index) => (
              <>
                {/* Preceding punctuation (if any) */}
                <Show when={token.presentation.precedingPunctuation}>
                  {token.presentation.precedingPunctuation}
                </Show>
                
                {/* The tagged word itself */}
                <TaggedWord token={token} />
                
                {/* Following punctuation (if any) */}
                <Show when={token.presentation.followingPunctuation}>
                  {token.presentation.followingPunctuation}
                </Show>
                
                {/* Space between words (unless there's punctuation or it's the last word) */}
                <Show when={
                  index() < verse.tokens.length - 1 && 
                  !token.presentation.followingPunctuation
                }>
                  {' '}
                </Show>
              </>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div class="space-y-4 animate-pulse">
      <div class="h-8 w-64 bg-gray-200 rounded" />
      <For each={Array.from({ length: 10 })}>
        {() => (
          <div class="flex gap-3">
            <div class="w-6 h-6 bg-gray-200 rounded" />
            <div class="flex-1 h-6 bg-gray-200 rounded" />
          </div>
        )}
      </For>
    </div>
  );
}
```

## Error Handling

### Custom Error Types

```typescript
// errors/AppErrors.ts
import { Data } from 'effect';

export class DatabaseError extends Data.TaggedError('DatabaseError')<{
  cause?: unknown;
}> {}

export class HttpError extends Data.TaggedError('HttpError')<{
  cause?: unknown;
}> {}

export class TagError extends Data.TaggedError('TagError')<{
  reason: 'EmptyName' | 'DuplicateName' | 'NotFound';
}> {}

export class AnnotationError extends Data.TaggedError('AnnotationError')<{
  reason: 'TagNotFound' | 'NoTokens' | 'NotFound' | 'InvalidTokens';
}> {}
```

## File Structure

```
scripture-tag/
├── src/
│   ├── components/
│   │   ├── ScriptureDisplay.tsx
│   │   ├── TaggedWord.tsx
│   │   ├── TagFilterSidebar.tsx
│   │   ├── TagPicker.tsx
│   │   ├── AnnotationEditor.tsx
│   │   └── GitSyncPanel.tsx        # NEW: Git sync UI
│   │
│   ├── contexts/
│   │   └── ScriptureContext.tsx
│   │
│   ├── stores/
│   │   └── scriptureStore.ts
│   │
│   ├── services/
│   │   ├── TagService.ts
│   │   ├── AnnotationService.ts
│   │   ├── ScriptureLoader.ts      # Loads scripture from static JSON
│   │   ├── GitSyncService.ts       # Git sync service
│   │   └── repositories/
│   │       ├── TagRepository.ts
│   │       └── AnnotationRepository.ts
│   │
│   ├── db/
│   │   └── schema.sql               # SQLite schema
│   │
│   ├── workers/
│   │   └── sqlite-worker.ts         # Web Worker for SQLite WASM + OPFS
│   │
│   ├── types/
│   │   ├── scripture.ts
│   │   ├── tag.ts
│   │   └── annotation.ts
│   │
│   ├── utils/
│   │   ├── styleComposition.ts
│   │   ├── exportImport.ts
│   │   └── textSelection.ts
│   │
│   ├── errors/
│   │   └── AppErrors.ts
│   │
│   ├── App.tsx
│   └── index.tsx
│
├── public/
│   ├── data/                        # Git-synced data
│   │   └── annotations/
│   │       ├── manifest.json        # List of SQLite database files
│   │       ├── example-annotations.sqlite
│   │       ├── manifest.json.example
│   │       └── README.md
│   │
│   └── scripture/
│       ├── manifest.json            # Index of all translations
│       └── translations/
│           ├── kjv/
│           │   ├── manifest.json
│           │   ├── gen/             # Genesis
│           │   │   ├── chapter-1.json
│           │   │   └── ...
│           │   ├── ex/              # Exodus
│           │   ├── matt/            # Matthew
│           │   ├── john/            # John
│           │   └── ...              # All 66 OT/NT books
│           ├── bofm/
│           │   ├── manifest.json
│           │   ├── 1-ne/            # 1 Nephi
│           │   │   ├── chapter-1.json
│           │   │   └── ...
│           │   ├── 2-ne/            # 2 Nephi
│           │   ├── alma/            # Alma (63 chapters)
│           │   └── ...              # All 15 BoM books
│           ├── dc/
│           │   ├── manifest.json
│           │   └── dc/              # 138 sections
│           │       ├── chapter-1.json
│           │       └── ...
│           └── pgp/
│               ├── manifest.json
│               ├── moses/           # 8 chapters
│               ├── abr/             # Abraham (5 chapters)
│               ├── js-m/            # JS—Matthew
│               ├── js-h/            # JS—History
│               └── a-of-f/          # Articles of Faith
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── ARCHITECTURE.md
├── QUICK_REFERENCE.md
└── DATA_FLOW.md
```

## Development Workflow

### 1. Initial Setup

```bash
# Install dependencies
npm install

# Create initial data directories
mkdir -p public/data/annotations

# Create manifest file
echo '{"files":[]}' > public/data/annotations/manifest.json

# Start development server (SQLite database auto-initializes on first run)
npm run dev
```

### 2. Adding a New Tag

```typescript
// User creates tag via UI
scripture.createTag('Theme: Salvation', 'Theological');

// Behind the scenes:
// 1. User action triggers store method
// 2. Store calls EffectTS TagService
// 3. Service validates and creates tag
// 4. Repository saves to SQLite via Web Worker with OPFS
// 5. Effect completes, store updates
// 6. SolidJS fine-grained reactivity updates UI
```

### 3. Applying Tag to Words

```typescript
// User selects words 1-3 in Genesis 1:1
scripture.toggleTokenSelection('gen.1.1.1');
scripture.toggleTokenSelection('gen.1.1.2');
scripture.toggleTokenSelection('gen.1.1.3');

// User picks tag from dropdown
scripture.createAnnotation('tag-uuid-123', [
  'gen.1.1.1',
  'gen.1.1.2',
  'gen.1.1.3',
]);

// Behind the scenes:
// 1. AnnotationService validates
// 2. Creates TagAnnotation record
// 3. Saves to SQLite database (OPFS persistence - tags & annotations only)
// 4. Store updates
// 5. Only affected words re-render (3 words, not entire chapter)
```

### 4. Git Sync Workflow

```bash
# User works with annotations in the app (all stored in SQLite with OPFS)

# When ready to commit:
# 1. Click "Export Database" in UI
# 2. Save downloaded file to public/data/annotations/default-user.sqlite
# 3. Update manifest
echo '{"files":["default-user.sqlite"]}' > public/data/annotations/manifest.json

# 4. Commit to git
git add public/data/annotations/
git commit -m "Add my scripture annotations"
git push origin main

# On another device or after pulling changes:
# 1. Open app
# 2. Click "Import from Repository"
# 3. SQLite databases merge into local database (OPFS)
# 4. Continue working with all annotations available
```

### 5. Collaboration Workflow

```bash
# Team member 1 exports their annotations
# Saves as public/data/annotations/team-member-1.sqlite

# Team member 2 exports their annotations
# Saves as public/data/annotations/team-member-2.sqlite

# Update manifest
echo '{
  "files": [
    "team-member-1.sqlite",
    "team-member-2.sqlite"
  ]
}' > public/data/annotations/manifest.json

# Commit and push
git add public/data/annotations/
git commit -m "Add team annotations"
git push

# All team members can now import both database files
# Each database maintains its userId, so you can see who tagged what
# SQLite databases merge efficiently with version conflict resolution
```

## Performance Optimizations

### 1. Fine-Grained Reactivity

SolidJS ensures only the specific words with tag changes re-render:

```typescript
// When toggling a filter, only words with that tag update
scripture.toggleTagFilter('salvation-tag-id');
// ✅ Re-renders: ~50 tagged words
// ❌ Does NOT re-render: 10,000+ other words in chapter
```

### 2. Memoized Computations

```typescript
// Token-tag map is only recomputed when annotations or filters change
const tokenTagMap = createMemo(() => {
  // Expensive computation cached
  const map = new Map<string, TagAnnotation[]>();
  for (const annotation of visibleAnnotations()) {
    for (const tokenId of annotation.tokenIds) {
      // ... build map
    }
  }
  return map;
});
```

### 3. Virtualization (For Long Chapters)

```typescript
// Use @tanstack/solid-virtual for chapters with 100+ verses
import { createVirtualizer } from '@tanstack/solid-virtual';

const virtualizer = createVirtualizer({
  count: verses.length,
  getScrollElement: () => scrollRef,
  estimateSize: () => 40,
  overscan: 5,
});
```

### 4. SQLite Indexes

SQLite indexes on tags and annotations make queries fast:

```typescript
// Fast query for annotations by tag using index
const annotations = await sqlite.query(
  'SELECT * FROM annotations WHERE tag_id = ?',
  ['tag-uuid-123']
);
// SQLite automatically uses idx_annotations_tag_id for optimal performance

// Fast query for annotations containing specific token using JSON functions
const annotations = await sqlite.query(
  `SELECT * FROM annotations 
   WHERE EXISTS (
     SELECT 1 FROM json_each(token_ids) 
     WHERE json_each.value = ?
   )`,
  ['gen.1.1.1']
);
```

### 5. Lazy Loading Scripture

Only load chapters as user navigates:

```typescript
// createResource loads from static JSON files
const [chapter] = createResource(
  () => [translation(), book(), chapterNum()],
  ([translation, book, chapter]) => loadChapter(translation, book, chapter)
);
```

**Note:** Browser HTTP caching and service workers can cache scripture files automatically for offline use if needed.

## Testing Strategy

### Unit Tests (EffectTS Services)

```typescript
// services/__tests__/TagService.test.ts
import { Effect } from 'effect';
import { TagService } from '../TagService';

describe('TagService', () => {
  it('creates a tag successfully', async () => {
    const program = TagService.pipe(
      Effect.flatMap((service) => service.createTag('New Tag', 'Category'))
    );

    const result = await Effect.runPromise(program);

    expect(result.name).toBe('New Tag');
    expect(result.category).toBe('Category');
  });

  it('fails on duplicate tag name', async () => {
    const program = Effect.gen(function* () {
      const service = yield* TagService;
      yield* service.createTag('Duplicate', 'Cat');
      yield* service.createTag('Duplicate', 'Cat'); // Should fail
    });

    await expect(Effect.runPromise(program)).rejects.toThrow();
  });
});
```

### Integration Tests (Store + Services)

```typescript
// stores/__tests__/scriptureStore.test.ts
import { createScriptureStore } from '../scriptureStore';

describe('Scripture Store', () => {
  it('toggles tag filter correctly', () => {
    const store = createScriptureStore();

    store.toggleTagFilter('tag-1');
    expect(store.activeFilters()).toContain('tag-1');

    store.toggleTagFilter('tag-1');
    expect(store.activeFilters()).not.toContain('tag-1');
  });
});
```

### Component Tests (SolidJS Testing Library)

```typescript
// components/__tests__/TaggedWord.test.tsx
import { render } from '@solidjs/testing-library';
import { TaggedWord } from '../TaggedWord';

describe('TaggedWord', () => {
  it('renders word text', () => {
    const token = { id: '1', text: 'beginning', position: 0, verseId: 'gen.1.1' };
    const { getByText } = render(() => <TaggedWord token={token} />);

    expect(getByText('beginning')).toBeInTheDocument();
  });
});
```

## Data Export/Import

### Export

```typescript
// utils/exportImport.ts
export async function exportAllData() {
  // Get SQLite database as Uint8Array from Web Worker
  const dbBytes = await sqlite.exportDatabase();

  // Create blob from database bytes
  const blob = new Blob([dbBytes], {
    type: 'application/vnd.sqlite3',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scripture-tags-backup-${Date.now()}.sqlite`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Import

```typescript
export async function importData(file: File, strategy: 'merge' | 'replace' = 'merge') {
  // Read SQLite database file
  const arrayBuffer = await file.arrayBuffer();
  const dbBytes = new Uint8Array(arrayBuffer);

  // Import database via SQLite service
  await sqlite.importDatabase(dbBytes, strategy);
  
  // Strategy options:
  // - 'merge': INSERT OR REPLACE (keeps newer versions)
  // - 'replace': Clears existing data first
  // - 'skip-existing': INSERT OR IGNORE (keeps existing)
}
```

## Deployment

### Build Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'scripture-data': [/scripture/],
          'vendor': ['solid-js', 'effect', '@sqlite.org/sqlite-wasm'],
        },
      },
    },
  },
});
```

### Static Deployment

```bash
# Build for production
npm run build

# Deploy to Netlify
npm run deploy:netlify

# Or deploy to GitHub Pages
npm run deploy:github
```

### Environment Variables

```env
VITE_SCRIPTURE_BASE_URL=/scripture
VITE_APP_VERSION=1.0.0
```

## Future Enhancements

### Phase 2: Optional Cloud Sync
- Add Supabase backend
- Sync annotations across devices
- Keep SQLite (OPFS) as primary store
- Offline-first with background sync
- Export/import SQLite databases to cloud storage

### Phase 3: Collaboration
- Shared tag sets
- Community annotations
- Export/import collections

### Phase 4: Advanced Features
- AI-suggested tags
- Cross-reference detection
- Statistical analysis
- Visual tag relationships (graph view)

## Key Benefits of This Architecture

1. **Separation of Concerns**: Clear boundaries between UI, state, business logic, and persistence
2. **Type Safety**: TypeScript + EffectTS provides end-to-end type safety
3. **Testability**: EffectTS services are pure and easily testable
4. **Performance**: SolidJS fine-grained reactivity only updates what changed
5. **Maintainability**: Modular structure makes features easy to add/modify
6. **Offline-First**: SQLite with OPFS for user data, static files for scripture
7. **Privacy**: User data stays on device by default (in OPFS)
8. **Scalability**: Architecture supports adding backend sync later
9. **Lightweight**: Only user data in SQLite; scripture loaded on-demand from static files
10. **Fast Queries**: Native SQLite performance with OPFS is 10-50x faster than IndexedDB

## Getting Started

```bash
# Clone repository
git clone https://github.com/yourusername/scripture-tag.git
cd scripture-tag

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

---

## Import Status

All scripture data has been successfully imported and is available in the repository:

✅ **King James Version** - Complete (66 books, all chapters)
✅ **Book of Mormon** - Complete (15 books, all chapters)  
✅ **Doctrine & Covenants** - Complete (138 sections)  
✅ **Pearl of Great Price** - Complete (5 books, all chapters)

**Import Details:**
- Source: ChurchofJesusChrist.org JSON API
- Import Date: November 2025
- Total Files: ~1,500+ chapter JSON files
- Repository Size: Scripture data properly organized by translation/book/chapter
- Manifests: Both main and per-translation manifests generated
- Data Quality: All text tokenized with presentation metadata preserved

**Data Characteristics:**
- Word-level tokenization with proper punctuation handling
- Semantic markers for divine names and proper nouns
- Chapter headings with summaries (topics array present but mostly empty)
- Verse-level presentation metadata (paragraph breaks, indentation, layout)
- Section headings preserved (though most sections arrays are empty in current import)

---

**Last Updated:** November 8, 2025  
**Version:** 1.0.0  
**Scripture Data Version:** 1.0.0 (November 2025 import)

