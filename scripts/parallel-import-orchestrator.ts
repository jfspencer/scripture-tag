#!/usr/bin/env bun

// Parallel Import Orchestrator - high-performance parallel import with concurrency control

import { promises as fs } from "fs";
import * as path from "path";
import type { VolumeConfig } from "./importer/data/scriptureVolumes";
import {
	BOOK_OF_MORMON,
	DOCTRINE_AND_COVENANTS,
	NEW_TESTAMENT,
	OLD_TESTAMENT,
	PEARL_OF_GREAT_PRICE,
} from "./importer/data/scriptureVolumes";
import * as GenericImporter from "./importer/services/genericImporter";
import type { Book, Chapter, ScriptureManifest, TranslationManifest } from "./importer/types";

// ============================================================================
// CONFIGURATION
// ============================================================================

interface ParallelConfig {
	// Maximum concurrent volume imports (e.g., BofM + OT + NT at once)
	maxVolumesConcurrency: number;

	// Maximum concurrent book imports within a volume
	maxBooksConcurrency: number;

	// Maximum concurrent chapter imports within a book
	maxChaptersConcurrency: number;

	// Delay between API requests (ms) - be respectful to the server
	apiDelay: number;

	// Maximum retries for failed requests
	maxRetries: number;

	// Delay before retry (ms)
	retryDelay: number;
}

const DEFAULT_CONFIG: ParallelConfig = {
	maxVolumesConcurrency: 3, // Import 3 volumes at once
	maxBooksConcurrency: 5, // Import 5 books at once per volume
	maxChaptersConcurrency: 10, // Import 10 chapters at once per book
	apiDelay: 50, // 50ms between requests
	maxRetries: 3, // Retry failed requests 3 times
	retryDelay: 1000, // Wait 1 second before retry
};

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

interface ProgressStats {
	totalVolumes: number;
	completedVolumes: number;
	totalBooks: number;
	completedBooks: number;
	totalChapters: number;
	completedChapters: number;
	failedChapters: number;
	startTime: number;
}

class ProgressTracker {
	private stats: ProgressStats;
	private lastUpdate: number = 0;
	private updateInterval: number = 1000; // Update UI every 1 second

	constructor(volumes: VolumeConfig[]) {
		const totalBooks = volumes.reduce((sum, v) => sum + v.books.length, 0);
		const totalChapters = volumes.reduce(
			(sum, v) => sum + v.books.reduce((s, b) => s + b.chapters, 0),
			0,
		);

		this.stats = {
			totalVolumes: volumes.length,
			completedVolumes: 0,
			totalBooks,
			completedBooks: 0,
			totalChapters,
			completedChapters: 0,
			failedChapters: 0,
			startTime: Date.now(),
		};
	}

	markChapterComplete(failed: boolean = false): void {
		if (failed) {
			this.stats.failedChapters++;
		}
		this.stats.completedChapters++;
		this.maybeUpdateDisplay();
	}

	markBookComplete(): void {
		this.stats.completedBooks++;
		this.maybeUpdateDisplay();
	}

	markVolumeComplete(): void {
		this.stats.completedVolumes++;
		this.maybeUpdateDisplay();
	}

	private maybeUpdateDisplay(): void {
		const now = Date.now();
		if (now - this.lastUpdate >= this.updateInterval) {
			this.displayProgress();
			this.lastUpdate = now;
		}
	}

	displayProgress(): void {
		const elapsed = (Date.now() - this.stats.startTime) / 1000;
		const chaptersPerSecond = this.stats.completedChapters / elapsed;
		const estimatedTotal = this.stats.totalChapters / chaptersPerSecond;
		const remaining = estimatedTotal - elapsed;

		const progress = (this.stats.completedChapters / this.stats.totalChapters) * 100;

		console.log(`\n${"=".repeat(70)}`);
		console.log(`📊 PROGRESS: ${progress.toFixed(1)}%`);
		console.log(`${"=".repeat(70)}`);
		console.log(`Volumes: ${this.stats.completedVolumes}/${this.stats.totalVolumes}`);
		console.log(`Books:   ${this.stats.completedBooks}/${this.stats.totalBooks}`);
		console.log(
			`Chapters: ${this.stats.completedChapters}/${this.stats.totalChapters} (${this.stats.failedChapters} failed)`,
		);
		console.log(`Speed:    ${chaptersPerSecond.toFixed(1)} chapters/sec`);
		console.log(`Elapsed:  ${this.formatTime(elapsed)}`);
		console.log(`Remaining: ${this.formatTime(remaining)}`);
		console.log(`${"=".repeat(70)}\n`);
	}

	displayFinal(): void {
		const elapsed = (Date.now() - this.stats.startTime) / 1000;
		const chaptersPerSecond = this.stats.completedChapters / elapsed;

		console.log(`\n${"=".repeat(70)}`);
		console.log(`✅ IMPORT COMPLETE!`);
		console.log(`${"=".repeat(70)}`);
		console.log(`Volumes:  ${this.stats.completedVolumes}`);
		console.log(`Books:    ${this.stats.completedBooks}`);
		console.log(`Chapters: ${this.stats.completedChapters} (${this.stats.failedChapters} failed)`);
		console.log(`Duration: ${this.formatTime(elapsed)}`);
		console.log(`Speed:    ${chaptersPerSecond.toFixed(1)} chapters/sec`);
		console.log(`${"=".repeat(70)}\n`);
	}

	private formatTime(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		if (hours > 0) {
			return `${hours}h ${minutes}m ${secs}s`;
		} else if (minutes > 0) {
			return `${minutes}m ${secs}s`;
		} else {
			return `${secs}s`;
		}
	}
}

// ============================================================================
// CONCURRENCY CONTROL
// ============================================================================

class PromisePool {
	private queue: (() => Promise<any>)[] = [];
	private active: number = 0;
	private maxConcurrency: number;

	constructor(maxConcurrency: number) {
		this.maxConcurrency = maxConcurrency;
	}

	async add<T>(fn: () => Promise<T>): Promise<T> {
		return new Promise((resolve, reject) => {
			this.queue.push(async () => {
				try {
					const result = await fn();
					resolve(result);
				} catch (error) {
					reject(error);
				}
			});
			this.processQueue();
		});
	}

	private async processQueue(): Promise<void> {
		if (this.active >= this.maxConcurrency || this.queue.length === 0) {
			return;
		}

		const task = this.queue.shift();
		if (!task) return;

		this.active++;
		try {
			await task();
		} finally {
			this.active--;
			this.processQueue();
		}
	}

	async waitForAll(): Promise<void> {
		while (this.active > 0 || this.queue.length > 0) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

async function saveChapterToFile(chapter: Chapter): Promise<void> {
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
}

// ============================================================================
// PARALLEL IMPORT LOGIC
// ============================================================================

class ParallelImporter {
	private config: ParallelConfig;
	private tracker: ProgressTracker;
	private lastRequestTime: number = 0;

	constructor(config: ParallelConfig, volumes: VolumeConfig[]) {
		this.config = config;
		this.tracker = new ProgressTracker(volumes);
	}

	private async respectfulDelay(): Promise<void> {
		const now = Date.now();
		const timeSinceLastRequest = now - this.lastRequestTime;

		if (timeSinceLastRequest < this.config.apiDelay) {
			await new Promise((resolve) =>
				setTimeout(resolve, this.config.apiDelay - timeSinceLastRequest),
			);
		}

		this.lastRequestTime = Date.now();
	}

	private async fetchChapterWithRetry(
		apiPath: string,
		bookId: string,
		chapterNumber: number,
		translation: string,
		attempt: number = 1,
	): Promise<Chapter | null> {
		try {
			await this.respectfulDelay();

			const rawData = await GenericImporter.fetchChapter(apiPath, bookId, chapterNumber);
			const chapter = GenericImporter.parseChurchData(rawData, bookId, chapterNumber, translation);

			await saveChapterToFile(chapter);
			this.tracker.markChapterComplete(false);

			return chapter;
		} catch (error) {
			if (attempt < this.config.maxRetries) {
				console.error(
					`  ⚠️  Retry ${attempt}/${this.config.maxRetries} for ${bookId} ${chapterNumber}`,
				);
				await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay));
				return this.fetchChapterWithRetry(apiPath, bookId, chapterNumber, translation, attempt + 1);
			} else {
				console.error(
					`  ❌ Failed ${bookId} ${chapterNumber} after ${this.config.maxRetries} attempts:`,
					error,
				);
				this.tracker.markChapterComplete(true);
				return null;
			}
		}
	}

	async importBook(volume: VolumeConfig, bookInfo: any, chapterPool: PromisePool): Promise<Book> {
		console.log(`  📖 Starting ${bookInfo.name} (${bookInfo.chapters} chapters)...`);

		const chapters: Chapter[] = [];
		const chapterPromises: Promise<Chapter | null>[] = [];

		// Queue all chapters for this book
		for (let ch = 1; ch <= bookInfo.chapters; ch++) {
			const promise = chapterPool.add(() =>
				this.fetchChapterWithRetry(volume.apiPath, bookInfo.id, ch, volume.translation),
			);
			chapterPromises.push(promise);
		}

		// Wait for all chapters to complete
		const results = await Promise.all(chapterPromises);

		// Filter out failed chapters and add to chapters array
		for (const chapter of results) {
			if (chapter !== null) {
				chapters.push(chapter);
			}
		}

		// Sort chapters by chapter number
		chapters.sort((a, b) => a.chapter - b.chapter);

		const book: Book = {
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
		};

		this.tracker.markBookComplete();
		console.log(`  ✅ ${bookInfo.name} complete: ${chapters.length}/${bookInfo.chapters} chapters`);

		return book;
	}

	async importVolume(volume: VolumeConfig): Promise<Book[]> {
		console.log(`\n📚 Starting ${volume.name} (${volume.books.length} books)`);

		const books: Book[] = [];
		const bookPool = new PromisePool(this.config.maxBooksConcurrency);
		const chapterPool = new PromisePool(this.config.maxChaptersConcurrency);
		const bookPromises: Promise<Book>[] = [];

		// Queue all books for this volume
		for (const bookInfo of volume.books) {
			const promise = bookPool.add(() => this.importBook(volume, bookInfo, chapterPool));
			bookPromises.push(promise);
		}

		// Wait for all books to complete
		books.push(...(await Promise.all(bookPromises)));

		// Sort books by original order
		const bookOrder = new Map(volume.books.map((b, i) => [b.id, i]));
		books.sort((a, b) => (bookOrder.get(a.id) || 0) - (bookOrder.get(b.id) || 0));

		this.tracker.markVolumeComplete();
		console.log(`\n✅ ${volume.name} complete!`);
		console.log(`   Books: ${books.length}`);
		console.log(`   Chapters: ${books.reduce((sum, b) => sum + b.metadata.chapterCount, 0)}`);
		console.log(`   Verses: ${books.reduce((sum, b) => sum + b.metadata.verseCount, 0)}`);

		return books;
	}

	async importAllVolumes(volumes: VolumeConfig[]): Promise<Map<string, Book[]>> {
		const results = new Map<string, Book[]>();
		const volumePool = new PromisePool(this.config.maxVolumesConcurrency);
		const volumePromises: Promise<void>[] = [];

		for (const volume of volumes) {
			const promise = volumePool.add(async () => {
				const books = await this.importVolume(volume);
				results.set(volume.translation, books);
			});
			volumePromises.push(promise);
		}

		await Promise.all(volumePromises);

		this.tracker.displayFinal();

		return results;
	}

	getTracker(): ProgressTracker {
		return this.tracker;
	}
}

// ============================================================================
// MANIFEST GENERATION (reuse existing logic)
// ============================================================================

async function generateVolumeManifest(
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

	return translationManifest;
}

async function generateRootManifest(): Promise<ScriptureManifest> {
	const translationsDir = path.join(process.cwd(), "public", "scripture", "translations");
	const translations: TranslationManifest[] = [];

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

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

async function main() {
	console.log("🚀 PARALLEL SCRIPTURE IMPORT ORCHESTRATOR");
	console.log("=".repeat(70));

	// Parse command line args
	const args = process.argv.slice(2);
	const sourceArg = args.find((arg) => arg.startsWith("--source="));
	const source = sourceArg ? sourceArg.split("=")[1] : "all";

	// Parse concurrency config
	const configArg = args.find((arg) => arg.startsWith("--config="));
	let config = DEFAULT_CONFIG;

	if (configArg) {
		const configValue = configArg.split("=")[1];
		if (configValue === "conservative") {
			config = {
				...DEFAULT_CONFIG,
				maxVolumesConcurrency: 1,
				maxBooksConcurrency: 3,
				maxChaptersConcurrency: 5,
				apiDelay: 100,
			};
			console.log("⚙️  Using CONSERVATIVE config (slower, safer)");
		} else if (configValue === "aggressive") {
			config = {
				...DEFAULT_CONFIG,
				maxVolumesConcurrency: 5,
				maxBooksConcurrency: 10,
				maxChaptersConcurrency: 20,
				apiDelay: 25,
			};
			console.log("⚙️  Using AGGRESSIVE config (faster, riskier)");
		} else {
			console.log("⚙️  Using DEFAULT config (balanced)");
		}
	} else {
		console.log("⚙️  Using DEFAULT config (balanced)");
	}

	console.log(`   Volumes:  ${config.maxVolumesConcurrency} concurrent`);
	console.log(`   Books:    ${config.maxBooksConcurrency} concurrent per volume`);
	console.log(`   Chapters: ${config.maxChaptersConcurrency} concurrent per book`);
	console.log(`   API Delay: ${config.apiDelay}ms\n`);

	try {
		// Determine which volumes to import
		const volumes: VolumeConfig[] = [];
		const volumeConfigs: { [key: string]: VolumeConfig } = {
			bofm: BOOK_OF_MORMON,
			ot: OLD_TESTAMENT,
			nt: NEW_TESTAMENT,
			dc: DOCTRINE_AND_COVENANTS,
			pgp: PEARL_OF_GREAT_PRICE,
		};

		if (source === "all") {
			volumes.push(...Object.values(volumeConfigs));
		} else {
			const sourceVolume = volumeConfigs[source];
			if (!sourceVolume) {
				console.error(`❌ Unknown source: ${source}`);
				console.error("Valid sources: all, bofm, ot, nt, dc, pgp");
				process.exit(1);
			}
			volumes.push(sourceVolume);
		}

		// Start parallel import
		const importer = new ParallelImporter(config, volumes);
		const results = await importer.importAllVolumes(volumes);

		// Generate manifests
		console.log("\n📝 Generating manifests...");

		for (const [translationId, books] of results.entries()) {
			// Find the original volume config
			let volumeConfig: VolumeConfig | undefined;
			if (translationId === "bofm") volumeConfig = BOOK_OF_MORMON;
			else if (translationId === "kjv")
				volumeConfig = source === "ot" ? OLD_TESTAMENT : NEW_TESTAMENT;
			else if (translationId === "dc") volumeConfig = DOCTRINE_AND_COVENANTS;
			else if (translationId === "pgp") volumeConfig = PEARL_OF_GREAT_PRICE;

			if (volumeConfig) {
				// Special handling for KJV (merge OT and NT)
				if (translationId === "kjv") {
					const kjvConfig: VolumeConfig = {
						id: "kjv",
						name: "King James Version",
						fullName: "The Holy Bible (King James Version)",
						abbreviation: "KJV",
						translation: "kjv",
						apiPath: "ot",
						copyright: "Public Domain",
						books: [],
					};
					await generateVolumeManifest(translationId, books, kjvConfig);
				} else {
					await generateVolumeManifest(translationId, books, volumeConfig);
				}
			}
		}

		// Generate root manifest
		console.log("\n📝 Generating root manifest...");
		await generateRootManifest();

		console.log("\n" + "=".repeat(70));
		console.log("✅ ALL IMPORTS COMPLETE!");
		console.log("=".repeat(70));
		console.log("\nNext steps:");
		console.log("  1. Verify files in public/scripture/");
		console.log("  2. Check manifest.json");
		console.log("  3. Test loading in the application\n");

		process.exit(0);
	} catch (error) {
		console.error("\n❌ IMPORT FAILED");
		console.error("=".repeat(70));
		console.error("Error:", error);
		process.exit(1);
	}
}

// Run if called directly
if (import.meta.main) {
	main();
}

export { ParallelImporter, PromisePool, ProgressTracker, type ParallelConfig };
