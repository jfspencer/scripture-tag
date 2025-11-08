# Scripture Tag - Data Flow & Interaction Patterns

Visual guide to understanding how data flows through the application layers.

## Table of Contents

- [Overview](#overview)
- [Layer Interactions](#layer-interactions)
- [User Workflows](#user-workflows)
- [State Management Flow](#state-management-flow)
- [Error Handling Flow](#error-handling-flow)
- [Performance Optimizations](#performance-optimizations)

## Overview

The application follows a unidirectional data flow with clear separation between layers:

```
User Interaction
      ↓
  UI Component (SolidJS)
      ↓
  Event Handler
      ↓
   Store Action (ViewModel)
      ↓
  Effect-TS Service (Business Logic)
      ↓
  Repository (Data Access)
      ↓
  Dexie/IndexedDB (Storage)
      ↓
  State Update (Reactive)
      ↓
  Component Re-render (Fine-grained)
```

## Layer Interactions

### 1. User Creates a Tag

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERACTION                        │
│  User clicks "Create Tag" button and enters name            │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      UI COMPONENT                            │
│  TagCreationDialog.tsx                                       │
│  - Captures input                                            │
│  - Validates form                                            │
│  - Calls: scripture.createTag(name, category)                │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                     VIEWMODEL LAYER                          │
│  scriptureStore.ts                                           │
│  - Receives: createTag(name, category)                       │
│  - Sets: isLoading = true                                    │
│  - Builds Effect: TagService.createTag(name, category)       │
│  - Executes: Effect.runPromise(effect)                       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                       │
│  TagService.ts                                               │
│  - Validates: name not empty, no duplicates                  │
│  - Creates: Tag object with UUID                             │
│  - Calls: TagRepository.save(tag)                            │
│  - Returns: Effect<Tag, TagError>                            │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER                         │
│  TagRepository.ts                                            │
│  - Wraps: db.tags.put(tag)                                   │
│  - Handles: Database errors                                  │
│  - Returns: Effect<void, DatabaseError>                      │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                         │
│  Dexie → IndexedDB                                           │
│  - Stores: Tag in 'tags' object store                        │
│  - Indexes: id, name, category                               │
│  - Returns: Promise<void>                                    │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACK UP THE CHAIN                         │
│  Effect completes → Store updates → Component re-renders     │
│                                                               │
│  1. Repository effect completes successfully                 │
│  2. Service effect returns Tag                               │
│  3. Store onSuccess callback:                                │
│     - setState('tags', new Map().set(tag.id, tag))           │
│     - setState('isLoading', false)                           │
│  4. SolidJS reactivity:                                      │
│     - Tags signal updates                                    │
│     - TagFilterSidebar re-renders (new tag appears)          │
└─────────────────────────────────────────────────────────────┘
```

### 2. User Applies Tag to Words

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERACTION                        │
│  1. User clicks/selects words in scripture display           │
│  2. User picks tag from dropdown menu                        │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      UI COMPONENTS                           │
│  TaggedWord.tsx (word selection)                             │
│  - onClick: scripture.toggleTokenSelection(tokenId)          │
│  - Updates: selectedTokens Set                               │
│                                                               │
│  TagPicker.tsx (tag selection)                               │
│  - onSelectTag: scripture.createAnnotation(tagId, tokens)    │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                     VIEWMODEL LAYER                          │
│  scriptureStore.ts                                           │
│  Phase 1: Selection                                          │
│  - toggleTokenSelection(tokenId)                             │
│  - Updates: state.selectedTokens Set                         │
│  - Result: Selected words get visual highlight               │
│                                                               │
│  Phase 2: Annotation                                         │
│  - createAnnotation(tagId, tokenIds, note?)                  │
│  - Builds Effect: AnnotationService.createAnnotation(...)    │
│  - Executes: Effect.runPromise(effect)                       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                       │
│  AnnotationService.ts                                        │
│  - Validates: tag exists, tokens not empty                   │
│  - Creates: TagAnnotation object                             │
│    {                                                          │
│      id: UUID,                                               │
│      tagId: "tag-123",                                       │
│      tokenIds: ["gen.1.1.1", "gen.1.1.2"],                  │
│      userId: "default",                                      │
│      createdAt: Date,                                        │
│      version: 1                                              │
│    }                                                          │
│  - Calls: AnnotationRepository.save(annotation)              │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER                         │
│  AnnotationRepository.ts                                     │
│  - Wraps: db.annotations.add(annotation)                     │
│  - IndexedDB stores with multi-entry index on tokenIds       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    REACTIVE UPDATE                           │
│  Effect completes → Store updates → Fine-grained re-render   │
│                                                               │
│  1. Store updates:                                           │
│     - setState('annotations', [...anns, newAnnotation])      │
│     - setState('selectedTokens', new Set()) // Clear         │
│                                                               │
│  2. Memos recompute:                                         │
│     - visibleAnnotations() updates                           │
│     - tokenTagMap() updates (adds mapping)                   │
│                                                               │
│  3. Fine-grained reactivity:                                 │
│     - ONLY TaggedWord components for affected tokens re-render│
│     - Other 10,000+ words in chapter stay untouched          │
│     - Tag appears on selected words instantly                │
└─────────────────────────────────────────────────────────────┘
```

### 3. User Exports to Git Repository

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERACTION                        │
│  User clicks "Export to Repository" button                  │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      UI COMPONENT                            │
│  GitSyncPanel.tsx                                            │
│  - onClick: scripture.exportToRepository('default-user')     │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                     VIEWMODEL LAYER                          │
│  scriptureStore.ts                                           │
│  - exportToRepository(userId)                                │
│  - Builds Effect: GitSyncService.exportToFile(userId)        │
│  - Executes: Effect.runPromise(effect)                       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                       │
│  GitSyncService.ts                                           │
│  - Queries: db.tags.toArray()                                │
│  - Queries: db.annotations.toArray()                         │
│  - Queries: db.tagStyles.toArray()                           │
│  - Creates: AnnotationFile object                            │
│    {                                                          │
│      version: "1.0.0",                                       │
│      userId: "default-user",                                 │
│      exportDate: "2025-11-08T...",                           │
│      tags: [...],                                            │
│      annotations: [...],                                     │
│      tagStyles: [...]                                        │
│    }                                                          │
│  - Generates: Blob and triggers browser download             │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER DOWNLOAD                          │
│  - File: default-user.json downloaded to Downloads folder    │
│  - User manually moves to: public/data/annotations/          │
│  - User updates manifest.json                                │
│  - User commits: git add && git commit && git push           │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    GIT REPOSITORY                            │
│  Annotations now version controlled:                         │
│  - Full history of changes                                   │
│  - Can revert to previous versions                           │
│  - Can collaborate via branches/PRs                          │
│  - Can share with others via git clone                       │
└─────────────────────────────────────────────────────────────┘
```

### 4. User Imports from Git Repository

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERACTION                        │
│  User clicks "Import from Repository" button                │
│  (Or app auto-imports on startup)                           │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      UI COMPONENT                            │
│  GitSyncPanel.tsx (or onMount in store)                      │
│  - onClick: scripture.importFromRepository('merge')          │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                     VIEWMODEL LAYER                          │
│  scriptureStore.ts                                           │
│  - importFromRepository(strategy)                            │
│  - Builds Effect: GitSyncService.importFromRepository(...)   │
│  - Executes: Effect.runPromise(effect)                       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                       │
│  GitSyncService.ts                                           │
│  Step 1: Load manifest                                       │
│  - Fetches: /data/annotations/manifest.json                  │
│  - Parses: { files: ["user1.json", "user2.json"] }          │
│                                                               │
│  Step 2: Load each file                                      │
│  - Fetches: /data/annotations/user1.json                     │
│  - Fetches: /data/annotations/user2.json                     │
│  - Parses JSON into AnnotationFile objects                   │
│                                                               │
│  Step 3: Merge into IndexedDB                                │
│  - Strategy: 'merge' (default)                               │
│    → Keeps existing data, adds new                           │
│    → Version conflict: keeps newer version                   │
│  - Strategy: 'replace'                                       │
│    → Clears all existing data, imports fresh                 │
│  - Strategy: 'skip-existing'                                 │
│    → Only imports if ID doesn't exist                        │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER                         │
│  Transaction on IndexedDB:                                   │
│  - db.tags.put(...) for each tag                             │
│  - db.annotations.put(...) for each annotation               │
│  - db.tagStyles.put(...) for each style                      │
│  - Atomic: all succeed or all fail                           │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACK UP THE CHAIN                         │
│  Effect completes → Store reloads → UI updates               │
│                                                               │
│  1. Store calls loadAllData()                                │
│  2. Reads all data from IndexedDB                            │
│  3. Updates reactive state:                                  │
│     - setState('tags', new Map(...))                         │
│     - setState('annotations', [...])                         │
│     - setState('tagStyles', new Map(...))                    │
│     - setState('lastSync', new Date())                       │
│  4. SolidJS reactivity:                                      │
│     - All components with affected data re-render            │
│     - New tags appear in sidebar                             │
│     - New annotations appear on words                        │
└─────────────────────────────────────────────────────────────┘
```

### 5. User Toggles Tag Filter

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERACTION                        │
│  User clicks tag in filter sidebar to show/hide             │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      UI COMPONENT                            │
│  TagFilterButton.tsx                                         │
│  - onClick: scripture.toggleTagFilter(tagId)                 │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                     VIEWMODEL LAYER                          │
│  scriptureStore.ts                                           │
│  - toggleTagFilter(tagId)                                    │
│  - Updates activeFilters signal:                             │
│    Before: Set(['tag-1', 'tag-2'])                           │
│    After:  Set(['tag-1', 'tag-2', 'tag-3']) // Added         │
│    Or:     Set(['tag-1'])                   // Removed tag-2 │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   REACTIVE COMPUTATION                       │
│  Memoized computations automatically update                  │
│                                                               │
│  1. activeFilters signal changes                             │
│     ↓                                                         │
│  2. visibleAnnotations memo recomputes                       │
│     - Filters annotations by active tags                     │
│     - Only includes annotations with filtered tags           │
│     ↓                                                         │
│  3. tokenTagMap memo recomputes                              │
│     - Rebuilds token → annotation mapping                    │
│     - Only for visible annotations                           │
│     ↓                                                         │
│  4. TaggedWord components update                             │
│     - Each word checks: tokenTagMap().get(tokenId)           │
│     - Words with filtered-out tags lose highlighting         │
│     - Words with filtered-in tags gain highlighting          │
│                                                               │
│  NO DATABASE ACCESS - Pure in-memory computation             │
│  FAST - SolidJS fine-grained reactivity                      │
└─────────────────────────────────────────────────────────────┘
```

## User Workflows

### Workflow A: First-Time User Setup

```
1. User opens app for first time
   └→ IndexedDB database created automatically
   └→ No tags or annotations yet
   └→ Scripture data loads from static JSON files

2. User loads Genesis chapter 1
   └→ ScriptureLoader fetches /scripture/kjv/genesis/chapter-1.json
   └→ Verses cached in IndexedDB for offline use
   └→ Displayed in ScriptureDisplay component

3. User creates first tag: "Creation Theme"
   └→ TagService validates and creates tag
   └→ Saved to IndexedDB
   └→ Appears in TagFilterSidebar

4. User selects words "In the beginning God created"
   └→ Each click toggles selectedTokens Set
   └→ Selected words show visual highlight
   └→ TagPicker appears

5. User picks "Creation Theme" tag
   └→ AnnotationService creates TagAnnotation
   └→ Links tag to 5 token IDs
   └→ Saved to IndexedDB
   └→ Words show tag color/style
   └→ Selection cleared

6. User continues tagging...
   └→ All data stays in browser (IndexedDB)
   └→ No server communication
   └→ Works offline
```

### Workflow B: Returning User

```
1. User opens app (second visit)
   └→ Dexie auto-connects to existing IndexedDB
   └→ scriptureStore auto-imports from repository
   └→ Merges any new committed annotations
   └→ Tags, annotations, styles loaded into memory

2. User navigates to previously viewed chapter
   └→ Verses already cached in IndexedDB
   └→ Instant load (no network request)
   └→ Tags appear immediately

3. User toggles filters to study specific themes
   └→ Pure in-memory operations
   └→ Instant visual updates
   └→ No database queries needed

4. User exports data to repository
   └→ exportToRepository() reads from IndexedDB
   └→ JSON file downloaded
   └→ User saves to public/data/annotations/
   └→ Commits to git for version control
```

### Workflow C: Git Collaboration

```
1. User 1 creates annotations
   └→ Tags theological themes in Genesis
   └→ Exports to user1.json
   └→ Commits to git repository

2. User 2 pulls repository
   └→ Gets User 1's annotations
   └→ Opens app, auto-imports on startup
   └→ Sees User 1's tags and annotations
   └→ Can filter by userId to see who tagged what

3. User 2 adds their own annotations
   └→ Tags historical context
   └→ Exports to user2.json
   └→ Updates manifest.json to include both files
   └→ Commits and pushes

4. User 1 pulls latest changes
   └→ Opens app
   └→ Auto-imports both files
   └→ Now has combined annotations
   └→ Both users' work is preserved

5. Merge conflicts (if same annotation modified)
   └→ Version-based resolution: keeps newer version
   └→ Or manual resolution via git before importing
```

### Workflow D: Power User with Many Tags

```
1. User has 100 tags and 10,000 annotations
   └→ Initial load reads from IndexedDB
   └→ Dexie's indexes make queries fast
   └→ tokenTagMap uses multi-entry index

2. User toggles multiple filters simultaneously
   └→ visibleAnnotations memo recalculates
   └→ tokenTagMap memo recalculates
   └→ ONLY affected words re-render
   └→ SolidJS fine-grained reactivity shines here

3. User scrolls through long chapter (150 verses)
   └→ Virtual scroller renders only visible rows
   └→ ~10-15 verses rendered at any time
   └→ Smooth 60fps scrolling

4. User searches for specific annotation
   └→ Dexie query with index:
      db.annotations.where('tokenIds').equals(tokenId)
   └→ Fast retrieval even with thousands of records
```

## State Management Flow

### Store State Structure

```typescript
ScriptureStore {
  // Persisted State (Solid Store)
  state: {
    tags: Map<id, Tag>           // All user tags
    annotations: TagAnnotation[] // All annotations
    verses: Map<id, Verse>       // Cached scripture
    tagStyles: Map<id, Style>    // Custom styles
    selectedTokens: Set<id>      // UI state
    isLoading: boolean
    error: string | null
  }
  
  // UI State (Signals)
  activeFilters: Signal<Set<tagId>>    // Which tags to show
  highlightMode: Signal<'all' | 'filtered' | 'selected'>
  
  // Computed State (Memos)
  visibleAnnotations: Memo<TagAnnotation[]>  // Filtered by activeFilters
  tokenTagMap: Memo<Map<tokenId, TagAnnotation[]>>  // For fast lookup
  
  // Actions (Methods)
  createTag()
  deleteTag()
  createAnnotation()
  toggleTagFilter()
  toggleTokenSelection()
  // ... etc
}
```

### State Update Patterns

**Pattern 1: Append to Array**
```typescript
// Adding new annotation
setState('annotations', (anns) => [...anns, newAnnotation]);
// SolidJS tracks: array reference changed, triggers update
```

**Pattern 2: Update Map**
```typescript
// Adding/updating tag
setState('tags', (tags) => new Map(tags).set(tag.id, tag));
// SolidJS tracks: Map reference changed
```

**Pattern 3: Toggle Set**
```typescript
// Toggle filter
setActiveFilters((prev) => {
  const next = new Set(prev);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
});
// Signal updates, dependent memos recompute
```

**Pattern 4: Bulk Update with Transaction**
```typescript
batch(() => {
  setState('annotations', [...]);
  setState('selectedTokens', new Set());
  setState('isLoading', false);
});
// All updates batched, single re-render pass
```

## Error Handling Flow

### Success Path
```
User Action
  ↓
Effect-TS Service (validates, executes)
  ↓
Repository (saves to DB)
  ↓
Success! Effect<Result>
  ↓
Store onSuccess callback
  ↓
Update state
  ↓
UI updates (happy path)
```

### Error Path
```
User Action
  ↓
Effect-TS Service (validates)
  ↓
Validation fails! Effect.fail(TagError)
  ↓
Effect.runPromise() rejects
  ↓
Store catch block
  ↓
setState('error', errorMessage)
  ↓
UI shows error notification
```

### Error Recovery Example

```typescript
// In store
const createTag = (name: string) => {
  const effect = TagService.pipe(
    Effect.flatMap((service) => service.createTag(name)),
    Effect.retry({ times: 3, delay: '1 second' }), // Retry on failure
    Effect.catchTag('TagError', (error) => {
      // Handle specific error types
      if (error.reason === 'DuplicateName') {
        return Effect.fail('Tag name already exists');
      }
      return Effect.fail('Unknown error');
    })
  );
  
  runEffect(
    effect,
    (tag) => {
      // Success
      setState('tags', (tags) => new Map(tags).set(tag.id, tag));
      showNotification('Tag created successfully', 'success');
    },
    (error) => {
      // Error
      setState('error', String(error));
      showNotification(String(error), 'error');
    }
  );
};
```

## Performance Optimizations

### 1. Fine-Grained Reactivity

**Without fine-grained reactivity (React):**
```
User toggles filter
  ↓
Entire chapter component re-renders
  ↓
10,000 word components reconcile
  ↓
Virtual DOM diff
  ↓
50 words actually change
  ↓
~100ms render time
```

**With fine-grained reactivity (SolidJS):**
```
User toggles filter
  ↓
activeFilters signal updates
  ↓
visibleAnnotations memo recomputes
  ↓
tokenTagMap memo recomputes
  ↓
ONLY 50 affected TaggedWord components update
  ↓
Direct DOM updates (no virtual DOM)
  ↓
~5ms render time (20x faster)
```

### 2. Memoization Strategy

```typescript
// Expensive computation only runs when dependencies change
const tokenTagMap = createMemo(() => {
  console.log('Building token tag map'); // Only logs when needed
  
  const map = new Map<string, TagAnnotation[]>();
  for (const annotation of visibleAnnotations()) {
    for (const tokenId of annotation.tokenIds) {
      if (!map.has(tokenId)) map.set(tokenId, []);
      map.get(tokenId)!.push(annotation);
    }
  }
  return map;
});

// Dependency chain:
// activeFilters changes → visibleAnnotations recomputes → tokenTagMap recomputes
// But if activeFilters unchanged, tokenTagMap returns cached value instantly
```

### 3. IndexedDB Query Optimization

**Slow (no index):**
```typescript
// Scans all annotations (O(n))
const annotations = await db.annotations.toArray();
const filtered = annotations.filter(a => a.tokenIds.includes(tokenId));
```

**Fast (with multi-entry index):**
```typescript
// Uses index (O(log n))
const annotations = await db.annotations
  .where('tokenIds')
  .equals(tokenId)
  .toArray();
```

**Index definitions:**
```typescript
this.version(1).stores({
  annotations: 'id, tagId, userId, *tokenIds',
  //                                ↑
  //                        Multi-entry index
  //                   Enables fast lookups by any token in array
});
```

### 4. Virtual Scrolling

**Without virtualization:**
```
Large chapter (200 verses × 20 words = 4000 DOM nodes)
  ↓
All rendered at once
  ↓
High memory usage
  ↓
Slow initial render
  ↓
Janky scrolling
```

**With virtualization:**
```
Large chapter (200 verses)
  ↓
Only render visible viewport + overscan (~15 verses)
  ↓
~300 DOM nodes instead of 4000
  ↓
Fast initial render
  ↓
Smooth 60fps scrolling
  ↓
Recycle DOM nodes as user scrolls
```

### 5. Batch Updates

```typescript
import { batch } from 'solid-js';

// Without batching - 3 separate render passes
setState('annotations', newAnnotations);
setState('selectedTokens', new Set());
setState('isLoading', false);

// With batching - single render pass
batch(() => {
  setState('annotations', newAnnotations);
  setState('selectedTokens', new Set());
  setState('isLoading', false);
});
```

## Data Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION STARTUP                       │
│                                                               │
│  1. Dexie connects to IndexedDB                              │
│  2. scriptureStore initialized                               │
│  3. loadFromDB() called                                      │
│     - Tags loaded into Map                                   │
│     - Annotations loaded into Array                          │
│     - Styles loaded into Map                                 │
│  4. Initial render                                           │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    RUNTIME OPERATIONS                        │
│                                                               │
│  User interactions → Store actions → Effect-TS services      │
│                                                               │
│  • All mutations go through Effect-TS                        │
│  • Validated before persistence                              │
│  • Reactive state updates trigger re-renders                 │
│  • Memos cache expensive computations                        │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA PERSISTENCE                          │
│                                                               │
│  • Auto-saved to IndexedDB on every change                   │
│  • No manual "save" button needed                            │
│  • Dexie handles all database operations                     │
│  • Transactions ensure consistency                           │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA EXPORT/BACKUP                        │
│                                                               │
│  User can export at any time:                                │
│  • JSON file download                                        │
│  • Contains all tags, annotations, styles                    │
│  • Can be imported on any device                             │
│  • Enables sharing with others                               │
└─────────────────────────────────────────────────────────────┘
```

## Summary

### Key Principles

1. **Unidirectional Data Flow**: User → UI → Store → Service → Repository → DB → State → UI
2. **Fine-Grained Reactivity**: Only affected components re-render
3. **Effect-TS for Logic**: All business logic in composable, testable Effects
4. **Dexie for Persistence**: IndexedDB with indexes for fast queries
5. **Memoization**: Cache expensive computations, recompute only when needed
6. **Local-First**: Everything works offline, no server required

### Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| Toggle filter | ~5ms | Fine-grained reactivity |
| Apply tag to word | ~10ms | IndexedDB write + state update |
| Load chapter (cached) | ~2ms | From IndexedDB |
| Load chapter (network) | ~100ms | Fetch + parse JSON |
| Export all data | ~50ms | Read from DB + JSON.stringify |
| Search annotations | ~5ms | With proper indexes |

### Scalability

- **Tags**: 100s supported, 1000s possible
- **Annotations**: 10,000s supported with good performance
- **Verses**: Entire Bible (~31,000 verses) can be cached
- **Concurrent operations**: Effect-TS handles concurrency elegantly

---

For more details, see [ARCHITECTURE.md](./ARCHITECTURE.md) and [QUICK_REFERENCE.md](./QUICK_REFERENCE.md).

