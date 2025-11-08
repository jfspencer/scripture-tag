import { createMemo, For, Show } from "solid-js";
import { useScripture } from "../stores/ScriptureStore";

/**
 * TagFilterSidebar - Left sidebar for filtering visible tags
 * Shows all tags with checkboxes to toggle visibility
 * Groups tags by category for better organization
 */
export function TagFilterSidebar() {
	const [state, actions] = useScripture();

	// Group tags by category
	const tagsByCategory = createMemo(() => {
		const groups = new Map<string, typeof state.tags>();

		for (const [tagId, tag] of state.tags.entries()) {
			const category = tag.category || "Uncategorized";
			if (!groups.has(category)) {
				groups.set(category, new Map());
			}
			groups.get(category)!.set(tagId, tag);
		}

		// Sort categories alphabetically, with "Uncategorized" last
		const sortedEntries = Array.from(groups.entries()).sort(([a], [b]) => {
			if (a === "Uncategorized") return 1;
			if (b === "Uncategorized") return -1;
			return a.localeCompare(b);
		});

		return sortedEntries.map(([category, tags]) => ({
			category,
			tags: Array.from(tags.entries()).map(([id, tag]) => ({ id, tag })),
		}));
	});

	// Count annotations per tag
	const annotationCounts = createMemo(() => {
		const counts = new Map<string, number>();
		for (const annotation of state.annotations) {
			counts.set(annotation.tagId, (counts.get(annotation.tagId) || 0) + 1);
		}
		return counts;
	});

	const handleToggleAll = () => {
		if (state.activeTagFilters.size === 0) {
			// Enable all filters
			const allTagIds = Array.from(state.tags.keys());
			actions.setActiveFilters(allTagIds);
		} else {
			// Clear all filters
			actions.clearFilters();
		}
	};

	const allFiltersActive = createMemo(
		() => state.activeTagFilters.size === state.tags.size && state.tags.size > 0,
	);

	const noFiltersActive = createMemo(() => state.activeTagFilters.size === 0);

	return (
		<aside class="tag-filter-sidebar w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto flex-shrink-0">
			<div class="sticky top-0 bg-gray-50 border-b border-gray-200 p-4 z-10">
				<h2 class="text-lg font-semibold text-gray-800 mb-2">Tag Filters</h2>
				<p class="text-xs text-gray-600 mb-3">
					{noFiltersActive()
						? "All tags visible"
						: `${state.activeTagFilters.size} of ${state.tags.size} tags filtered`}
				</p>

				<button
					onClick={handleToggleAll}
					class="w-full text-xs py-2 px-3 rounded-md border border-gray-300 hover:bg-gray-100 transition-colors"
				>
					{allFiltersActive() ? "Clear All" : "Select All"}
				</button>
			</div>

			<div class="p-4 space-y-4">
				<Show
					when={state.tags.size > 0}
					fallback={
						<div class="text-center text-gray-500 py-8">
							<p class="text-sm">No tags yet</p>
							<p class="text-xs mt-2">Create tags to filter annotations</p>
						</div>
					}
				>
					<For each={tagsByCategory()}>
						{({ category, tags }) => (
							<div class="tag-category">
								<h3 class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
									{category}
								</h3>
								<div class="space-y-2">
									<For each={tags}>
										{({ id, tag }) => {
											const annotationCount = () => annotationCounts().get(id) || 0;
											const isActive = () => state.activeTagFilters.has(id);

											return (
												<label class="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer transition-colors">
													<input
														type="checkbox"
														checked={isActive()}
														onChange={() => actions.toggleTagFilter(id)}
														class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
													/>
													<span
														class="w-3 h-3 rounded-full flex-shrink-0"
														style={{
															"background-color": tag.metadata.color || "#6b7280",
														}}
													/>
													<span class="flex-1 text-sm text-gray-800 truncate">{tag.name}</span>
													<span class="text-xs text-gray-500 flex-shrink-0">
														{annotationCount()}
													</span>
												</label>
											);
										}}
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
