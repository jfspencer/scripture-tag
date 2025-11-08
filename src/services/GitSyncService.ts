/**
 * GitSyncService - Git-based sync for annotations
 * Enables version control of annotations by exporting/importing SQLite database files
 */

import { Context, Effect, Layer } from "effect";
import { GitSyncError, type HttpError } from "../errors/AppErrors";
import { SQLiteService } from "./SQLiteService";

interface AnnotationManifest {
	files: string[];
}

// Service definition
export class GitSyncService extends Context.Tag("GitSyncService")<
	GitSyncService,
	{
		readonly exportToFile: (userId: string, filename?: string) => Effect.Effect<void, GitSyncError>;
		readonly importFromRepository: (
			strategy?: "replace" | "merge" | "skip-existing",
		) => Effect.Effect<void, GitSyncError | HttpError>;
		readonly importFromFile: (
			file: File,
			strategy?: "replace" | "merge" | "skip-existing",
		) => Effect.Effect<void, GitSyncError>;
	}
>() {}

// Service implementation
export const makeGitSyncService = Effect.gen(function* () {
	const sqlite = yield* SQLiteService;

	return {
		// Export current database to downloadable SQLite file
		exportToFile: (userId: string, filename?: string) =>
			Effect.gen(function* () {
				// Export database from SQLite service
				const dbBytes = yield* sqlite.exportDatabase().pipe(
					Effect.mapError(
						(error) =>
							new GitSyncError({
								reason: "ExportFailed",
								message: `Failed to export database: ${String(error)}`,
							}),
					),
				);

				// Create blob and trigger download
				const blob = new Blob([new Uint8Array(dbBytes)], {
					type: "application/vnd.sqlite3",
				});
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = filename || `${userId}-annotations.sqlite`;
				a.click();
				URL.revokeObjectURL(url);
			}),

		// Import from repository SQLite database files
		importFromRepository: (strategy: "replace" | "merge" | "skip-existing" = "merge") =>
			Effect.gen(function* () {
				// Fetch manifest of available database files
				const manifest = yield* Effect.tryPromise({
					try: async () => {
						const res = await fetch("/data/annotations/manifest.json");
						if (!res.ok) {
							throw new Error(`Manifest not found: ${res.statusText}`);
						}
						return (await res.json()) as AnnotationManifest;
					},
					catch: (error) =>
						new GitSyncError({
							reason: "ManifestNotFound",
							message: `Failed to load manifest: ${String(error)}`,
						}),
				});

				// If no files, nothing to import
				if (manifest.files.length === 0) {
					return;
				}

				// Load and merge each database file
				for (let i = 0; i < manifest.files.length; i++) {
					const filename = manifest.files[i];

					const dbArrayBuffer = yield* Effect.tryPromise({
						try: async () => {
							const res = await fetch(`/data/annotations/${filename}`);
							if (!res.ok) {
								throw new Error(`Failed to load ${filename}: ${res.statusText}`);
							}
							return await res.arrayBuffer();
						},
						catch: (error) =>
							new GitSyncError({
								reason: "FileLoadFailed",
								message: `Failed to load database file ${filename}: ${String(error)}`,
							}),
					});

					// Merge the imported database into current database
					const importStrategy = strategy === "replace" && i === 0 ? "replace" : strategy;

					yield* Effect.tryPromise({
						try: () =>
							Effect.runPromise(
								sqlite.importDatabase(new Uint8Array(dbArrayBuffer), importStrategy),
							),
						catch: (error) =>
							new GitSyncError({
								reason: "ImportFailed",
								message: `Failed to import database ${filename}: ${String(error)}`,
							}),
					});
				}
			}),

		// Import from user-uploaded SQLite file
		importFromFile: (file: File, strategy: "replace" | "merge" | "skip-existing" = "merge") =>
			Effect.gen(function* () {
				const arrayBuffer = yield* Effect.tryPromise({
					try: () => file.arrayBuffer(),
					catch: (error) =>
						new GitSyncError({
							reason: "FileLoadFailed",
							message: `Failed to read file: ${String(error)}`,
						}),
				});

				yield* Effect.tryPromise({
					try: () =>
						Effect.runPromise(sqlite.importDatabase(new Uint8Array(arrayBuffer), strategy)),
					catch: (error) =>
						new GitSyncError({
							reason: "ImportFailed",
							message: `Failed to import database: ${String(error)}`,
						}),
				});
			}),
	} as const;
});

// Service layer
export const GitSyncServiceLive = Layer.effect(GitSyncService, makeGitSyncService);
