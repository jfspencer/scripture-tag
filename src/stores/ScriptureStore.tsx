import { Effect } from "effect";
import { createContext, onMount, type ParentComponent, useContext } from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";
import {
	AnnotationService,
	TagService,
	TagStyleRepository,
	runEffect,
	runEffectExit,
} from "../services";
import type { Chapter, TextToken } from "../types/scripture";
import type { Tag, TagAnnotation, TagStyle } from "../types/tag";

export interface TextSelection {
	tokenIds: string[];
	text: string;
	anchorTokenId: string;
	focusTokenId: string;
}

export interface ScriptureStoreState {
	// Current chapter data
	currentChapter: Chapter | null;

	// Tags and annotations
	tags: Map<string, Tag>;
	annotations: TagAnnotation[];
	tagStyles: Map<string, TagStyle>;

	// Selection state
	selectedTokens: Set<string>;
	currentSelection: TextSelection | null;
	isSelecting: boolean;

	// Hover state (for sidebar <-> text bidirectional highlighting)
	hoveredAnnotationId: string | null;
	hoveredTokenIds: Set<string>;

	// Filter state (which tags are visible)
	activeTagFilters: Set<string>;

	// UI state
	showAnnotationSidebar: boolean;
	isCreatingAnnotation: boolean;

	// Loading state
	isLoading: boolean;
	error: string | null;
}

export interface ScriptureStoreActions {
	// Chapter management
	setCurrentChapter: (chapter: Chapter | null) => void;

	// Tag management
	addTag: (tag: Tag) => void;
	updateTag: (tagId: string, updates: Partial<Tag>) => void;
	deleteTag: (tagId: string) => void;
	getTagById: (tagId: string) => Tag | undefined;

	// Annotation management
	addAnnotation: (annotation: TagAnnotation) => void;
	updateAnnotation: (annotationId: string, updates: Partial<TagAnnotation>) => void;
	deleteAnnotation: (annotationId: string) => void;
	getAnnotationsForToken: (tokenId: string) => TagAnnotation[];
	getAnnotationsForTag: (tagId: string) => TagAnnotation[];

	// Selection management
	setSelection: (selection: TextSelection | null) => void;
	clearSelection: () => void;
	selectTokenRange: (startTokenId: string, endTokenId: string) => void;

	// Hover management
	setHoveredAnnotation: (annotationId: string | null) => void;
	setHoveredTokenIds: (tokenIds: string[]) => void;
	clearHover: () => void;

	// Filter management
	toggleTagFilter: (tagId: string) => void;
	clearFilters: () => void;
	setActiveFilters: (tagIds: string[]) => void;

	// UI management
	toggleSidebar: () => void;
	setSidebarVisible: (visible: boolean) => void;
	setCreatingAnnotation: (creating: boolean) => void;

	// Tag style management
	setTagStyle: (tagId: string, style: TagStyle) => void;
	getTagStyle: (tagId: string) => TagStyle | undefined;
}

export type ScriptureStore = [ScriptureStoreState, ScriptureStoreActions];

const ScriptureContext = createContext<ScriptureStore>();

export const ScriptureProvider: ParentComponent = (props) => {
	const [state, setState] = createStore<ScriptureStoreState>({
		currentChapter: null,
		tags: new Map(),
		annotations: [],
		tagStyles: new Map(),
		selectedTokens: new Set(),
		currentSelection: null,
		isSelecting: false,
		hoveredAnnotationId: null,
		hoveredTokenIds: new Set(),
		activeTagFilters: new Set(),
		showAnnotationSidebar: true,
		isCreatingAnnotation: false,
		isLoading: false,
		error: null,
	});

	const actions: ScriptureStoreActions = {
		// Chapter management
		setCurrentChapter: (chapter) => {
			setState("currentChapter", chapter);
		},

		// Tag management
		addTag: (tag) => {
			// Use TagService to create tag with validation and persistence
			const effect = Effect.gen(function* () {
				const service = yield* TagService;
				return yield* service.createTag(tag.name, tag.category, tag.metadata);
			});

			setState("isLoading", true);
			runEffect(effect)
				.then((createdTag) => {
					setState("tags", (prev) => new Map(prev).set(createdTag.id, createdTag));
					setState("isLoading", false);
					setState("error", null);
				})
				.catch((error) => {
					setState("isLoading", false);
					setState("error", String(error));
					console.error("Failed to create tag:", error);
				});
		},

		updateTag: (tagId, updates) => {
			const effect = Effect.gen(function* () {
				const service = yield* TagService;
				return yield* service.updateTag(tagId, updates);
			});

			setState("isLoading", true);
			runEffect(effect)
				.then((updatedTag) => {
					setState("tags", (prev) => new Map(prev).set(tagId, updatedTag));
					setState("isLoading", false);
					setState("error", null);
				})
				.catch((error) => {
					setState("isLoading", false);
					setState("error", String(error));
					console.error("Failed to update tag:", error);
				});
		},

		deleteTag: (tagId) => {
			const effect = Effect.gen(function* () {
				const service = yield* TagService;
				yield* service.deleteTag(tagId);
			});

			setState("isLoading", true);
			runEffect(effect)
				.then(() => {
					setState("tags", (prev) => {
						const updated = new Map(prev);
						updated.delete(tagId);
						return updated;
					});
					// Remove annotations with this tag
					setState("annotations", (prev) => prev.filter((a) => a.tagId !== tagId));
					setState("isLoading", false);
					setState("error", null);
				})
				.catch((error) => {
					setState("isLoading", false);
					setState("error", String(error));
					console.error("Failed to delete tag:", error);
				});
		},

		getTagById: (tagId) => {
			return state.tags.get(tagId);
		},

		// Annotation management
		addAnnotation: (annotation) => {
			console.log("[Store] addAnnotation called with:", {
				tagId: annotation.tagId,
				tokenIds: annotation.tokenIds,
				note: annotation.note,
			});

			// Use AnnotationService to create annotation with validation and persistence
			const effect = Effect.gen(function* () {
				const service = yield* AnnotationService;
				console.log("[Store] AnnotationService acquired, calling createAnnotation");
				const result = yield* service.createAnnotation(
					annotation.tagId,
					annotation.tokenIds,
					annotation.note,
				);
				console.log("[Store] Annotation created successfully:", result);
				return result;
			});

			setState("isLoading", true);
			runEffect(effect)
				.then((createdAnnotation) => {
					console.log("[Store] Adding annotation to state:", createdAnnotation);
					setState("annotations", (prev) => [...prev, createdAnnotation]);
					setState("isLoading", false);
					setState("error", null);
				})
				.catch((error) => {
					console.error("[Store] Failed to create annotation:", error);
					console.error("[Store] Error details:", error.message || error);
					setState("isLoading", false);
					setState("error", String(error));
				});
		},

		updateAnnotation: (annotationId, updates) => {
			const effect = Effect.gen(function* () {
				const service = yield* AnnotationService;
				return yield* service.updateAnnotation(annotationId, updates);
			});

			setState("isLoading", true);
			runEffect(effect)
				.then((updatedAnnotation) => {
					setState("annotations", (prev) =>
						prev.map((a) => (a.id === annotationId ? updatedAnnotation : a)),
					);
					setState("isLoading", false);
					setState("error", null);
				})
				.catch((error) => {
					setState("isLoading", false);
					setState("error", String(error));
					console.error("Failed to update annotation:", error);
				});
		},

		deleteAnnotation: (annotationId) => {
			const effect = Effect.gen(function* () {
				const service = yield* AnnotationService;
				yield* service.deleteAnnotation(annotationId);
			});

			setState("isLoading", true);
			runEffect(effect)
				.then(() => {
					setState("annotations", (prev) => prev.filter((a) => a.id !== annotationId));
					setState("isLoading", false);
					setState("error", null);
				})
				.catch((error) => {
					setState("isLoading", false);
					setState("error", String(error));
					console.error("Failed to delete annotation:", error);
				});
		},

		getAnnotationsForToken: (tokenId) => {
			return state.annotations.filter((a) => a.tokenIds.includes(tokenId));
		},

		getAnnotationsForTag: (tagId) => {
			return state.annotations.filter((a) => a.tagId === tagId);
		},

		// Selection management
		setSelection: (selection) => {
			setState("currentSelection", selection);
			if (selection) {
				setState("selectedTokens", new Set(selection.tokenIds));
			} else {
				setState("selectedTokens", new Set());
			}
		},

		clearSelection: () => {
			setState("currentSelection", null);
			setState("selectedTokens", new Set());
			setState("isSelecting", false);
		},

		selectTokenRange: (startTokenId, endTokenId) => {
			// This will be implemented to find all tokens between start and end
			// For now, just select both
			setState("selectedTokens", new Set([startTokenId, endTokenId]));
		},

		// Hover management
		setHoveredAnnotation: (annotationId) => {
			setState("hoveredAnnotationId", annotationId);
			if (annotationId) {
				const annotation = state.annotations.find((a) => a.id === annotationId);
				if (annotation) {
					setState("hoveredTokenIds", new Set(annotation.tokenIds));
				}
			} else {
				setState("hoveredTokenIds", new Set());
			}
		},

		setHoveredTokenIds: (tokenIds) => {
			setState("hoveredTokenIds", new Set(tokenIds));
		},

		clearHover: () => {
			setState("hoveredAnnotationId", null);
			setState("hoveredTokenIds", new Set());
		},

		// Filter management
		toggleTagFilter: (tagId) => {
			setState("activeTagFilters", (prev) => {
				const updated = new Set(prev);
				if (updated.has(tagId)) {
					updated.delete(tagId);
				} else {
					updated.add(tagId);
				}
				return updated;
			});
		},

		clearFilters: () => {
			setState("activeTagFilters", new Set());
		},

		setActiveFilters: (tagIds) => {
			setState("activeTagFilters", new Set(tagIds));
		},

		// UI management
		toggleSidebar: () => {
			setState("showAnnotationSidebar", (prev) => !prev);
		},

		setSidebarVisible: (visible) => {
			setState("showAnnotationSidebar", visible);
		},

		setCreatingAnnotation: (creating) => {
			setState("isCreatingAnnotation", creating);
		},

		// Tag style management
		setTagStyle: (tagId, style) => {
			// Persist tag style to database
			const effect = Effect.gen(function* () {
				const repo = yield* TagStyleRepository;
				yield* repo.save(style);
			});

			runEffect(effect)
				.then(() => {
					setState("tagStyles", (prev) => new Map(prev).set(tagId, style));
				})
				.catch((error) => {
					console.error("Failed to save tag style:", error);
				});
		},

		getTagStyle: (tagId) => {
			return state.tagStyles.get(tagId);
		},
	};

	// Load initial data from database on mount
	onMount(() => {
		const loadInitialData = Effect.gen(function* () {
			const tagService = yield* TagService;
			const annotationService = yield* AnnotationService;
			const tagStyleRepo = yield* TagStyleRepository;

			// Load all tags
			const tags = yield* tagService.getAllTags();
			const tagMap = new Map(tags.map((tag) => [tag.id, tag]));

			// Load all annotations
			const annotations = yield* annotationService.getAllAnnotations();

			// Load all tag styles
			const tagStyles = yield* tagStyleRepo.getAll();
			const tagStyleMap = new Map(tagStyles.map((style) => [style.tagId, style]));

			return { tags: tagMap, annotations, tagStyles: tagStyleMap };
		});

		setState("isLoading", true);
		runEffect(loadInitialData)
			.then(({ tags, annotations, tagStyles }) => {
				setState("tags", tags);
				setState("annotations", annotations);
				setState("tagStyles", tagStyles);
				setState("isLoading", false);
				setState("error", null);
			})
			.catch((error) => {
				setState("isLoading", false);
				setState("error", String(error));
				console.error("Failed to load initial data:", error);
			});
	});

	return (
		<ScriptureContext.Provider value={[state, actions]}>{props.children}</ScriptureContext.Provider>
	);
};

export function useScripture(): ScriptureStore {
	const context = useContext(ScriptureContext);
	if (!context) {
		throw new Error("useScripture must be used within a ScriptureProvider");
	}
	return context;
}
