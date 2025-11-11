import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { useScripture } from "../stores/ScriptureStore";
import type { Chapter, TextToken, Verse } from "../types/scripture";
import { createTextSelectionFromBrowserSelection } from "../utils/textSelection";
import { AnnotationSidebar } from "./AnnotationSidebar";
import { TagAssignmentPopover } from "./TagAssignmentPopover";
import { TagFilterSidebar } from "./TagFilterSidebar";

interface ChapterDisplayProps {
	chapter: Chapter;
}

function TokenDisplay(props: { token: TextToken }) {
	const { token } = props;
	const [state, actions] = useScripture();

	// Check if this token is selected
	const isSelected = createMemo(() => state.selectedTokens.has(token.id));

	// Check if this token is hovered (from sidebar)
	const isHovered = createMemo(() => state.hoveredTokenIds.has(token.id));

	// Get annotations for this token
	// Filter by active tag filters if any are set
	const annotations = createMemo(() => {
		const hasActiveFilters = state.activeTagFilters.size > 0;
		return state.annotations.filter((ann) => {
			// Check if annotation includes this token
			if (!ann.tokenIds.includes(token.id)) return false;

			// If filters are active, only show annotations for active tags
			if (hasActiveFilters && !state.activeTagFilters.has(ann.tagId)) {
				return false;
			}

			return true;
		});
	});

	// Get tags with colors and styles for this token (sorted by priority)
	const tagsWithStyles = createMemo(() => {
		return annotations()
			.map((ann) => {
				const tag = state.tags.get(ann.tagId);
				const tagStyle = state.tagStyles.get(ann.tagId);
				if (!tag) return null;

				return {
					tag,
					tagStyle,
					// Use custom style color if available, otherwise tag metadata color
					color: tagStyle?.style.backgroundColor || tag.metadata.color || "#6b7280",
				};
			})
			.filter(Boolean)
			.sort((a, b) => (b!.tag.metadata.priority || 0) - (a!.tag.metadata.priority || 0));
	});

	const classList = () => ({
		"font-italic": token.presentation.emphasis === "italic",
		"font-bold": token.presentation.emphasis === "bold",
		"font-variant-small-caps": token.presentation.emphasis === "small-caps",
		"text-red-600": token.presentation.emphasis === "red-letter",
		"font-semibold": token.presentation.semanticType === "divine-name",
	});

	// Compute composite style for annotations with stacked colors and custom styles
	const tokenStyle = createMemo(() => {
		const style: Record<string, string> = {};
		const tagData = tagsWithStyles();

		if (tagData.length > 0) {
			// Take up to 5 tags for visual stacking
			const displayTags = tagData.slice(0, 5);

			// Collect box-shadows and other styles
			const boxShadows: string[] = [];
			const borderBottoms: string[] = [];

			// Apply custom tag styles
			displayTags.forEach((data, i) => {
				const tagStyle = data!.tagStyle?.style;
				const color = data!.color;

				// Custom underline style or default stacked underlines
				if (tagStyle?.underlineStyle) {
					const underlineColor = tagStyle.underlineColor || color;
					const startPos = 1 + i * 3;

					switch (tagStyle.underlineStyle) {
						case "solid":
							boxShadows.push(`0 ${startPos}px 0 0 ${underlineColor}`);
							boxShadows.push(`0 ${startPos + 1}px 0 0 ${underlineColor}`);
							break;
						case "dashed":
							// Use border-bottom for dashed (stacking multiple dashed is complex)
							borderBottoms.push(`2px dashed ${underlineColor}`);
							break;
						case "dotted":
							borderBottoms.push(`2px dotted ${underlineColor}`);
							break;
						case "wavy":
							// Approximate wavy with multiple thin shadows
							for (let offset = 0; offset < 3; offset++) {
								boxShadows.push(`0 ${startPos + offset}px 0 0 ${underlineColor}`);
							}
							break;
						case "double":
							// Double underline
							boxShadows.push(`0 ${startPos}px 0 0 ${underlineColor}`);
							boxShadows.push(`0 ${startPos + 3}px 0 0 ${underlineColor}`);
							break;
					}
				} else {
					// Default solid underline
					const startPos = 1 + i * 3;
					boxShadows.push(`0 ${startPos}px 0 0 ${color}`);
					boxShadows.push(`0 ${startPos + 1}px 0 0 ${color}`);
				}

				// Apply background color (first tag takes precedence, with opacity)
				if (i === 0 && tagStyle?.backgroundColor) {
					const opacity = tagStyle.opacity ?? 0.2;
					style["background-color"] = `${tagStyle.backgroundColor}${Math.round(opacity * 255)
						.toString(16)
						.padStart(2, "0")}`;
				} else if (i === 0) {
					style["background-color"] = `${color}33`; // 20% opacity
				}

				// Apply text color (first tag takes precedence)
				if (i === 0 && tagStyle?.textColor) {
					style["color"] = tagStyle.textColor;
				}

				// Apply font weight (first tag takes precedence)
				if (i === 0 && tagStyle?.fontWeight) {
					style["font-weight"] = tagStyle.fontWeight;
				}
			});

			// Add hover/selection states to box-shadow
			if (isHovered()) {
				boxShadows.push("0 0 0 2px #3b82f6");
				if (!style["background-color"]) {
					style["background-color"] = "#dbeafe40"; // Light blue for hover
				}
			}

			if (isSelected()) {
				boxShadows.push("0 0 0 2px #f59e0b");
				if (!style["background-color"]) {
					style["background-color"] = "#fef3c740"; // Light amber for selection
				}
			}

			if (boxShadows.length > 0) {
				style["box-shadow"] = boxShadows.join(", ");
			}

			if (borderBottoms.length > 0) {
				style["border-bottom"] = borderBottoms[0]; // Only use first border-bottom
			}

			// If more than 5 tags, add a subtle indicator
			if (tagData.length > 5) {
				const displayColors = displayTags.map((d) => d!.color);
				style["border-left"] = "3px solid transparent";
				style["border-image"] =
					"linear-gradient(to bottom, " + displayColors.join(", ") + ", #e5e7eb) 1";
				style["padding-left"] = "3px";
			}
		} else {
			// No annotations - handle hover/selection only
			if (isHovered()) {
				style["background-color"] = "#dbeafe"; // blue-100
				style["box-shadow"] = "0 0 0 2px #3b82f6"; // blue-500
			}

			if (isSelected()) {
				style["background-color"] = "#fef3c7"; // amber-100
				style["box-shadow"] = "0 0 0 2px #f59e0b"; // amber-500
			}
		}

		return style;
	});

	const handleClick = (e: MouseEvent) => {
		e.stopPropagation();
		// Toggle selection on click
		// This will be overridden by text selection for ranges
	};

	// Get display info for tooltip
	const tagCountInfo = createMemo(() => {
		const tags = tagsWithStyles();
		if (tags.length === 0) return null;

		return {
			count: tags.length,
			names: tags.map((t) => t!.tag.name).join(", "),
		};
	});

	return (
		<span
			data-token-id={token.id}
			classList={classList()}
			class="inline-block px-0.5 transition-all cursor-text relative group"
			style={tokenStyle()}
			onClick={handleClick}
			title={tagCountInfo() ? tagCountInfo()!.names : undefined}
		>
			{token.presentation.precedingPunctuation}
			{token.text}
			{token.presentation.followingPunctuation}

			{/* Tag count badge for multiple tags */}
			<Show when={tagCountInfo() && tagCountInfo()!.count > 1}>
				<span
					class="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
					style={{
						"font-size": "9px",
						"line-height": "1",
					}}
				>
					{tagCountInfo()!.count}
				</span>
			</Show>

			{/* Rich tooltip on hover - shows ALL tags */}
			<Show when={tagCountInfo()}>
				<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 max-w-xs">
					<div class="font-semibold mb-2">
						{tagCountInfo()!.count} tag{tagCountInfo()!.count !== 1 ? "s" : ""}
					</div>
					<div class="space-y-1 max-h-64 overflow-y-auto">
						<For each={tagsWithStyles()}>
							{(tagData) => (
								<div class="flex items-center gap-2">
									<span
										class="w-3 h-3 rounded-full flex-shrink-0"
										style={{ "background-color": tagData!.color }}
									/>
									<span class="text-xs whitespace-normal">{tagData!.tag.name}</span>
								</div>
							)}
						</For>
					</div>
					{/* Tooltip arrow */}
					<div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
				</div>
			</Show>
		</span>
	);
}

function VerseDisplay(props: { verse: Verse; showVerseNumber?: boolean }) {
	const { verse } = props;

	const verseNumberDisplay = () => verse.presentation?.verseNumberDisplay || "superscript";
	const layoutType = () => verse.presentation?.layoutType || "prose";
	const indentLevel = () => verse.presentation?.indentLevel || 0;
	const isParagraphStart = () => verse.presentation?.paragraphStart || false;

	const containerClass = () => {
		// Each verse starts on a new line as requested
		const classes = ["block"];

		// Handle layout types
		if (layoutType() === "poetry") {
			classes.push("leading-relaxed");
		} else if (layoutType() === "quotation") {
			classes.push("italic");
		}

		// Handle indentation
		const indent = indentLevel();
		if (indent > 0) {
			classes.push(`ml-${Math.min(indent * 8, 32)}`);
		}

		return classes.join(" ");
	};

	const verseNumberClass = () => {
		const display = verseNumberDisplay();
		// Made bold and 2 points larger as requested
		if (display === "superscript") {
			return "text-sm align-super text-gray-700 font-bold mr-1";
		} else if (display === "margin") {
			return "text-base text-gray-700 font-bold mr-2";
		} else if (display === "inline") {
			return "text-base text-gray-700 font-bold mr-1";
		}
		return "hidden";
	};

	return (
		<div class={containerClass()}>
			<Show when={isParagraphStart()}>
				<br />
			</Show>
			<Show when={props.showVerseNumber !== false && verseNumberDisplay() !== "hidden"}>
				<span class={verseNumberClass()}>{verse.verse}</span>
			</Show>
			<For each={verse.tokens}>
				{(token) => (
					<>
						<TokenDisplay token={token} />{" "}
					</>
				)}
			</For>
		</div>
	);
}

export default function ChapterDisplay(props: ChapterDisplayProps) {
	const { chapter } = props;
	const [state, actions] = useScripture();

	const [showTagAssignment, setShowTagAssignment] = createSignal(false);
	const [selectionAnchor, setSelectionAnchor] = createSignal<HTMLElement | null>(null);

	let chapterRef!: HTMLDivElement;

	// Set current chapter in store
	onMount(() => {
		actions.setCurrentChapter(chapter);
	});

	// Track if we just made a selection to prevent immediate clearing
	const [justSelected, setJustSelected] = createSignal(false);

	// Handle text selection
	const handleSelectionChange = () => {
		const selection = window.getSelection();
		console.log("[Selection] handleSelectionChange called", {
			hasSelection: !!selection,
			isCollapsed: selection?.isCollapsed,
			rangeCount: selection?.rangeCount,
		});

		if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
			console.log("[Selection] No valid selection, returning");
			return;
		}

		// Check if the selection is within our chapter
		const range = selection.getRangeAt(0);
		if (!chapterRef.contains(range.commonAncestorContainer)) {
			console.log("[Selection] Selection is outside chapter, returning");
			return;
		}

		// Get all tokens from chapter
		const allTokens = chapter.verses.flatMap((v) => v.tokens);
		console.log("[Selection] All tokens count:", allTokens.length);

		// Create text selection from browser selection
		const textSelection = createTextSelectionFromBrowserSelection(selection, allTokens);
		console.log("[Selection] Created textSelection:", textSelection);

		if (textSelection && textSelection.tokenIds.length > 0) {
			console.log("[Selection] Valid selection with tokens:", textSelection.tokenIds);
			actions.setSelection(textSelection);

			// Show tag assignment popover
			// Position it near the selection
			setSelectionAnchor(range.startContainer.parentElement);
			setShowTagAssignment(true);
			setJustSelected(true);

			console.log("[Selection] Popover shown, justSelected set to true");

			// Clear the "just selected" flag after a short delay
			setTimeout(() => {
				setJustSelected(false);
				console.log("[Selection] justSelected flag cleared");
			}, 300);
		} else {
			console.log("[Selection] No valid textSelection or no tokens found");
		}
	};

	// Handle mouseup for selection
	const handleMouseUp = (e: MouseEvent) => {
		// Only handle if within our chapter
		if (!chapterRef.contains(e.target as Node)) {
			return;
		}

		// Delay to let the browser update the selection
		setTimeout(handleSelectionChange, 50);
	};

	// Handle click outside to clear selection
	const handleClickOutside = (e: MouseEvent) => {
		// Don't clear if we just made a selection
		if (justSelected()) {
			return;
		}

		const target = e.target as HTMLElement;
		// Don't clear if clicking on sidebar or dialog
		if (
			target.closest(".annotation-sidebar") ||
			target.closest("[role='dialog']") ||
			target.closest("[data-kobalte-portal]")
		) {
			return;
		}

		// If clicking outside the chapter, clear selection
		if (!chapterRef.contains(target)) {
			actions.clearSelection();
			setShowTagAssignment(false);
			return;
		}

		// Check if there's currently a selection
		const selection = window.getSelection();
		if (selection && !selection.isCollapsed) {
			// User is still selecting, don't clear
			return;
		}

		// Otherwise, clear the selection
		actions.clearSelection();
		setShowTagAssignment(false);
	};

	onMount(() => {
		document.addEventListener("mouseup", handleMouseUp);
		// Use mousedown instead of click for more reliable detection
		document.addEventListener("mousedown", handleClickOutside);
	});

	onCleanup(() => {
		document.removeEventListener("mouseup", handleMouseUp);
		document.removeEventListener("mousedown", handleClickOutside);
	});

	const chapterNumberDisplay = () => chapter.presentation?.chapterNumberDisplay || "standard";
	const displayHeading = () => chapter.presentation?.displayHeading ?? true;
	const twoColumn = () => chapter.presentation?.twoColumn ?? false;

	return (
		<div class="flex h-full overflow-hidden">
			{/* Tag Filter Sidebar (left) */}
			<TagFilterSidebar />

			{/* Main scripture content */}
			<div ref={chapterRef} class="flex-1 overflow-y-auto bg-white">
				<div class="max-w-7xl mx-auto px-8 py-12 columns-3 gap-12">
					{/* Chapter Number */}
					<Show when={chapterNumberDisplay() !== "hidden"}>
						<h1
							class="text-center mb-6"
							classList={{
								"text-5xl font-bold text-gray-800": chapterNumberDisplay() === "standard",
								"text-6xl font-serif text-gray-700": chapterNumberDisplay() === "decorative",
							}}
						>
							Chapter {chapter.chapter}
						</h1>
					</Show>

					{/* Chapter Heading/Summary */}
					<Show when={displayHeading() && chapter.heading?.summary}>
						<div class="mb-8 pb-4 border-b border-gray-200">
							{/* <p class="text-sm text-gray-600 italic leading-relaxed">{chapter.heading!.summary}</p> */}
							<Show when={chapter.heading!.topics.length > 0}>
								<div class="mt-2 flex flex-wrap gap-2">
									<For each={chapter.heading!.topics}>
										{(topic) => (
											<span class="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
												{topic}
											</span>
										)}
									</For>
								</div>
							</Show>
						</div>
					</Show>

					{/* Section Headings and Verses */}
					<div class="text-base leading-loose text-gray-900">
						<For each={chapter.verses}>
							{(verse, index) => {
								// Check if there's a section heading before this verse
								const section = chapter.sections.find((s) => s.startVerse === verse.verse);

								return (
									<>
										<Show when={section}>
											<h3 class="text-lg font-semibold text-gray-800 mt-8 mb-4">
												{section!.heading}
											</h3>
										</Show>
										<VerseDisplay verse={verse} />
									</>
								);
							}}
						</For>
					</div>

					{/* Copyright notice */}
					<Show when={chapter.translation !== "kjv"}>
						<div class="mt-12 pt-4 border-t border-gray-200">
							<p class="text-xs text-gray-500 text-center">© Intellectual Reserve, Inc.</p>
						</div>
					</Show>
				</div>
			</div>

			{/* Annotation Sidebar */}
			<AnnotationSidebar />

			{/* Tag Assignment Popover */}
			<TagAssignmentPopover
				open={showTagAssignment()}
				anchorEl={selectionAnchor()}
				onClose={() => {
					setShowTagAssignment(false);
					actions.clearSelection();
				}}
			/>
		</div>
	);
}
