import { createMemo, For, Show } from "solid-js";
import { useScripture } from "../stores/ScriptureStore";
import type { TagAnnotation } from "../types/tag";
import { formatTokenRange } from "../utils/textSelection";

export function AnnotationSidebar() {
	const [state, actions] = useScripture();

	// Group annotations by tag for better organization
	// Filter by active tag filters if any are set
	const annotationsByTag = createMemo(() => {
		const groups = new Map<string, TagAnnotation[]>();
		const hasActiveFilters = state.activeTagFilters.size > 0;

		for (const annotation of state.annotations) {
			const tag = state.tags.get(annotation.tagId);
			if (!tag) continue;

			// Skip annotations whose tag is not active (if filters are enabled)
			if (hasActiveFilters && !state.activeTagFilters.has(annotation.tagId)) {
				continue;
			}

			if (!groups.has(annotation.tagId)) {
				groups.set(annotation.tagId, []);
			}
			groups.get(annotation.tagId)!.push(annotation);
		}

		return Array.from(groups.entries()).map(([tagId, annotations]) => ({
			tag: state.tags.get(tagId)!,
			annotations,
		}));
	});

	return (
		<aside
			class="annotation-sidebar w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto"
			classList={{ hidden: !state.showAnnotationSidebar }}
		>
			<div class="sticky top-0 bg-gray-50 border-b border-gray-200 p-4 z-10">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-semibold text-gray-800">Annotations</h2>
					<button
						onClick={actions.toggleSidebar}
						class="p-2 hover:bg-gray-200 rounded-md transition-colors"
						title="Close sidebar"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<div class="text-sm text-gray-600">
					<Show when={state.currentChapter} fallback={<p>No chapter loaded</p>}>
						<p class="font-medium">
							{state.currentChapter!.book} {state.currentChapter!.chapter}
						</p>
						<p class="text-xs mt-1">
							{annotationsByTag().reduce((sum, group) => sum + group.annotations.length, 0)} of{" "}
							{state.annotations.length} annotation
							{state.annotations.length !== 1 ? "s" : ""}
							{state.activeTagFilters.size > 0 && " (filtered)"}
						</p>
					</Show>
				</div>
			</div>

			<div class="p-4 space-y-6">
				<Show
					when={annotationsByTag().length > 0}
					fallback={
						<div class="text-center text-gray-500 py-8">
							<p class="text-sm">No annotations yet</p>
							<p class="text-xs mt-2">Select text to create annotations</p>
						</div>
					}
				>
					<For each={annotationsByTag()}>
						{({ tag, annotations }) => (
							<div class="annotation-group">
								<div class="flex items-center gap-2 mb-3">
									<span
										class="w-3 h-3 rounded-full flex-shrink-0"
										style={{ "background-color": tag.metadata.color || "#6b7280" }}
									/>
									<h3 class="font-semibold text-sm text-gray-800">{tag.name}</h3>
									<span class="text-xs text-gray-500">({annotations.length})</span>
								</div>

								<div class="space-y-2">
									<For each={annotations}>
										{(annotation) => <AnnotationCard annotation={annotation} />}
									</For>
								</div>
							</div>
						)}
					</For>
				</Show>
			</div>
		</aside>
	);
}

function AnnotationCard(props: { annotation: TagAnnotation }) {
	const [state, actions] = useScripture();

	const tag = createMemo(() => state.tags.get(props.annotation.tagId));

	const isHovered = createMemo(() => state.hoveredAnnotationId === props.annotation.id);

	const tokenRange = createMemo(() => {
		if (!state.currentChapter) return "";
		return formatTokenRange(props.annotation.tokenIds, state.currentChapter.book);
	});

	const annotationText = createMemo(() => {
		if (!state.currentChapter) return "";

		// Get all tokens for this annotation
		const allTokens = state.currentChapter.verses.flatMap((v) => v.tokens);
		const tokens = props.annotation.tokenIds
			.map((id) => allTokens.find((t) => t.id === id))
			.filter(Boolean);

		return tokens.map((t) => t!.text).join(" ");
	});

	const handleMouseEnter = () => {
		actions.setHoveredAnnotation(props.annotation.id);
	};

	const handleMouseLeave = () => {
		actions.clearHover();
	};

	const handleClick = () => {
		// Scroll to annotation in text
		const firstTokenId = props.annotation.tokenIds[0];
		const element = document.querySelector(`[data-token-id="${firstTokenId}"]`);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	};

	const handleDelete = (e: MouseEvent) => {
		e.stopPropagation();
		if (confirm("Delete this annotation?")) {
			actions.deleteAnnotation(props.annotation.id);
		}
	};

	return (
		<div
			class="annotation-card bg-white rounded-lg p-3 border border-gray-200 transition-all cursor-pointer"
			classList={{
				"ring-2 ring-blue-400 shadow-md": isHovered(),
				"hover:border-gray-300 hover:shadow-sm": !isHovered(),
			}}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onClick={handleClick}
		>
			<div class="flex items-start justify-between gap-2">
				<div class="flex-1 min-w-0">
					<div class="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
						"{annotationText()}"
					</div>
					<div class="text-xs text-gray-500">{tokenRange()}</div>

					<Show when={props.annotation.note}>
						<p class="text-xs text-gray-600 mt-2 italic">{props.annotation.note}</p>
					</Show>
				</div>

				<button
					onClick={handleDelete}
					class="flex-shrink-0 p-1 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
					title="Delete annotation"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
						/>
					</svg>
				</button>
			</div>

			<div class="flex items-center gap-2 mt-2 text-xs text-gray-400">
				<span>{new Date(props.annotation.createdAt).toLocaleDateString()}</span>
				<Show when={props.annotation.lastModified !== props.annotation.createdAt}>
					<span>• Edited</span>
				</Show>
			</div>
		</div>
	);
}
