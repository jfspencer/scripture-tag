# Scripture Tag - Quick Reference Guide

A practical guide for implementing the scripture tagging system. For detailed architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Table of Contents

- [Core Patterns](#core-patterns)
- [Creating Services](#creating-services)
- [Building Components](#building-components)
- [Database Operations](#database-operations)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

## Core Patterns

### 1. EffectTS Service Pattern

All business logic lives in Effect-TS services:

```typescript
// services/MyService.ts
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

export class MyService extends Effect.Service<MyService>()('MyService', {
  effect: Effect.gen(function* () {
    // Get dependencies
    const repo = yield* MyRepository;
    
    // Define operations
    const doSomething = (input: string): Effect.Effect<Result, MyError> =>
      Effect.gen(function* () {
        // Validate
        if (!input) {
          return yield* Effect.fail(new MyError({ reason: 'Invalid' }));
        }
        
        // Execute
        const result = yield* repo.save(input);
        return result;
      });
    
    // Return public API
    return { doSomething } as const;
  }),
  dependencies: [MyRepository.Default],
}) {}
```

### 2. Repository Pattern

Repositories wrap Dexie operations in Effect-TS:

```typescript
// services/repositories/MyRepository.ts
import * as Effect from 'effect/Effect';
import { db } from '../../db/schema';

export class MyRepository extends Effect.Service<MyRepository>()(
  'MyRepository',
  {
    effect: Effect.gen(function* () {
      const save = (data: MyData): Effect.Effect<void, DatabaseError> =>
        Effect.tryPromise({
          try: () => db.myTable.put(data),
          catch: (error) => new DatabaseError({ cause: error }),
        }).pipe(Effect.map(() => undefined));
      
      const findById = (id: string): Effect.Effect<MyData | undefined, DatabaseError> =>
        Effect.tryPromise({
          try: () => db.myTable.get(id),
          catch: (error) => new DatabaseError({ cause: error }),
        });
      
      return { save, findById } as const;
    }),
  }
) {}
```

### 3. Store Pattern (ViewModel Layer)

Stores bridge Effect-TS and SolidJS:

```typescript
// stores/myStore.ts
import { createStore } from 'solid-js/store';
import { createSignal, createMemo } from 'solid-js';
import * as Effect from 'effect/Effect';
import { MyService } from '../services/MyService';

export function createMyStore() {
  const [state, setState] = createStore<MyState>({
    items: [],
    isLoading: false,
    error: null,
  });
  
  // Helper to run effects
  const runEffect = <A, E>(
    effect: Effect.Effect<A, E>,
    onSuccess?: (result: A) => void
  ) => {
    setState('isLoading', true);
    setState('error', null);
    
    Effect.runPromise(effect)
      .then(onSuccess)
      .catch((error) => setState('error', String(error)))
      .finally(() => setState('isLoading', false));
  };
  
  // Actions
  const doSomething = (input: string) => {
    const effect = MyService.pipe(
      Effect.flatMap((service) => service.doSomething(input))
    );
    
    runEffect(effect, (result) => {
      setState('items', (items) => [...items, result]);
    });
  };
  
  return { state, doSomething };
}
```

### 4. Component Pattern

Components consume stores via context:

```typescript
// components/MyComponent.tsx
import { createMemo } from 'solid-js';
import { useMyStore } from '../contexts/MyContext';

export function MyComponent(props: MyProps) {
  const store = useMyStore();
  
  // Memoized computation
  const computedValue = createMemo(() => {
    // Only recomputes when dependencies change
    return store.state.items.filter(i => i.active);
  });
  
  const handleClick = () => {
    store.doSomething('input');
  };
  
  return (
    <div onClick={handleClick}>
      {computedValue().length} items
    </div>
  );
}
```

## Creating Services

### Step 1: Define Error Types

```typescript
// errors/AppErrors.ts
import { Data } from 'effect';

export class TagError extends Data.TaggedError('TagError')<{
  reason: 'EmptyName' | 'DuplicateName' | 'NotFound';
  details?: string;
}> {}
```

### Step 2: Create Repository

```typescript
// services/repositories/TagRepository.ts
export class TagRepository extends Effect.Service<TagRepository>()(
  'TagRepository',
  {
    effect: Effect.gen(function* () {
      // CRUD operations
      const save = (tag: Tag) => /* ... */;
      const findById = (id: string) => /* ... */;
      const getAll = () => /* ... */;
      const delete_ = (id: string) => /* ... */;
      
      return { save, findById, getAll, delete: delete_ } as const;
    }),
  }
) {}
```

### Step 3: Create Service

```typescript
// services/TagService.ts
export class TagService extends Effect.Service<TagService>()('TagService', {
  effect: Effect.gen(function* () {
    const repo = yield* TagRepository;
    
    const createTag = (name: string): Effect.Effect<Tag, TagError> =>
      Effect.gen(function* () {
        // Business logic here
        const tag = { id: crypto.randomUUID(), name, /* ... */ };
        yield* repo.save(tag);
        return tag;
      });
    
    return { createTag } as const;
  }),
  dependencies: [TagRepository.Default],
}) {}
```

### Step 4: Add to Store

```typescript
// stores/scriptureStore.ts
export function createScriptureStore() {
  // ... state setup ...
  
  const createTag = (name: string) => {
    const effect = TagService.pipe(
      Effect.flatMap((service) => service.createTag(name))
    );
    
    runEffect(effect, (tag) => {
      setState('tags', (tags) => new Map(tags).set(tag.id, tag));
    });
  };
  
  return { state, createTag };
}
```

## Building Components

### Basic Component

```typescript
export function MyComponent(props: Props) {
  const store = useScripture();
  
  return (
    <div class="my-component">
      {/* JSX */}
    </div>
  );
}
```

### Component with Memoization

```typescript
export function OptimizedComponent(props: Props) {
  const store = useScripture();
  
  // Only recomputes when props.id changes
  const data = createMemo(() => {
    return store.state.items.find(i => i.id === props.id);
  });
  
  return <div>{data()?.name}</div>;
}
```

### Component with Kobalte

```typescript
import { Popover } from '@kobalte/core';

export function PopoverComponent() {
  return (
    <Popover.Root>
      <Popover.Trigger class="btn">
        Click me
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content class="popover-content">
          Content here
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

### Component with List Rendering

```typescript
import { For, Show } from 'solid-js';

export function ListComponent() {
  const store = useScripture();
  
  return (
    <Show when={store.state.items.length > 0} fallback={<EmptyState />}>
      <For each={store.state.items}>
        {(item) => <ItemCard item={item} />}
      </For>
    </Show>
  );
}
```

## Database Operations

### Basic CRUD

```typescript
// Create
await db.tags.add(newTag);

// Read
const tag = await db.tags.get(tagId);
const allTags = await db.tags.toArray();

// Update
await db.tags.put(updatedTag);

// Delete
await db.tags.delete(tagId);
```

### Queries with Indexes

```typescript
// Find by indexed field
const tag = await db.tags
  .where('name')
  .equals('Salvation')
  .first();

// Find by compound index
const verses = await db.verses
  .where('[book+chapter]')
  .equals(['genesis', 1])
  .toArray();

// Multi-entry index (for arrays)
const annotations = await db.annotations
  .where('tokenIds')
  .equals('gen.1.1.1')
  .toArray();
```

### Transactions

```typescript
await db.transaction('rw', [db.tags, db.annotations], async () => {
  // Delete tag
  await db.tags.delete(tagId);
  
  // Delete all related annotations
  await db.annotations
    .where('tagId')
    .equals(tagId)
    .delete();
});
```

### Bulk Operations

```typescript
// Bulk insert
await db.verses.bulkAdd(versesArray);

// Bulk update
await db.tags.bulkPut(updatedTags);

// Bulk delete
await db.annotations.bulkDelete(annotationIds);
```

## Common Tasks

### Task 1: Add a New Tag

```typescript
// In component:
const handleCreateTag = () => {
  scripture.createTag('New Tag', 'Category');
};

// Behind the scenes:
// 1. Store calls TagService.createTag
// 2. Service validates and creates tag object
// 3. Repository saves to IndexedDB via Dexie
// 4. Effect completes, store updates state
// 5. UI automatically re-renders (reactive)
```

### Task 2: Apply Tag to Selected Words

```typescript
// 1. User selects words (clicking or text selection)
const handleSelectWord = (tokenId: string) => {
  scripture.toggleTokenSelection(tokenId);
};

// 2. User picks tag from dropdown
const handleApplyTag = (tagId: string) => {
  const tokenIds = Array.from(scripture.state.selectedTokens);
  scripture.createAnnotation(tagId, tokenIds);
};

// Result: TagAnnotation created linking tag to tokens
```

### Task 3: Filter by Tag

```typescript
// Toggle filter on/off
const handleToggleFilter = (tagId: string) => {
  scripture.toggleTagFilter(tagId);
};

// Behind the scenes:
// 1. activeFilters signal updates
// 2. visibleAnnotations memo recomputes
// 3. tokenTagMap memo recomputes
// 4. Only affected TaggedWord components re-render
```

### Task 4: Export User Data

```typescript
import { exportAllData } from '../utils/exportImport';

const handleExport = async () => {
  await exportAllData();
  // Downloads JSON file with all tags, annotations, styles
};
```

### Task 5: Load Scripture Chapter

```typescript
import { ScriptureLoader } from '../services/ScriptureLoader';

const loadChapter = async (book: string, chapter: number) => {
  const effect = ScriptureLoader.pipe(
    Effect.flatMap((loader) => 
      loader.loadChapterWithCache('kjv', book, chapter)
    )
  );
  
  const verses = await Effect.runPromise(effect);
  // verses are now cached in IndexedDB and returned
};
```

### Task 6: Customize Tag Style

```typescript
const handleUpdateStyle = (tagId: string, style: Partial<TagStyle['style']>) => {
  scripture.updateTagStyle(tagId, { style });
};

// Example: Change tag color
handleUpdateStyle('tag-123', { backgroundColor: '#ff0000' });
```

### Task 7: Export Annotations to Git

```typescript
// In component:
const handleExport = () => {
  scripture.exportToRepository('my-username');
};

// Behind the scenes:
// 1. GitSyncService reads all data from IndexedDB
// 2. Creates AnnotationFile JSON object
// 3. Triggers browser download
// 4. User saves to public/data/annotations/my-username.json
// 5. User commits to git

// Manual git workflow:
// $ mv ~/Downloads/my-username.json public/data/annotations/
// $ echo '{"files":["my-username.json"]}' > public/data/annotations/manifest.json
// $ git add public/data/
// $ git commit -m "Add my annotations"
// $ git push
```

### Task 8: Import Annotations from Git

```typescript
// On app startup (automatic):
onMount(() => {
  scripture.importFromRepository('merge');
});

// Or manual import:
const handleImport = () => {
  scripture.importFromRepository('merge');
};

// Behind the scenes:
// 1. Fetches /data/annotations/manifest.json
// 2. Loads each file listed in manifest
// 3. Merges into IndexedDB (version conflict resolution)
// 4. Reloads store state
// 5. UI updates with new annotations

// Merge strategies:
scripture.importFromRepository('merge');         // Add new, update existing
scripture.importFromRepository('replace');       // Clear all, import fresh
scripture.importFromRepository('skip-existing'); // Only add new IDs
```

### Task 9: Collaborate via Git

```bash
# Setup: Clone shared repository
git clone https://github.com/study-group/scripture-annotations.git
cd scripture-annotations

# Team member 1: Add annotations
# 1. Work in app (creates annotations)
# 2. Export to user1.json
# 3. Save to public/data/annotations/user1.json
# 4. Update manifest
cat > public/data/annotations/manifest.json << EOF
{
  "files": ["user1.json"]
}
EOF
# 5. Commit and push
git add public/data/annotations/
git commit -m "Add user1 annotations"
git push origin main

# Team member 2: Get and add their annotations
git pull origin main
# Open app, auto-imports user1's annotations
# Add own annotations
# Export to user2.json
# Update manifest to include both files
cat > public/data/annotations/manifest.json << EOF
{
  "files": ["user1.json", "user2.json"]
}
EOF
git add public/data/annotations/
git commit -m "Add user2 annotations"
git push origin main

# Everyone can now see combined annotations
# Each user's work is identified by userId field
```

## Troubleshooting

### Issue: Component not re-rendering

**Problem**: Changes to state don't trigger re-render.

**Solution**: Ensure you're using reactive primitives:

```typescript
// ❌ Wrong - not reactive
const items = store.state.items;

// ✅ Correct - reactive
const items = () => store.state.items;
// Or
const items = createMemo(() => store.state.items);
```

### Issue: Effect not running

**Problem**: Effect-TS service call does nothing.

**Solution**: Make sure you're calling `Effect.runPromise`:

```typescript
// ❌ Wrong - effect not executed
const effect = MyService.pipe(
  Effect.flatMap((s) => s.doSomething())
);

// ✅ Correct - effect executed
Effect.runPromise(effect).then(/* ... */);
```

### Issue: IndexedDB not persisting

**Problem**: Data not saved between sessions.

**Solution**: Check browser IndexedDB limits and ensure `.put()` is called:

```typescript
// Verify data is saved
await db.tags.put(tag);
const saved = await db.tags.get(tag.id);
console.log('Saved?', saved !== undefined);
```

### Issue: Performance problems with many tags

**Problem**: Slow rendering with thousands of tagged words.

**Solutions**:

1. **Use virtualization** for long chapters:
```typescript
import { createVirtualizer } from '@tanstack/solid-virtual';
```

2. **Ensure memoization** is working:
```typescript
// Memoized - only recomputes when dependencies change
const filtered = createMemo(() => items().filter(/* ... */));
```

3. **Check indexes** are properly defined in Dexie:
```typescript
this.version(1).stores({
  annotations: 'id, tagId, *tokenIds', // Multi-entry index on tokenIds
});
```

### Issue: Type errors with Effect-TS

**Problem**: TypeScript errors with Effect types.

**Solution**: Use `Effect.gen` for better inference:

```typescript
// ✅ Good type inference
const myEffect = Effect.gen(function* () {
  const repo = yield* MyRepository; // Type inferred automatically
  const result = yield* repo.findById('123');
  return result;
});
```

### Issue: Kobalte component not styling

**Problem**: Kobalte components look unstyled.

**Solution**: Kobalte is headless - add your own styles:

```typescript
<Popover.Content class="bg-white shadow-lg rounded-lg p-4">
  {/* Content */}
</Popover.Content>
```

## Useful Snippets

### Create Resource with Caching

```typescript
import { createResource } from 'solid-js';

const [data] = createResource(
  () => props.id, // Key (when this changes, refetch)
  async (id) => {
    // Fetcher function
    const effect = MyService.pipe(
      Effect.flatMap((s) => s.getById(id))
    );
    return Effect.runPromise(effect);
  }
);

// Use: data(), data.loading, data.error
```

### Debounced Input

```typescript
import { createSignal } from 'solid-js';
import { debounce } from '@solid-primitives/scheduled';

const [search, setSearch] = createSignal('');

const debouncedSearch = debounce((value: string) => {
  // Perform search
  scripture.searchAnnotations(value);
}, 300);

const handleInput = (e: InputEvent) => {
  const value = (e.target as HTMLInputElement).value;
  setSearch(value);
  debouncedSearch(value);
};
```

### Keyboard Shortcuts

```typescript
import { createKeyHold } from '@solid-primitives/keyboard';

const shift = createKeyHold('Shift');
const ctrl = createKeyHold('Control');

const handleClick = () => {
  if (shift() && ctrl()) {
    // Shift+Ctrl+Click
  }
};
```

### Local Storage Persistence

```typescript
import { createLocalStorage } from '@solid-primitives/storage';

const [settings, setSettings] = createLocalStorage<Settings>('app-settings', {
  theme: 'light',
  fontSize: 16,
});

// settings() and setSettings() auto-persist to localStorage
```

## Best Practices

1. **Keep components small**: One responsibility per component
2. **Use memos for expensive computations**: Avoid recalculating on every render
3. **Leverage fine-grained reactivity**: Only update what changed
4. **Write pure Effect-TS services**: No side effects outside Effect
5. **Add indexes to Dexie tables**: For fields you query frequently
6. **Use transactions for related operations**: Ensure data consistency
7. **Export data regularly**: Provide users with backup functionality
8. **Test services independently**: Effect-TS makes this easy

## Next Steps

1. Implement core services (TagService, AnnotationService)
2. Set up Dexie database schema
3. Create SolidJS store and context
4. Build basic UI components
5. Add scripture data loader
6. Implement tag application workflow
7. Add export/import functionality
8. Polish UI and add animations

---

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

