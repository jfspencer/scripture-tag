import { For, Show } from "solid-js";
import type { Chapter, TextToken, Verse } from "../types/scripture";

interface ChapterDisplayProps {
	chapter: Chapter;
}

function TokenDisplay(props: { token: TextToken }) {
	const { token } = props;

	const classList = () => ({
		"font-italic": token.presentation.emphasis === "italic",
		"font-bold": token.presentation.emphasis === "bold",
		"font-variant-small-caps": token.presentation.emphasis === "small-caps",
		"text-red-600": token.presentation.emphasis === "red-letter",
		"font-semibold": token.presentation.semanticType === "divine-name",
	});

	return (
		<span classList={classList()}>
			{token.presentation.precedingPunctuation}
			{token.text}
			{token.presentation.followingPunctuation}
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

	const chapterNumberDisplay = () => chapter.presentation?.chapterNumberDisplay || "standard";
	const displayHeading = () => chapter.presentation?.displayHeading ?? true;
	const twoColumn = () => chapter.presentation?.twoColumn ?? false;

	return (
		<div class="h-full overflow-y-auto bg-white">
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
						<p class="text-sm text-gray-600 italic leading-relaxed">{chapter.heading!.summary}</p>
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
	);
}
