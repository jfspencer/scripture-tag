#!/usr/bin/env bun

// Performance Benchmark: Sequential vs Parallel Import

import { BOOK_OF_MORMON } from "./importer/data/scriptureVolumes";
import * as ImportPipeline from "./importer/services/importPipeline";
import { type ParallelConfig, ParallelImporter } from "./parallel-import-orchestrator";

interface BenchmarkResult {
	name: string;
	duration: number;
	chaptersPerSecond: number;
	totalChapters: number;
	failedChapters: number;
}

/**
 * Run a single benchmark test
 */
async function runBenchmark(name: string, importFn: () => Promise<any>): Promise<BenchmarkResult> {
	console.log(`\n${"=".repeat(70)}`);
	console.log(`📊 Running: ${name}`);
	console.log("=".repeat(70));

	const startTime = Date.now();

	try {
		await importFn();
	} catch (error) {
		console.error(`❌ Benchmark failed:`, error);
	}

	const endTime = Date.now();
	const duration = (endTime - startTime) / 1000; // seconds

	// Calculate stats (simplified - actual chapters from Book of Mormon)
	const totalChapters = 239;
	const chaptersPerSecond = totalChapters / duration;

	return {
		name,
		duration,
		chaptersPerSecond,
		totalChapters,
		failedChapters: 0,
	};
}

/**
 * Benchmark: Sequential Import
 */
async function benchmarkSequential(): Promise<BenchmarkResult> {
	return runBenchmark("Sequential Import", async () => {
		await ImportPipeline.importBookOfMormon();
		await ImportPipeline.generateVolumeManifest("bofm", [], BOOK_OF_MORMON);
	});
}

/**
 * Benchmark: Parallel Import (Conservative)
 */
async function benchmarkParallelConservative(): Promise<BenchmarkResult> {
	const config: ParallelConfig = {
		maxVolumesConcurrency: 1,
		maxBooksConcurrency: 3,
		maxChaptersConcurrency: 5,
		apiDelay: 100,
		maxRetries: 3,
		retryDelay: 1000,
	};

	return runBenchmark("Parallel Import (Conservative)", async () => {
		const importer = new ParallelImporter(config, [BOOK_OF_MORMON]);
		await importer.importAllVolumes([BOOK_OF_MORMON]);
	});
}

/**
 * Benchmark: Parallel Import (Default)
 */
async function benchmarkParallelDefault(): Promise<BenchmarkResult> {
	const config: ParallelConfig = {
		maxVolumesConcurrency: 3,
		maxBooksConcurrency: 5,
		maxChaptersConcurrency: 10,
		apiDelay: 50,
		maxRetries: 3,
		retryDelay: 1000,
	};

	return runBenchmark("Parallel Import (Default)", async () => {
		const importer = new ParallelImporter(config, [BOOK_OF_MORMON]);
		await importer.importAllVolumes([BOOK_OF_MORMON]);
	});
}

/**
 * Benchmark: Parallel Import (Aggressive)
 */
async function benchmarkParallelAggressive(): Promise<BenchmarkResult> {
	const config: ParallelConfig = {
		maxVolumesConcurrency: 5,
		maxBooksConcurrency: 10,
		maxChaptersConcurrency: 20,
		apiDelay: 25,
		maxRetries: 3,
		retryDelay: 1000,
	};

	return runBenchmark("Parallel Import (Aggressive)", async () => {
		const importer = new ParallelImporter(config, [BOOK_OF_MORMON]);
		await importer.importAllVolumes([BOOK_OF_MORMON]);
	});
}

/**
 * Format time duration
 */
function formatDuration(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
}

/**
 * Display comparison table
 */
function displayResults(results: BenchmarkResult[]): void {
	console.log(`\n${"=".repeat(70)}`);
	console.log("📊 BENCHMARK RESULTS");
	console.log("=".repeat(70));

	// Find baseline (sequential)
	const baseline = results[0];

	// Table header
	console.log("\n┌────────────────────────────┬──────────┬──────────┬─────────┬──────────┐");
	console.log("│ Configuration              │ Duration │ Ch/sec   │ Speedup │ Chapters │");
	console.log("├────────────────────────────┼──────────┼──────────┼─────────┼──────────┤");

	// Table rows
	for (const result of results) {
		const speedup = baseline.duration / result.duration;
		const speedupStr = speedup.toFixed(2) + "x";

		const name = result.name.padEnd(26);
		const duration = formatDuration(result.duration).padEnd(8);
		const rate = result.chaptersPerSecond.toFixed(1).padEnd(8);
		const speedupPad = speedupStr.padEnd(7);
		const chapters = result.totalChapters.toString().padEnd(8);

		console.log(`│ ${name} │ ${duration} │ ${rate} │ ${speedupPad} │ ${chapters} │`);
	}

	console.log("└────────────────────────────┴──────────┴──────────┴─────────┴──────────┘");

	// Recommendations
	console.log("\n💡 RECOMMENDATIONS:");
	console.log("─".repeat(70));

	const bestResult = results.reduce((best, current) =>
		current.duration < best.duration ? current : best,
	);

	console.log(`\n✨ Fastest: ${bestResult.name}`);
	console.log(`   Duration: ${formatDuration(bestResult.duration)}`);
	console.log(
		`   Speedup: ${(baseline.duration / bestResult.duration).toFixed(2)}x faster than sequential`,
	);

	console.log("\n📈 Performance Scaling:");
	for (const result of results.slice(1)) {
		// Skip sequential
		const improvement = (((baseline.duration - result.duration) / baseline.duration) * 100).toFixed(
			1,
		);
		console.log(`   ${result.name}: ${improvement}% faster than sequential`);
	}

	console.log("\n⚠️  Notes:");
	console.log("   - Results vary based on network speed and API response times");
	console.log("   - Aggressive configs may be throttled by the API");
	console.log("   - Conservative config is recommended for slower connections");
	console.log("   - Default config provides best balance for most use cases");
}

/**
 * Estimate time for all volumes
 */
function estimateAllVolumes(results: BenchmarkResult[]): void {
	console.log("\n📐 ESTIMATED TIME FOR ALL VOLUMES (1,581 chapters):");
	console.log("─".repeat(70));

	const totalChapters = 1581;

	for (const result of results) {
		const estimatedSeconds = totalChapters / result.chaptersPerSecond;
		const estimatedTime = formatDuration(estimatedSeconds);
		console.log(`   ${result.name.padEnd(30)} ${estimatedTime}`);
	}
}

/**
 * Main benchmark function
 */
async function main() {
	const args = process.argv.slice(2);
	const mode = args[0] || "quick";

	console.log("🏁 IMPORT PERFORMANCE BENCHMARK");
	console.log("=".repeat(70));
	console.log("\nNote: This will import the Book of Mormon multiple times");
	console.log("to compare performance between different configurations.\n");

	const results: BenchmarkResult[] = [];

	try {
		if (mode === "full") {
			// Full benchmark (all configurations)
			console.log("Running FULL benchmark (all configurations)...\n");

			results.push(await benchmarkSequential());
			results.push(await benchmarkParallelConservative());
			results.push(await benchmarkParallelDefault());
			results.push(await benchmarkParallelAggressive());
		} else if (mode === "parallel") {
			// Compare only parallel configurations
			console.log("Running PARALLEL comparison (parallel configs only)...\n");

			results.push(await benchmarkParallelConservative());
			results.push(await benchmarkParallelDefault());
			results.push(await benchmarkParallelAggressive());
		} else {
			// Quick benchmark (sequential vs default parallel)
			console.log("Running QUICK benchmark (sequential vs default parallel)...\n");
			console.log("For full benchmark, run: bun scripts/benchmark-import.ts full\n");

			results.push(await benchmarkSequential());
			results.push(await benchmarkParallelDefault());
		}

		// Display results
		displayResults(results);
		estimateAllVolumes(results);

		console.log("\n" + "=".repeat(70));
		console.log("✅ BENCHMARK COMPLETE!");
		console.log("=".repeat(70));

		console.log("\nUsage:");
		console.log("  bun scripts/benchmark-import.ts quick     # Sequential vs Default (fast)");
		console.log("  bun scripts/benchmark-import.ts parallel  # Compare parallel configs");
		console.log("  bun scripts/benchmark-import.ts full      # All configurations (slow)");
	} catch (error) {
		console.error("\n❌ Benchmark failed:", error);
		process.exit(1);
	}
}

// Run if called directly
if (import.meta.main) {
	main();
}

export {
	benchmarkSequential,
	benchmarkParallelConservative,
	benchmarkParallelDefault,
	benchmarkParallelAggressive,
};
