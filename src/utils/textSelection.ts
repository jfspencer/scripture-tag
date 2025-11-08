import type { TextSelection } from "../stores/ScriptureStore";
import type { TextToken } from "../types/scripture";

/**
 * Extracts token ID from a DOM element or its closest parent with a data-token-id attribute
 */
export function getTokenIdFromElement(element: Element | null): string | null {
	if (!element) return null;

	// Check if the element itself has the token ID
	if (element.hasAttribute("data-token-id")) {
		return element.getAttribute("data-token-id");
	}

	// Check parent elements
	const closestToken = element.closest("[data-token-id]");
	return closestToken ? closestToken.getAttribute("data-token-id") : null;
}

/**
 * Gets all tokens between two token IDs in sequential order
 * Token IDs have format: book.chapter.verse.position
 */
export function getTokenRange(
	startTokenId: string,
	endTokenId: string,
	allTokens: TextToken[],
): TextToken[] {
	const startIndex = allTokens.findIndex((t) => t.id === startTokenId);
	const endIndex = allTokens.findIndex((t) => t.id === endTokenId);

	if (startIndex === -1 || endIndex === -1) {
		return [];
	}

	// Ensure we go from lower to higher index
	const [start, end] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];

	return allTokens.slice(start, end + 1);
}

/**
 * Extracts token IDs from a browser selection
 */
export function getTokenIdsFromSelection(selection: Selection, allTokens: TextToken[]): string[] {
	if (!selection.rangeCount || selection.isCollapsed) {
		return [];
	}

	const range = selection.getRangeAt(0);
	const startElement =
		range.startContainer.nodeType === Node.TEXT_NODE
			? range.startContainer.parentElement
			: (range.startContainer as Element);

	const endElement =
		range.endContainer.nodeType === Node.TEXT_NODE
			? range.endContainer.parentElement
			: (range.endContainer as Element);

	const startTokenId = getTokenIdFromElement(startElement);
	const endTokenId = getTokenIdFromElement(endElement);

	if (!startTokenId || !endTokenId) {
		return [];
	}

	const tokens = getTokenRange(startTokenId, endTokenId, allTokens);
	return tokens.map((t) => t.id);
}

/**
 * Converts a browser selection to a TextSelection object
 */
export function createTextSelectionFromBrowserSelection(
	selection: Selection,
	allTokens: TextToken[],
): TextSelection | null {
	console.log("[TextSelection] createTextSelectionFromBrowserSelection called");

	if (!selection.rangeCount || selection.isCollapsed) {
		console.log("[TextSelection] No range or collapsed selection");
		return null;
	}

	const range = selection.getRangeAt(0);
	console.log("[TextSelection] Range:", {
		startContainer: range.startContainer,
		endContainer: range.endContainer,
		startOffset: range.startOffset,
		endOffset: range.endOffset,
	});

	const startElement =
		range.startContainer.nodeType === Node.TEXT_NODE
			? range.startContainer.parentElement
			: (range.startContainer as Element);

	const endElement =
		range.endContainer.nodeType === Node.TEXT_NODE
			? range.endContainer.parentElement
			: (range.endContainer as Element);

	console.log("[TextSelection] Elements:", {
		startElement,
		endElement,
		startHasTokenId: startElement?.hasAttribute("data-token-id"),
		endHasTokenId: endElement?.hasAttribute("data-token-id"),
	});

	const startTokenId = getTokenIdFromElement(startElement);
	const endTokenId = getTokenIdFromElement(endElement);

	console.log("[TextSelection] Token IDs:", {
		startTokenId,
		endTokenId,
	});

	if (!startTokenId || !endTokenId) {
		console.log("[TextSelection] Missing token IDs, returning null");
		return null;
	}

	const tokens = getTokenRange(startTokenId, endTokenId, allTokens);
	console.log("[TextSelection] Token range:", tokens.length, "tokens");

	const tokenIds = tokens.map((t) => t.id);
	const text = tokens.map((t) => t.text).join(" ");

	const result = {
		tokenIds,
		text,
		anchorTokenId: startTokenId,
		focusTokenId: endTokenId,
	};

	console.log("[TextSelection] Result:", result);
	return result;
}

/**
 * Highlights tokens in the DOM by token IDs
 * This returns a cleanup function to remove the highlight
 */
export function highlightTokens(tokenIds: string[], highlightClass: string): () => void {
	const elements: Element[] = [];

	tokenIds.forEach((tokenId) => {
		const element = document.querySelector(`[data-token-id="${tokenId}"]`);
		if (element) {
			element.classList.add(highlightClass);
			elements.push(element);
		}
	});

	// Return cleanup function
	return () => {
		elements.forEach((element) => {
			element.classList.remove(highlightClass);
		});
	};
}

/**
 * Parse token ID to extract book, chapter, verse, and position
 */
export function parseTokenId(tokenId: string): {
	book: string;
	chapter: number;
	verse: number;
	position: number;
} | null {
	const parts = tokenId.split(".");
	if (parts.length !== 4) return null;

	return {
		book: parts[0],
		chapter: parseInt(parts[1], 10),
		verse: parseInt(parts[2], 10),
		position: parseInt(parts[3], 10),
	};
}

/**
 * Compare two token IDs to determine their order
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
export function compareTokenIds(tokenIdA: string, tokenIdB: string): number {
	const a = parseTokenId(tokenIdA);
	const b = parseTokenId(tokenIdB);

	if (!a || !b) return 0;

	// Compare in order: chapter, verse, position
	if (a.chapter !== b.chapter) return a.chapter - b.chapter;
	if (a.verse !== b.verse) return a.verse - b.verse;
	return a.position - b.position;
}

/**
 * Format a token range for display (e.g., "Genesis 1:1-3")
 */
export function formatTokenRange(tokenIds: string[], bookName: string): string {
	if (tokenIds.length === 0) return "";

	const firstToken = parseTokenId(tokenIds[0]);
	const lastToken = parseTokenId(tokenIds[tokenIds.length - 1]);

	if (!firstToken || !lastToken) return "";

	if (firstToken.verse === lastToken.verse) {
		return `${bookName} ${firstToken.chapter}:${firstToken.verse}`;
	}

	return `${bookName} ${firstToken.chapter}:${firstToken.verse}-${lastToken.verse}`;
}
