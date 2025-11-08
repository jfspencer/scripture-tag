// Scripture Import Pipeline - orchestrates the import process

import { promises as fs } from "fs";
import * as path from "path";
import type { VolumeConfig } from "../data/scriptureVolumes";
import {
	ALL_VOLUMES,
	BOOK_OF_MORMON,
	DOCTRINE_AND_COVENANTS,
	NEW_TESTAMENT,
	OLD_TESTAMENT,
	PEARL_OF_GREAT_PRICE,
} from "../data/scriptureVolumes";
import type { Book, Chapter, ScriptureManifest, TranslationManifest } from "../types";
import * as GenericImporter from "./genericImporter";

export async function saveChapterToFile(chapter: Chapter): Promise<void> {
	const dirPath = path.join(
		process.cwd(),
		"public",
		"scripture",
		"translations",
		chapter.translation,
		chapter.book,
	);
	const filePath = path.join(dirPath, `chapter-${chapter.chapter}.json`);
	const content = JSON.stringify(chapter, null, 2);

	await fs.mkdir(dirPath, { recursive: true });
	await fs.writeFile(filePath, content, "utf-8");
	console.log(`✅ Saved: ${chapter.book} ${chapter.chapter}`);
}

export async function importVolume(volume: VolumeConfig): Promise<Book[]> {
	const books: Book[] = [];

	console.log(`\n📚 Importing ${volume.name}`);
	console.log(`   Books: ${volume.books.length}`);
	console.log(`   Total chapters: ${volume.books.reduce((sum, b) => sum + b.chapters, 0)}\n`);

	for (const bookInfo of volume.books) {
		console.log(`\n📖 ${bookInfo.name}...`);
		const chapters: Chapter[] = [];

		for (let ch = 1; ch <= bookInfo.chapters; ch++) {
			try {
				const rawData = await GenericImporter.fetchChapter(volume.apiPath, bookInfo.id, ch);
				const chapter = GenericImporter.parseChurchData(
					rawData,
					bookInfo.id,
					ch,
					volume.translation,
				);
				chapters.push(chapter);

				// Save to static JSON for distribution
				await saveChapterToFile(chapter);

				// Small delay to be respectful to the API
				await new Promise((resolve) => setTimeout(resolve, 100));
			} catch (error) {
				console.error(`❌ Error importing ${bookInfo.id} chapter ${ch}:`, error);
				// Continue with next chapter
			}
		}

		books.push({
			id: bookInfo.id,
			name: bookInfo.name,
			fullName: bookInfo.fullName,
			abbreviation: bookInfo.name,
			category: bookInfo.category as any,
			chapters,
			metadata: {
				themes: [],
				chapterCount: bookInfo.chapters,
				verseCount: chapters.reduce((sum, ch) => sum + ch.verses.length, 0),
			},
		});

		const verseCount = chapters.reduce((sum, ch) => sum + ch.verses.length, 0);
		console.log(`   ✅ ${chapters.length} chapters, ${verseCount} verses`);
	}

	return books;
}

export async function importBookOfMormon(): Promise<Book[]> {
	return importVolume(BOOK_OF_MORMON);
}

export async function importOldTestament(): Promise<Book[]> {
	return importVolume(OLD_TESTAMENT);
}

export async function importNewTestament(): Promise<Book[]> {
	return importVolume(NEW_TESTAMENT);
}

export async function importDoctrineAndCovenants(): Promise<Book[]> {
	return importVolume(DOCTRINE_AND_COVENANTS);
}

export async function importPearlOfGreatPrice(): Promise<Book[]> {
	return importVolume(PEARL_OF_GREAT_PRICE);
}

// Generate manifest for a specific volume/translation
// Merges with existing manifest if it exists (useful for KJV OT+NT)
export async function generateVolumeManifest(
	translationId: string,
	books: Book[],
	volumeConfig: VolumeConfig,
): Promise<TranslationManifest> {
	const manifestPath = path.join(
		process.cwd(),
		"public",
		"scripture",
		"translations",
		translationId,
		"manifest.json",
	);

	// Check if manifest already exists
	let existingManifest: TranslationManifest | null = null;
	try {
		const existingContent = await fs.readFile(manifestPath, "utf-8");
		existingManifest = JSON.parse(existingContent) as TranslationManifest;
	} catch (error) {
		// Manifest doesn't exist yet, that's fine
	}

	// Convert new books to manifest format
	const newBooks = books.map((book) => ({
		id: book.id,
		name: book.name,
		category: book.category,
		chapters: book.metadata.chapterCount,
	}));

	// If manifest exists, merge books (avoiding duplicates)
	let allBooks = newBooks;
	if (existingManifest) {
		const existingBookIds = new Set(existingManifest.books.map((b) => b.id));
		const uniqueNewBooks = newBooks.filter((b) => !existingBookIds.has(b.id));
		allBooks = [...existingManifest.books, ...uniqueNewBooks];
		console.log(
			`📝 Merging with existing manifest (${existingManifest.books.length} existing + ${uniqueNewBooks.length} new books)`,
		);
	}

	const translationManifest: TranslationManifest = {
		id: translationId,
		name: existingManifest?.name || volumeConfig.name,
		abbreviation: existingManifest?.abbreviation || volumeConfig.abbreviation || volumeConfig.name,
		language: "en",
		copyright: existingManifest?.copyright || volumeConfig.copyright || "Public Domain",
		books: allBooks,
	};

	await fs.mkdir(path.dirname(manifestPath), { recursive: true });
	await fs.writeFile(manifestPath, JSON.stringify(translationManifest, null, 2), "utf-8");
	console.log(`✅ Manifest saved for ${volumeConfig.name}: ${manifestPath}`);
	console.log(`   Total books in manifest: ${allBooks.length}`);

	return translationManifest;
}

// Merge all volume manifests into root manifest
export async function generateRootManifest(): Promise<ScriptureManifest> {
	const translationsDir = path.join(process.cwd(), "public", "scripture", "translations");
	const translations: TranslationManifest[] = [];

	// Read all translation directories
	const entries = await fs.readdir(translationsDir, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.isDirectory()) {
			const manifestPath = path.join(translationsDir, entry.name, "manifest.json");

			try {
				const manifestContent = await fs.readFile(manifestPath, "utf-8");
				const manifest = JSON.parse(manifestContent) as TranslationManifest;
				translations.push(manifest);
			} catch (error) {
				console.warn(`⚠️  No manifest found for ${entry.name}, skipping...`);
			}
		}
	}

	const rootManifest: ScriptureManifest = {
		version: "1.0.0",
		translations,
	};

	const rootManifestPath = path.join(process.cwd(), "public", "scripture", "manifest.json");
	await fs.writeFile(rootManifestPath, JSON.stringify(rootManifest, null, 2), "utf-8");
	console.log(`✅ Root manifest generated with ${translations.length} translations`);

	return rootManifest;
}
