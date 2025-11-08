#!/usr/bin/env bun
// Example: Using the Parallel Import Orchestrator programmatically

import { ParallelImporter, PromisePool, type ParallelConfig } from "./parallel-import-orchestrator";
import { BOOK_OF_MORMON } from "./importer/data/scriptureVolumes";

/**
 * Example 1: Custom Configuration
 *
 * This example shows how to create a custom import configuration
 * for specific performance requirements.
 */
async function exampleCustomConfig() {
	console.log("Example 1: Custom Configuration\n");

	// Define a custom config optimized for a specific use case
	const customConfig: ParallelConfig = {
		maxVolumesConcurrency: 1, // Import one volume at a time
		maxBooksConcurrency: 3, // 3 books concurrently
		maxChaptersConcurrency: 8, // 8 chapters per book
		apiDelay: 75, // 75ms between requests
		maxRetries: 5, // Retry up to 5 times
		retryDelay: 2000, // 2 second delay before retry
	};

	// Create the importer with custom config
	const importer = new ParallelImporter(customConfig, [BOOK_OF_MORMON]);

	// Run the import
	const results = await importer.importAllVolumes([BOOK_OF_MORMON]);

	console.log("\nImport complete!");
	console.log(`Books imported: ${results.get("bofm")?.length}`);
}

/**
 * Example 2: Custom PromisePool
 *
 * This example shows how to use the PromisePool utility independently
 * for any parallel processing task.
 */
async function examplePromisePool() {
	console.log("\nExample 2: Custom PromisePool Usage\n");

	// Create a pool with max 5 concurrent operations
	const pool = new PromisePool(5);

	// Simulate 20 async tasks
	const tasks = Array.from({ length: 20 }, (_, i) => i + 1);
	const results: number[] = [];

	// Add all tasks to the pool
	const promises = tasks.map((taskNum) =>
		pool.add(async () => {
			// Simulate async work
			await new Promise((resolve) => setTimeout(resolve, 100));
			console.log(`  Task ${taskNum} complete`);
			return taskNum * 2;
		}),
	);

	// Wait for all tasks
	const completed = await Promise.all(promises);
	results.push(...completed);

	console.log(`\nAll tasks complete: ${results.length} results`);
	console.log(`Sum: ${results.reduce((a, b) => a + b, 0)}`);
}

/**
 * Example 3: Progress Tracking
 *
 * This example shows how to access and use the progress tracker
 * for custom monitoring or logging.
 */
async function exampleProgressTracking() {
	console.log("\nExample 3: Progress Tracking\n");

	const config: ParallelConfig = {
		maxVolumesConcurrency: 1,
		maxBooksConcurrency: 2,
		maxChaptersConcurrency: 5,
		apiDelay: 50,
		maxRetries: 3,
		retryDelay: 1000,
	};

	const importer = new ParallelImporter(config, [BOOK_OF_MORMON]);

	// Get access to the progress tracker
	const tracker = importer.getTracker();

	// Set up custom progress monitoring (every 5 seconds)
	const progressInterval = setInterval(() => {
		tracker.displayProgress();
	}, 5000);

	// Run the import
	await importer.importAllVolumes([BOOK_OF_MORMON]);

	// Clean up interval
	clearInterval(progressInterval);

	// Display final stats
	tracker.displayFinal();
}

/**
 * Example 4: Error Handling
 *
 * This example shows how to handle errors during import
 */
async function exampleErrorHandling() {
	console.log("\nExample 4: Error Handling\n");

	const config: ParallelConfig = {
		maxVolumesConcurrency: 1,
		maxBooksConcurrency: 3,
		maxChaptersConcurrency: 5,
		apiDelay: 50,
		maxRetries: 2, // Only retry twice
		retryDelay: 500,
	};

	try {
		const importer = new ParallelImporter(config, [BOOK_OF_MORMON]);
		const results = await importer.importAllVolumes([BOOK_OF_MORMON]);

		// Check results
		const books = results.get("bofm") || [];
		const totalChapters = books.reduce((sum, book) => sum + book.chapters.length, 0);
		const expectedChapters = BOOK_OF_MORMON.books.reduce((sum, book) => sum + book.chapters, 0);

		if (totalChapters < expectedChapters) {
			console.warn(`⚠️  Some chapters failed to import: ${totalChapters}/${expectedChapters}`);
		} else {
			console.log(`✅ All chapters imported successfully!`);
		}
	} catch (error) {
		console.error("❌ Import failed:", error);
		console.error("Troubleshooting:");
		console.error("  1. Check internet connection");
		console.error("  2. Verify API is accessible");
		console.error("  3. Try with conservative config");
	}
}

// Main function to run examples
async function main() {
	const args = process.argv.slice(2);
	const example = args[0] || "all";

	console.log("🚀 Parallel Import Orchestrator - Examples\n");
	console.log("=".repeat(70));

	try {
		switch (example) {
			case "1":
			case "config":
				await exampleCustomConfig();
				break;

			case "2":
			case "pool":
				await examplePromisePool();
				break;

			case "3":
			case "progress":
				await exampleProgressTracking();
				break;

			case "4":
			case "errors":
				await exampleErrorHandling();
				break;

			case "all":
				console.log("\nRunning example 2 (PromisePool demonstration)...");
				await examplePromisePool();
				console.log("\n" + "=".repeat(70));
				console.log("\nTo run specific examples:");
				console.log("  bun scripts/parallel-import-example.ts 1  # Custom config");
				console.log("  bun scripts/parallel-import-example.ts 2  # PromisePool");
				console.log("  bun scripts/parallel-import-example.ts 3  # Progress tracking");
				console.log("  bun scripts/parallel-import-example.ts 4  # Error handling");
				break;

			default:
				console.error(`Unknown example: ${example}`);
				console.error("Valid options: 1, 2, 3, 4, all");
				process.exit(1);
		}

		console.log("\n" + "=".repeat(70));
		console.log("✅ Example complete!");
	} catch (error) {
		console.error("\n❌ Example failed:", error);
		process.exit(1);
	}
}

// Run if called directly
if (import.meta.main) {
	main();
}

export { exampleCustomConfig, examplePromisePool, exampleProgressTracking, exampleErrorHandling };
