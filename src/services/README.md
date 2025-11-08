# Services Layer

This directory contains the Effect-TS services that implement the business logic and data access layers for the scripture tagging system.

## Architecture Overview

```
UI Layer (SolidJS Components)
        ↓
ViewModel Layer (Solid Stores)
        ↓
Business Logic Layer (Effect-TS Services) ← YOU ARE HERE
        ↓
Persistence Layer (SQLite WASM + OPFS)
```

## Directory Structure

```
services/
├── SQLiteService.ts              # Core SQLite database interface
├── TagService.ts                 # Tag management business logic
├── AnnotationService.ts          # Annotation management business logic
├── GitSyncService.ts             # Git-based sync for annotations
├── repositories/
│   ├── TagRepository.ts          # Tag data access layer
│   └── AnnotationRepository.ts   # Annotation data access layer
├── layers.ts                     # Service composition and dependency injection
├── runtime.ts                    # Effect runtime setup
├── index.ts                      # Barrel exports
├── example-usage.ts              # Usage examples
└── README.md                     # This file
```

## Core Services

### SQLiteService

The foundation service that provides access to the SQLite WASM database running in a Web Worker with OPFS persistence.

**Key Features:**
- Query execution with type safety
- Statement execution (INSERT, UPDATE, DELETE)
- Database export/import for git sync
- Automatic schema initialization
- Web Worker for non-blocking operations

**Usage:**
```typescript
import { Effect } from "effect";
import { SQLiteService } from "./services";

const program = Effect.gen(function* () {
  const sqlite = yield* SQLiteService;
  const rows = yield* sqlite.query("SELECT * FROM tags");
  return rows;
});
```

### TagService

Business logic for tag management with validation and business rules.

**Features:**
- Create tags with validation
- Update tag properties
- Delete tags (cascades to annotations)
- Query tags by ID, name, or category
- Duplicate name prevention

**Usage:**
```typescript
import { TagService, runEffect } from "./services";

const createTag = Effect.gen(function* () {
  const tagService = yield* TagService;
  return yield* tagService.createTag("Creation Theme", "Theological", {
    color: "#3b82f6",
    priority: 1,
  });
});

const tag = await runEffect(createTag);
```

### AnnotationService

Business logic for annotation management with validation.

**Features:**
- Create annotations linking tags to tokens
- Update annotation notes and token selections
- Delete annotations
- Query annotations by token, tag, or ID
- Token ID format validation

**Usage:**
```typescript
import { AnnotationService, runEffect } from "./services";

const createAnnotation = Effect.gen(function* () {
  const annotationService = yield* AnnotationService;
  return yield* annotationService.createAnnotation(
    tagId,
    ["gen.1.1.1", "gen.1.1.2"],
    "Optional note"
  );
});

const annotation = await runEffect(createAnnotation);
```

### GitSyncService

Enables git-based version control of annotations by exporting/importing SQLite database files.

**Features:**
- Export database to downloadable file
- Import from repository manifest
- Import from user-uploaded file
- Merge strategies: replace, merge, skip-existing

**Usage:**
```typescript
import { GitSyncService, runEffect } from "./services";

// Export current database
const exportDb = Effect.gen(function* () {
  const gitSync = yield* GitSyncService;
  yield* gitSync.exportToFile("user-id", "annotations.sqlite");
});

// Import from repository
const importDb = Effect.gen(function* () {
  const gitSync = yield* GitSyncService;
  yield* gitSync.importFromRepository("merge");
});
```

## Repositories

### TagRepository

Data access layer for tags with SQLite operations.

**Methods:**
- `save(tag)` - Insert or replace tag
- `findById(id)` - Get tag by ID
- `findByName(name)` - Get tag by name
- `getAll()` - Get all tags
- `delete(id)` - Delete tag
- `findByCategory(category)` - Get tags by category

### AnnotationRepository

Data access layer for annotations with SQLite operations.

**Methods:**
- `save(annotation)` - Insert or replace annotation
- `findById(id)` - Get annotation by ID
- `findByTagId(tagId)` - Get all annotations for a tag
- `findByTokenId(tokenId)` - Get all annotations for a token (uses JSON functions)
- `getAll()` - Get all annotations
- `delete(id)` - Delete annotation
- `deleteByTagId(tagId)` - Delete all annotations for a tag

## Service Composition

### Layers

Services are composed using Effect-TS layers with proper dependency injection:

```typescript
import { AppLayer } from "./services";

// Main application layer includes:
// - SQLiteService (base)
// - TagRepository & AnnotationRepository
// - TagService & AnnotationService
// - GitSyncService
```

**Dependency Graph:**
```
SQLiteService (base layer)
    ↓
TagRepository & AnnotationRepository
    ↓
TagService & AnnotationService & GitSyncService
```

### Runtime

The AppRuntime provides a configured runtime for executing Effects:

```typescript
import { AppRuntime, runEffect, runEffectExit } from "./services";

// Simple execution
const result = await runEffect(myEffect);

// With exit handling
const exit = await runEffectExit(myEffect);
if (exit._tag === "Success") {
  console.log(exit.value);
} else {
  console.error(exit.cause);
}
```

## Error Handling

All services use typed errors from `src/errors/AppErrors.ts`:

- **DatabaseError** - SQLite operation failures
- **TagError** - Tag validation/business logic failures
  - Reasons: EmptyName, DuplicateName, NotFound, InvalidData
- **AnnotationError** - Annotation validation/business logic failures
  - Reasons: TagNotFound, NoTokens, NotFound, InvalidTokens
- **GitSyncError** - Import/export failures
  - Reasons: ManifestNotFound, FileLoadFailed, ImportFailed, ExportFailed

**Example:**
```typescript
const program = Effect.gen(function* () {
  const tagService = yield* TagService;
  return yield* tagService.createTag("").pipe(
    Effect.catchTag("TagError", (error) => {
      console.error("Tag error:", error.reason, error.message);
      return Effect.succeed(null);
    })
  );
});
```

## Integration with SolidJS

Services are used in Solid stores (ViewModel layer) to bridge Effect-TS with reactive state:

```typescript
// In a Solid store
import { createStore } from "solid-js/store";
import { TagService, runEffect } from "./services";

export function createTagStore() {
  const [state, setState] = createStore({
    tags: new Map(),
    isLoading: false,
  });

  const createTag = async (name: string) => {
    setState("isLoading", true);
    
    const effect = Effect.gen(function* () {
      const tagService = yield* TagService;
      return yield* tagService.createTag(name);
    });

    try {
      const tag = await runEffect(effect);
      setState("tags", (tags) => new Map(tags).set(tag.id, tag));
    } catch (error) {
      console.error("Failed to create tag:", error);
    } finally {
      setState("isLoading", false);
    }
  };

  return { state, createTag };
}
```

## Testing

Services are designed to be easily testable:

```typescript
import { Effect } from "effect";
import { TagService, AppLayer } from "./services";

describe("TagService", () => {
  it("creates a tag successfully", async () => {
    const program = Effect.gen(function* () {
      const service = yield* TagService;
      return yield* service.createTag("Test Tag", "Category");
    });

    const tag = await Effect.runPromise(program.pipe(Effect.provide(AppLayer)));
    
    expect(tag.name).toBe("Test Tag");
    expect(tag.category).toBe("Category");
  });
});
```

## Performance Considerations

1. **SQLite with OPFS**: 10-50x faster than IndexedDB
2. **Web Worker**: Non-blocking database operations
3. **Indexes**: Optimized queries for tags and annotations
4. **JSON Functions**: Efficient token_ids array queries
5. **Effect-TS**: Lazy evaluation and automatic resource management

## SQLite Database Schema

```sql
-- Tags table
CREATE TABLE tags (
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

-- Annotations table
CREATE TABLE annotations (
  id TEXT PRIMARY KEY,
  tag_id TEXT NOT NULL,
  token_ids TEXT NOT NULL,  -- JSON array
  user_id TEXT NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL,
  last_modified INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Tag styles table
CREATE TABLE tag_styles (
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
```

## Git Workflow

1. **Export**: User clicks "Export" → downloads `.sqlite` file
2. **Save**: User moves file to `public/data/annotations/`
3. **Update Manifest**: Add filename to `manifest.json`
4. **Commit**: `git add && git commit && git push`
5. **Import**: On app load or manual trigger, merges from manifest files

**Manifest format:**
```json
{
  "files": ["user-1.sqlite", "user-2.sqlite"]
}
```

## See Also

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Full system architecture
- [DATA_FLOW.md](../../DATA_FLOW.md) - Data flow and interaction patterns
- [example-usage.ts](./example-usage.ts) - Detailed usage examples

