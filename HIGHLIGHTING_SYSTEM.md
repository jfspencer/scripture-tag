# Scripture Tag - Text Highlighting & Annotation System

## Overview

A comprehensive text highlighting and annotation system that enables users to select text ranges, assign tags, view annotations in a sidebar, and interact with bidirectional hover highlighting between text and sidebar.

## Architecture Alignment

This implementation follows the patterns defined in **ARCHITECTURE.md** and **DATA_FLOW.md**:

- **UI Layer**: SolidJS components with Kobalte for accessible UI primitives
- **ViewModel Layer**: Solid Store (`ScriptureStore.tsx`) with fine-grained reactive state
- **Presentation-Driven**: Uses scripture presentation metadata for rendering
- **Local-First**: All state managed in-memory, ready for SQLite persistence integration

## Features Implemented

### 1. Text Selection & Token Mapping

**File**: `src/utils/textSelection.ts`

- Browser text selection → token ID extraction
- Token range calculation (handles multi-word selections)
- Token ID parsing and comparison
- Formatting utilities for display

**Key Functions**:
- `getTokenIdFromElement()` - Extracts token ID from DOM element
- `getTokenRange()` - Gets all tokens between two token IDs
- `createTextSelectionFromBrowserSelection()` - Converts browser selection to TextSelection
- `formatTokenRange()` - Formats token range for display (e.g., "Genesis 1:1-3")

### 2. Scripture Store (State Management)

**File**: `src/stores/ScriptureStore.tsx`

Comprehensive state management following SolidJS patterns:

**State**:
- `currentChapter` - Currently displayed chapter
- `tags` - Map of all tags
- `annotations` - Array of all annotations
- `selectedTokens` - Set of currently selected token IDs
- `currentSelection` - Full selection details (tokenIds, text, anchors)
- `hoveredAnnotationId` - Currently hovered annotation (from sidebar)
- `hoveredTokenIds` - Set of tokens to highlight on hover
- `activeTagFilters` - Set of active tag filters
- `showAnnotationSidebar` - Sidebar visibility toggle

**Actions**:
- Tag management: `addTag()`, `updateTag()`, `deleteTag()`
- Annotation management: `addAnnotation()`, `updateAnnotation()`, `deleteAnnotation()`
- Selection management: `setSelection()`, `clearSelection()`
- Hover management: `setHoveredAnnotation()`, `clearHover()`
- Filter management: `toggleTagFilter()`, `clearFilters()`
- UI management: `toggleSidebar()`, `setCreatingAnnotation()`

### 3. Enhanced Token Display with Highlighting

**File**: `src/components/ChapterDisplay.tsx` (TokenDisplay component)

**Features**:
- **Presentation-based styling** - Respects emphasis, semantic types (divine names, etc.)
- **Annotation highlighting** - Background color and border for annotated tokens
- **Selection highlighting** - Amber outline for selected tokens
- **Hover highlighting** - Blue outline when sidebar annotation is hovered
- **Fine-grained reactivity** - Only affected tokens re-render on state changes

**Visual States** (priority order):
1. **Selected** - Amber background (#fef3c7) with amber outline
2. **Hovered** - Blue background (#dbeafe) with blue outline
3. **Annotated** - Tag color background (20% opacity) with solid border-bottom
4. **Presentation** - Italic, bold, small-caps, red-letter based on scripture metadata

### 4. Annotation Sidebar

**File**: `src/components/AnnotationSidebar.tsx`

**Features**:
- Groups annotations by tag
- Shows annotation text preview (first few tokens)
- Displays verse reference (e.g., "gen 1:1-3")
- Optional note display
- Hover highlights corresponding text in main view
- Click scrolls to annotation in text
- Delete button per annotation
- Sticky header with chapter info

**Components**:
- `AnnotationSidebar` - Main sidebar container
- `AnnotationCard` - Individual annotation display with hover/click handlers

### 5. Tag Assignment UI

**File**: `src/components/TagAssignmentPopover.tsx`

**Features**:
- Modal dialog for assigning tags to selections
- Shows selected word count and preview text
- Optional note field for context
- Tag list with color indicators
- Create new tag inline
- Tag creation form with:
  - Name (required)
  - Description (optional)
  - Category (optional)
  - Color picker

**Components**:
- `TagAssignmentPopover` - Main dialog for tag assignment
- `CreateTagDialog` - Nested dialog for creating new tags

### 6. Text Selection Handler

**File**: `src/components/ChapterDisplay.tsx` (main component)

**Features**:
- `mouseup` event listener for text selection
- Selection validation (ensures selection is within tokens)
- Automatic tag assignment popover display
- Click-outside to clear selection
- Sets current chapter in store on mount

**Event Flow**:
```
User selects text
  ↓
mouseup event
  ↓
Get browser selection
  ↓
Map to token IDs
  ↓
Create TextSelection object
  ↓
Update store state
  ↓
Show TagAssignmentPopover
  ↓
User picks tag
  ↓
Create annotation
  ↓
Clear selection
  ↓
Tokens update with highlighting
```

### 7. Bidirectional Hover Highlighting

**Implementation**:

**Sidebar → Text**:
1. User hovers over annotation in sidebar (`AnnotationCard.onMouseEnter`)
2. Calls `actions.setHoveredAnnotation(annotationId)`
3. Store updates `hoveredAnnotationId` and `hoveredTokenIds`
4. `TokenDisplay` components check `state.hoveredTokenIds.has(tokenId)`
5. Matching tokens apply hover styling (blue outline)

**Text → Sidebar** (future enhancement):
- Could add hover on `TokenDisplay` to highlight corresponding sidebar items
- Use `annotations.find()` to get annotation IDs for token
- Set `hoveredAnnotationId` in store

## Usage

### For End Users

**Creating an Annotation**:
1. Open a scripture chapter
2. Click and drag to select words
3. Tag assignment dialog appears
4. (Optional) Add a note
5. Click a tag or create a new one
6. Selected text is now highlighted with tag color

**Viewing Annotations**:
- Sidebar on the right shows all annotations
- Grouped by tag for easy browsing
- Hover over annotation to highlight text
- Click annotation to scroll to it in text

**Managing Annotations**:
- Click trash icon to delete annotation
- Annotations show creation date and edit status

**Creating Tags**:
- Click "+ Create New" in tag assignment dialog
- Enter name, description, category, and color
- Tag is saved to store (ready for SQLite persistence)

### For Developers

**Integrating with SQLite (Next Step)**:

The store is designed to integrate with Effect-TS services:

```typescript
// Example: Update addAnnotation action to use AnnotationService
actions.addAnnotation = (annotation: TagAnnotation) => {
	const effect = AnnotationService.pipe(
		Effect.flatMap((service) => 
			service.createAnnotation(
				annotation.tagId,
				annotation.tokenIds,
				annotation.note
			)
		)
	);

	runEffect(
		effect,
		(savedAnnotation) => {
			setState("annotations", (prev) => [...prev, savedAnnotation]);
		},
		(error) => {
			setState("error", String(error));
		}
	);
};
```

**Adding Tag Styles**:

The `TagStyle` interface is defined in `types/tag.ts` and can be integrated:

```typescript
interface TagStyle {
	tagId: string;
	userId?: string;
	style: {
		backgroundColor?: string;
		textColor?: string;
		underlineStyle?: "solid" | "dashed" | "dotted" | "wavy" | "double";
		underlineColor?: string;
		fontWeight?: "normal" | "bold" | "semibold";
		opacity?: number;
	};
}
```

Update `TokenDisplay` to use `state.tagStyles.get(tagId)` for enhanced styling.

## Technical Details

### Fine-Grained Reactivity

Following SolidJS patterns, the system ensures minimal re-renders:

```typescript
// In TokenDisplay
const isHovered = createMemo(() => state.hoveredTokenIds.has(token.id));

// When hoveredTokenIds changes, ONLY tokens in that set re-render
// Other 1000+ tokens in chapter stay unchanged
```

### Token ID Format

As per ARCHITECTURE.md:
```
book.chapter.verse.position
Examples:
- gen.1.1.1 (Genesis 1:1, first word)
- john.3.16.4 (John 3:16, fourth word)
```

### Presentation Metadata Usage

Respects scripture presentation as defined in ARCHITECTURE.md:

```typescript
// TokenDisplay uses presentation metadata
if (token.presentation.emphasis === "italic") {
	// Apply italic styling
}

if (token.presentation.semanticType === "divine-name") {
	// Apply small-caps for LORD
}
```

### Performance Considerations

1. **Memoization**: All computed values use `createMemo()`
2. **Fine-grained updates**: Only affected tokens re-render
3. **Set-based lookups**: O(1) checks for selection/hover state
4. **Map-based storage**: O(1) tag and annotation lookups

### Accessibility

- Uses Kobalte Dialog for modals (ARIA-compliant)
- Keyboard navigation support
- Screen reader friendly labels
- Focus management in dialogs

## File Structure

```
src/
├── stores/
│   └── ScriptureStore.tsx          # Central state management
├── components/
│   ├── ChapterDisplay.tsx          # Main scripture view (updated)
│   ├── AnnotationSidebar.tsx       # Right sidebar for annotations
│   └── TagAssignmentPopover.tsx    # Tag assignment modal
├── utils/
│   └── textSelection.ts            # Selection utilities
└── types/
    ├── scripture.ts                # Scripture types (existing)
    └── tag.ts                      # Tag types (existing)
```

## Integration Points

### With Effect-TS Services

Ready to integrate with services defined in ARCHITECTURE.md:
- `TagService` - Tag CRUD operations
- `AnnotationService` - Annotation CRUD operations
- `TagRepository` - SQLite persistence for tags
- `AnnotationRepository` - SQLite persistence for annotations

### With Scripture Loader

Works seamlessly with scripture loading:
```typescript
// In ChapterDisplay
onMount(() => {
	actions.setCurrentChapter(chapter);
	// Annotations and tags overlay on loaded scripture
});
```

### With Git Sync

Annotations are stored in format compatible with GitSyncService:
- Export: `annotations` array → SQLite → git
- Import: SQLite → `annotations` array → UI update

## Next Steps

### Immediate Enhancements

1. **Persist to SQLite**
   - Wire up store actions to AnnotationService and TagService
   - Use Effect-TS for all mutations
   - Enable OPFS persistence

2. **Tag Filters**
   - Add tag filter sidebar (similar to TagFilterSidebar in ARCHITECTURE.md)
   - Filter annotations by active tags
   - Only show filtered annotations in text and sidebar

3. **Tag Styles**
   - Implement custom tag styling
   - Allow users to customize underline style, opacity, etc.
   - Store in `tagStyles` map

4. **Keyboard Shortcuts**
   - `Cmd/Ctrl + T` - Assign tag to selection
   - `Cmd/Ctrl + K` - Create new tag
   - `Escape` - Clear selection

### Advanced Features

1. **Multi-tag Overlap Rendering**
   - Stack underlines for multiple tags
   - Adjustable priority for overlapping annotations

2. **Annotation Search**
   - Full-text search through annotations and notes
   - Filter by tag, date, user

3. **Annotation History**
   - Version tracking (already in schema)
   - View edit history
   - Revert changes

4. **Export/Share**
   - Export annotations as PDF with highlighted text
   - Share annotation sets with others
   - Public annotation collections

## Testing Checklist

- [ ] Select single word → verify highlight
- [ ] Select multiple words → verify all highlighted
- [ ] Assign tag → verify annotation appears in sidebar
- [ ] Hover sidebar annotation → verify text highlights
- [ ] Click sidebar annotation → verify scroll to text
- [ ] Delete annotation → verify removal from text and sidebar
- [ ] Create new tag → verify appears in tag list
- [ ] Multiple annotations on same word → verify visual stacking
- [ ] Click outside selection → verify clear
- [ ] Presentation metadata → verify italic, bold, divine names render correctly

## Known Limitations

1. **Cross-verse selection** - Currently supports, but may have edge cases with verse boundaries
2. **Punctuation handling** - Punctuation is part of token, may affect precise selection boundaries
3. **Mobile touch selection** - May need separate touch event handlers for mobile
4. **Large chapters** - May need virtualization for chapters with 100+ verses (see ARCHITECTURE.md for virtual scrolling)

## References

- **ARCHITECTURE.md** - Overall system architecture and patterns
- **DATA_FLOW.md** - Data flow and interaction patterns
- **types/tag.ts** - Tag and annotation type definitions
- **types/scripture.ts** - Scripture data structures

---

**Implementation Date**: November 8, 2025  
**Status**: ✅ Complete and ready for integration with Effect-TS services and SQLite persistence  
**Architecture Compliance**: ✅ Fully aligned with ARCHITECTURE.md and DATA_FLOW.md patterns

