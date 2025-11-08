import { Dialog } from "@kobalte/core/dialog";
import { Popover } from "@kobalte/core/popover";
import { createMemo, createSignal, For, Show } from "solid-js";
import { useScripture } from "../stores/ScriptureStore";
import type { Tag } from "../types/tag";

interface TagAssignmentPopoverProps {
	open: boolean;
	anchorEl: HTMLElement | null;
	onClose: () => void;
}

export function TagAssignmentPopover(props: TagAssignmentPopoverProps) {
	const [state, actions] = useScripture();
	const [note, setNote] = createSignal("");
	const [showCreateTag, setShowCreateTag] = createSignal(false);

	const availableTags = createMemo(() => Array.from(state.tags.values()));

	const selectedTokenCount = createMemo(() => state.selectedTokens.size);

	const handleAssignTag = (tag: Tag) => {
		const tokenIds = Array.from(state.selectedTokens);
		const noteText = note().trim();

		// Call AnnotationService via store action
		actions.addAnnotation({
			id: crypto.randomUUID(),
			tagId: tag.id,
			tokenIds,
			userId: "default-user", // TODO: Get from auth context
			note: noteText || undefined,
			createdAt: new Date(),
			lastModified: new Date(),
			version: 1,
		});

		// Clear selection and note
		setNote("");
		actions.clearSelection();
		props.onClose();
	};

	return (
		<Show when={props.open && props.anchorEl}>
			<Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
				<Dialog.Portal>
					<Dialog.Overlay class="fixed inset-0 bg-black/20 z-40" />
					<Dialog.Content class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-96 max-h-[80vh] overflow-y-auto z-50">
						<div class="flex items-center justify-between mb-4">
							<Dialog.Title class="text-lg font-semibold text-gray-800">Assign Tag</Dialog.Title>
							<Dialog.CloseButton class="p-2 hover:bg-gray-100 rounded-md transition-colors">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</Dialog.CloseButton>
						</div>

						<div class="mb-4 text-sm text-gray-600">
							<p>
								{selectedTokenCount()} word{selectedTokenCount() !== 1 ? "s" : ""} selected
							</p>
							<Show when={state.currentSelection}>
								<p class="mt-1 text-xs italic">"{state.currentSelection!.text}"</p>
							</Show>
						</div>

						{/* Optional note field */}
						<div class="mb-4">
							<label class="block text-sm font-medium text-gray-700 mb-2">Note (optional)</label>
							<textarea
								value={note()}
								onInput={(e) => setNote(e.currentTarget.value)}
								placeholder="Add a note about this selection..."
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
								rows="3"
							/>
						</div>

						{/* Tag list */}
						<div class="mb-4">
							<div class="flex items-center justify-between mb-2">
								<label class="block text-sm font-medium text-gray-700">Select Tag</label>
								<button
									onClick={() => setShowCreateTag(true)}
									class="text-xs text-blue-600 hover:text-blue-700 font-medium"
								>
									+ Create New
								</button>
							</div>

							<Show
								when={availableTags().length > 0}
								fallback={
									<div class="text-center py-8 text-gray-500 text-sm">
										<p>No tags yet</p>
										<button
											onClick={() => setShowCreateTag(true)}
											class="mt-2 text-blue-600 hover:text-blue-700 font-medium"
										>
											Create your first tag
										</button>
									</div>
								}
							>
								<div class="space-y-2 max-h-64 overflow-y-auto">
									<For each={availableTags()}>
										{(tag) => (
											<button
												onClick={() => handleAssignTag(tag)}
												class="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-md hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
											>
												<span
													class="w-4 h-4 rounded-full flex-shrink-0"
													style={{ "background-color": tag.metadata.color || "#6b7280" }}
												/>
												<div class="flex-1 min-w-0">
													<div class="font-medium text-sm text-gray-900">{tag.name}</div>
													<Show when={tag.description}>
														<div class="text-xs text-gray-500 truncate">{tag.description}</div>
													</Show>
												</div>
												<Show when={tag.category}>
													<span class="text-xs text-gray-400 flex-shrink-0">{tag.category}</span>
												</Show>
											</button>
										)}
									</For>
								</div>
							</Show>
						</div>

						<div class="flex gap-2">
							<button
								onClick={props.onClose}
								class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
							>
								Cancel
							</button>
						</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog>

			{/* Create Tag Dialog */}
			<CreateTagDialog open={showCreateTag()} onClose={() => setShowCreateTag(false)} />
		</Show>
	);
}

interface CreateTagDialogProps {
	open: boolean;
	onClose: () => void;
}

function CreateTagDialog(props: CreateTagDialogProps) {
	const [state, actions] = useScripture();
	const [tagName, setTagName] = createSignal("");
	const [tagDescription, setTagDescription] = createSignal("");
	const [tagCategory, setTagCategory] = createSignal("");
	const [tagColor, setTagColor] = createSignal("#3b82f6");

	const handleCreate = () => {
		const name = tagName().trim();
		if (!name) return;

		const newTag: Tag = {
			id: crypto.randomUUID(),
			name,
			description: tagDescription().trim() || undefined,
			category: tagCategory().trim() || undefined,
			metadata: {
				color: tagColor(),
			},
			createdAt: new Date(),
			userId: "default-user", // TODO: Get from auth context
		};

		actions.addTag(newTag);

		// Clear form
		setTagName("");
		setTagDescription("");
		setTagCategory("");
		setTagColor("#3b82f6");

		props.onClose();
	};

	return (
		<Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
			<Dialog.Portal>
				<Dialog.Overlay class="fixed inset-0 bg-black/20 z-50" />
				<Dialog.Content class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-96 z-50">
					<Dialog.Title class="text-lg font-semibold text-gray-800 mb-4">
						Create New Tag
					</Dialog.Title>

					<div class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Tag Name *</label>
							<input
								type="text"
								value={tagName()}
								onInput={(e) => setTagName(e.currentTarget.value)}
								placeholder="e.g., Salvation Theme"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
							<textarea
								value={tagDescription()}
								onInput={(e) => setTagDescription(e.currentTarget.value)}
								placeholder="Optional description..."
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
								rows="2"
							/>
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
							<input
								type="text"
								value={tagCategory()}
								onInput={(e) => setTagCategory(e.currentTarget.value)}
								placeholder="e.g., Theology, History"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Color</label>
							<div class="flex items-center gap-3">
								<input
									type="color"
									value={tagColor()}
									onInput={(e) => setTagColor(e.currentTarget.value)}
									class="w-12 h-10 rounded border border-gray-300 cursor-pointer"
								/>
								<span class="text-sm text-gray-600">{tagColor()}</span>
							</div>
						</div>
					</div>

					<div class="flex gap-2 mt-6">
						<button
							onClick={props.onClose}
							class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
						>
							Cancel
						</button>
						<button
							onClick={handleCreate}
							disabled={!tagName().trim()}
							class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							Create Tag
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog>
	);
}
