// Scripture Validation Service - validates imported JSON against HTML source

import * as cheerio from "cheerio";
import { promises as fs } from "fs";
import * as path from "path";
import type { Chapter, RawScriptureData, Verse } from "../types";

const CHURCH_API = {
	baseUrl: "https://www.churchofjesuschrist.org",
	endpoint: (apiPath: string, book: string, chapter: number) =>
		`/study/api/v3/language-pages/type/content?lang=eng&uri=/scriptures/${apiPath}/${book}/${chapter}`,
};

interface SourceVerse {
	number: number;
	text: string;
}

interface ValidationResult {
	book: string;
	chapter: number;
	success: boolean;
	errors: string[];
	warnings: string[];
	sourceVerses: SourceVerse[];
	importedVerses: Verse[];
}

/**
 * Fetch chapter HTML from Church API
 */
export async function fetchChapterSource(
	apiPath: string,
	book: string,
	chapter: number,
): Promise<RawScriptureData> {
	const url = CHURCH_API.baseUrl + CHURCH_API.endpoint(apiPath, book, chapter);

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	return data as RawScriptureData;
}

/**
 * Parse HTML source to extract verses for validation
 */
export function parseSourceVerses(raw: RawScriptureData): SourceVerse[] {
	const verses: SourceVerse[] = [];
	const $ = cheerio.load(raw.content.body);

	$("p.verse").each((index, element) => {
		const $verse = $(element);

		// Get verse number
		const verseNumText = $verse.find("span.verse-number").text().trim();
		const verseNumber = parseInt(verseNumText) || index + 1;

		// Clone the verse to manipulate it
		const $verseClone = $verse.clone();

		// Remove verse number
		$verseClone.find("span.verse-number").remove();

		// For study note refs, remove only the sup marker but keep the word
		$verseClone.find("a.study-note-ref").each((i, el) => {
			const $link = $(el);
			// Remove the superscript marker
			$link.find("sup.marker").remove();
			// Replace the entire link with just its text content (the word)
			$link.replaceWith($link.text());
		});

		// Get verse text and normalize whitespace
		// Remove paragraph markers (¶) which are presentational, not content
		const verseText = $verseClone.text().trim().replace(/\s+/g, " ").replace(/^¶\s*/, "");

		if (verseText) {
			verses.push({
				number: verseNumber,
				text: verseText,
			});
		}
	});

	return verses;
}

/**
 * Load imported chapter JSON from file system
 */
export async function loadImportedChapter(
	translation: string,
	book: string,
	chapter: number,
): Promise<Chapter | null> {
	const filePath = path.join(
		process.cwd(),
		"public",
		"scripture",
		"translations",
		translation,
		book,
		`chapter-${chapter}.json`,
	);

	try {
		const content = await fs.readFile(filePath, "utf-8");
		return JSON.parse(content) as Chapter;
	} catch (error) {
		return null;
	}
}

/**
 * Reconstruct verse text from tokens (including punctuation)
 */
export function reconstructVerseText(verse: Verse): string {
	return verse.tokens
		.map((token) => {
			const preceding = token.presentation?.precedingPunctuation || "";
			const following = token.presentation?.followingPunctuation || "";
			return preceding + token.text + following;
		})
		.join(" ");
}

/**
 * Normalize text for comparison (handles minor whitespace/punctuation differences)
 */
export function normalizeText(text: string): string {
	return text
		.toLowerCase()
		.replace(/\s+/g, " ")
		.replace(/['']/g, "'") // Normalize apostrophes
		.replace(/[""]/g, '"') // Normalize quotes
		.trim();
}

/**
 * Validate a single chapter against its source
 */
export async function validateChapter(
	apiPath: string,
	translation: string,
	book: string,
	chapter: number,
): Promise<ValidationResult> {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Fetch source HTML
	let sourceVerses: SourceVerse[] = [];
	try {
		const rawData = await fetchChapterSource(apiPath, book, chapter);
		sourceVerses = parseSourceVerses(rawData);
	} catch (error) {
		errors.push(`Failed to fetch source: ${error}`);
		return {
			book,
			chapter,
			success: false,
			errors,
			warnings,
			sourceVerses: [],
			importedVerses: [],
		};
	}

	// Load imported JSON
	const imported = await loadImportedChapter(translation, book, chapter);
	if (!imported) {
		errors.push("Imported chapter file not found");
		return {
			book,
			chapter,
			success: false,
			errors,
			warnings,
			sourceVerses,
			importedVerses: [],
		};
	}

	// Validate verse count
	if (sourceVerses.length !== imported.verses.length) {
		errors.push(
			`Verse count mismatch: source has ${sourceVerses.length}, imported has ${imported.verses.length}`,
		);
	}

	// Validate each verse
	const maxVerses = Math.max(sourceVerses.length, imported.verses.length);
	for (let i = 0; i < maxVerses; i++) {
		const sourceVerse = sourceVerses[i];
		const importedVerse = imported.verses[i];

		if (!sourceVerse) {
			errors.push(`Verse ${i + 1}: Present in imported but missing in source`);
			continue;
		}

		if (!importedVerse) {
			errors.push(`Verse ${sourceVerse.number}: Present in source but missing in imported`);
			continue;
		}

		// Check verse number
		if (sourceVerse.number !== importedVerse.verse) {
			errors.push(
				`Verse ${i + 1}: Number mismatch (source: ${sourceVerse.number}, imported: ${importedVerse.verse})`,
			);
		}

		// Check verse text
		const reconstructed = reconstructVerseText(importedVerse);
		const normalizedSource = normalizeText(sourceVerse.text);
		const normalizedImported = normalizeText(reconstructed);

		if (normalizedSource !== normalizedImported) {
			errors.push(
				`Verse ${sourceVerse.number}: Text mismatch\n` +
					`  Source:   "${sourceVerse.text}"\n` +
					`  Imported: "${reconstructed}"`,
			);
		}

		// Check token count is reasonable
		if (importedVerse.tokens.length === 0) {
			warnings.push(`Verse ${sourceVerse.number}: No tokens found`);
		}
	}

	return {
		book,
		chapter,
		success: errors.length === 0,
		errors,
		warnings,
		sourceVerses,
		importedVerses: imported.verses,
	};
}

/**
 * Validate all chapters in a book
 */
export async function validateBook(
	apiPath: string,
	translation: string,
	book: string,
	chapterCount: number,
): Promise<ValidationResult[]> {
	const results: ValidationResult[] = [];

	for (let ch = 1; ch <= chapterCount; ch++) {
		console.log(`  Validating ${book} ${ch}...`);
		const result = await validateChapter(apiPath, translation, book, ch);
		results.push(result);

		// Small delay to be respectful to the API
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	return results;
}

/**
 * Print validation summary
 */
export function printValidationSummary(results: ValidationResult[]): void {
	const totalChapters = results.length;
	const successCount = results.filter((r) => r.success).length;
	const failureCount = totalChapters - successCount;

	console.log("\n" + "=".repeat(60));
	console.log("VALIDATION SUMMARY");
	console.log("=".repeat(60));
	console.log(`Total Chapters: ${totalChapters}`);
	console.log(`✅ Passed: ${successCount}`);
	console.log(`❌ Failed: ${failureCount}`);

	if (failureCount > 0) {
		console.log("\n" + "─".repeat(60));
		console.log("FAILURES:");
		console.log("─".repeat(60));

		for (const result of results) {
			if (!result.success) {
				console.log(`\n${result.book} ${result.chapter}:`);
				for (const error of result.errors) {
					console.log(`  ❌ ${error}`);
				}
			}
		}
	}

	// Print warnings separately
	const resultsWithWarnings = results.filter((r) => r.warnings.length > 0);
	if (resultsWithWarnings.length > 0) {
		console.log("\n" + "─".repeat(60));
		console.log("WARNINGS:");
		console.log("─".repeat(60));

		for (const result of resultsWithWarnings) {
			console.log(`\n${result.book} ${result.chapter}:`);
			for (const warning of result.warnings) {
				console.log(`  ⚠️  ${warning}`);
			}
		}
	}

	console.log("\n" + "=".repeat(60));
}
