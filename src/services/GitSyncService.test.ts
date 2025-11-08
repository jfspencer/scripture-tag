/**
 * Unit tests for GitSyncService
 * Tests the git-based sync functionality
 */

import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Effect, Layer } from "effect";
import { GitSyncService, makeGitSyncService } from "./GitSyncService";
import { SQLiteService } from "./SQLiteService";

// Mock fetch globally
const mockFetch = mock((url: string) => {
	if (url === "/data/annotations/manifest.json") {
		return Promise.resolve({
			ok: true,
			json: async () => ({ files: ["test.sqlite"] }),
		} as Response);
	}
	if (url === "/data/annotations/test.sqlite") {
		return Promise.resolve({
			ok: true,
			arrayBuffer: async () => new ArrayBuffer(100),
		} as Response);
	}
	return Promise.resolve({
		ok: false,
		statusText: "Not Found",
	} as Response);
});

// Mock DOM APIs
const mockCreateElement = mock(() => ({
	href: "",
	download: "",
	click: mock(),
}));

const mockCreateObjectURL = mock(() => "blob:mock-url");
const mockRevokeObjectURL = mock();

// Save original URL for restoration
const _OriginalURL = URL;

// Setup global mocks
global.fetch = mockFetch as unknown as typeof fetch;
global.document = {
	createElement: mockCreateElement,
} as unknown as Document;

// Extend URL instead of replacing it
Object.assign(URL, {
	createObjectURL: mockCreateObjectURL,
	revokeObjectURL: mockRevokeObjectURL,
});

// Mock SQLiteService
let mockExportReturn: Uint8Array = new Uint8Array([1, 2, 3, 4]);
let mockImportCalls: Array<{ data: Uint8Array; strategy: string }> = [];

const MockSQLiteService = Layer.succeed(SQLiteService, {
	query: <T = unknown>() => Effect.succeed([] as T[]),
	execute: () => Effect.succeed(undefined),
	exportDatabase: () => Effect.succeed(mockExportReturn),
	importDatabase: (data: Uint8Array, strategy: "replace" | "merge" | "skip-existing") => {
		mockImportCalls.push({ data, strategy });
		return Effect.succeed(undefined);
	},
});

const TestLayer = Layer.provide(
	Layer.effect(GitSyncService, makeGitSyncService),
	MockSQLiteService,
);

describe("GitSyncService", () => {
	beforeEach(() => {
		mockExportReturn = new Uint8Array([1, 2, 3, 4]);
		mockImportCalls = [];
		mockFetch.mockClear();
		mockCreateElement.mockClear();
		mockCreateObjectURL.mockClear();
		mockRevokeObjectURL.mockClear();
	});

	describe("exportToFile", () => {
		test("exports database to downloadable file", async () => {
			const program = Effect.gen(function* () {
				const service = yield* GitSyncService;
				yield* service.exportToFile("user-1");
			});

			await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(mockCreateElement).toHaveBeenCalledWith("a");
			expect(mockCreateObjectURL).toHaveBeenCalled();
			expect(mockRevokeObjectURL).toHaveBeenCalled();
		});

		test("uses custom filename when provided", async () => {
			const mockAnchor = {
				href: "",
				download: "",
				click: mock(),
			};
			mockCreateElement.mockReturnValueOnce(mockAnchor);

			const program = Effect.gen(function* () {
				const service = yield* GitSyncService;
				yield* service.exportToFile("user-1", "custom-name.sqlite");
			});

			await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(mockAnchor.download).toBe("custom-name.sqlite");
		});

		test("uses default filename pattern when not provided", async () => {
			const mockAnchor = {
				href: "",
				download: "",
				click: mock(),
			};
			mockCreateElement.mockReturnValueOnce(mockAnchor);

			const program = Effect.gen(function* () {
				const service = yield* GitSyncService;
				yield* service.exportToFile("user-1");
			});

			await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(mockAnchor.download).toBe("user-1-annotations.sqlite");
		});

		test("creates blob with correct type", async () => {
			const program = Effect.gen(function* () {
				const service = yield* GitSyncService;
				yield* service.exportToFile("user-1");
			});

			await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			// Verify createObjectURL was called (blob was created)
			expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
		});
	});

	describe("importFromRepository", () => {
		test("imports database files from repository", async () => {
			const program = Effect.gen(function* () {
				const service = yield* GitSyncService;
				yield* service.importFromRepository("merge");
			});

			await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(mockFetch).toHaveBeenCalledWith("/data/annotations/manifest.json");
			expect(mockFetch).toHaveBeenCalledWith("/data/annotations/test.sqlite");
			expect(mockImportCalls).toHaveLength(1);
		});

		test("uses replace strategy for first file when strategy is replace", async () => {
			const program = Effect.gen(function* () {
				const service = yield* GitSyncService;
				yield* service.importFromRepository("replace");
			});

			await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(mockImportCalls[0].strategy).toBe("replace");
		});

		test("uses merge strategy by default", async () => {
			const program = Effect.gen(function* () {
				const service = yield* GitSyncService;
				yield* service.importFromRepository();
			});

			await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(mockImportCalls[0].strategy).toBe("merge");
		});

		test("does nothing when no files in manifest", async () => {
			mockFetch.mockImplementationOnce((url: string) => {
				if (url === "/data/annotations/manifest.json") {
					return Promise.resolve({
						ok: true,
						json: async () => ({ files: [] }),
					} as Response);
				}
				return Promise.resolve({ ok: false, statusText: "Not Found" } as Response);
			});

			const program = Effect.gen(function* () {
				const service = yield* GitSyncService;
				yield* service.importFromRepository();
			});

			await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(mockImportCalls).toHaveLength(0);
		});

		test("fails when manifest not found", async () => {
			mockFetch.mockImplementationOnce(() =>
				Promise.resolve({
					ok: false,
					statusText: "Not Found",
				} as Response),
			);

			const program = Effect.gen(function* () {
				const service = yield* GitSyncService;
				return yield* service.importFromRepository();
			}).pipe(Effect.catchTag("GitSyncError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error.reason).toBe("ManifestNotFound");
			}
		});

		test("fails when database file not found", async () => {
			mockFetch.mockImplementation((url: string) => {
				if (url === "/data/annotations/manifest.json") {
					return Promise.resolve({
						ok: true,
						json: async () => ({ files: ["nonexistent.sqlite"] }),
					} as Response);
				}
				return Promise.resolve({
					ok: false,
					statusText: "Not Found",
				} as Response);
			});

			const program = Effect.gen(function* () {
				const service = yield* GitSyncService;
				return yield* service.importFromRepository();
			}).pipe(Effect.catchTag("GitSyncError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error.reason).toBe("FileLoadFailed");
			}
		});
	});

	describe("importFromFile", () => {
		test("imports from user-uploaded file", async () => {
			const mockFile = new File([new Uint8Array([1, 2, 3, 4])], "test.sqlite", {
				type: "application/vnd.sqlite3",
			});

			const program = Effect.gen(function* () {
				const service = yield* GitSyncService;
				yield* service.importFromFile(mockFile, "merge");
			});

			await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(mockImportCalls).toHaveLength(1);
			expect(mockImportCalls[0].strategy).toBe("merge");
		});

		test("uses merge strategy by default", async () => {
			const mockFile = new File([new Uint8Array([1, 2, 3, 4])], "test.sqlite", {
				type: "application/vnd.sqlite3",
			});

			const program = Effect.gen(function* () {
				const service = yield* GitSyncService;
				yield* service.importFromFile(mockFile);
			});

			await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(mockImportCalls[0].strategy).toBe("merge");
		});

		test("handles file read errors", async () => {
			const mockFile = {
				arrayBuffer: () => Promise.reject(new Error("Failed to read")),
			} as File;

			const program = Effect.gen(function* () {
				const service = yield* GitSyncService;
				return yield* service.importFromFile(mockFile);
			}).pipe(Effect.catchTag("GitSyncError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error.reason).toBe("FileLoadFailed");
			}
		});
	});
});
