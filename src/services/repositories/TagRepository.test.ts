/**
 * Unit tests for TagRepository
 * Tests the data access layer for tags
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import type { Tag } from "../../types/tag";
import { SQLiteService } from "../SQLiteService";
import { makeTagRepository, TagRepository } from "./TagRepository";

// Mock implementations
let mockQueryReturn: unknown[] = [];
let mockExecuteCalls: Array<{ sql: string; params?: unknown[] }> = [];

const MockSQLiteService = Layer.succeed(SQLiteService, {
	query: <T = unknown>(_sql: string, _params?: unknown[]) => {
		return Effect.succeed(mockQueryReturn as T[]);
	},
	execute: (sql: string, params?: unknown[]) => {
		mockExecuteCalls.push({ sql, params });
		return Effect.succeed(undefined);
	},
	exportDatabase: () => Effect.succeed(new Uint8Array()),
	importDatabase: () => Effect.succeed(undefined),
});

const TestLayer = Layer.provide(Layer.effect(TagRepository, makeTagRepository), MockSQLiteService);

describe("TagRepository", () => {
	beforeEach(() => {
		mockQueryReturn = [];
		mockExecuteCalls = [];
	});

	test("save - inserts tag into database", async () => {
		const tag: Tag = {
			id: "test-id",
			name: "Test Tag",
			description: "Test Description",
			category: "Test Category",
			metadata: { color: "#ff0000", priority: 1 },
			createdAt: new Date("2025-01-01"),
			userId: "user-1",
		};

		const program = Effect.gen(function* () {
			const repo = yield* TagRepository;
			yield* repo.save(tag);
		});

		await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

		expect(mockExecuteCalls).toHaveLength(1);
		const { sql, params } = mockExecuteCalls[0];
		expect(sql).toContain("INSERT OR REPLACE INTO tags");
		expect(params).toEqual([
			"test-id",
			"Test Tag",
			"Test Description",
			"Test Category",
			"#ff0000",
			null, // undefined becomes null for database
			1,
			new Date("2025-01-01").getTime(),
			"user-1",
		]);
	});

	test("findById - returns tag when found", async () => {
		const mockRow = {
			id: "test-id",
			name: "Test Tag",
			description: "Test Description",
			category: "Test Category",
			color: "#ff0000",
			icon: null,
			priority: 1,
			created_at: new Date("2025-01-01").getTime(),
			user_id: "user-1",
		};

		mockQueryReturn = [mockRow];

		const program = Effect.gen(function* () {
			const repo = yield* TagRepository;
			return yield* repo.findById("test-id");
		});

		const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

		expect(result).toEqual({
			id: "test-id",
			name: "Test Tag",
			description: "Test Description",
			category: "Test Category",
			metadata: { color: "#ff0000", priority: 1 },
			createdAt: new Date("2025-01-01"),
			userId: "user-1",
		});
	});

	test("findById - returns undefined when not found", async () => {
		mockQueryReturn = [];

		const program = Effect.gen(function* () {
			const repo = yield* TagRepository;
			return yield* repo.findById("nonexistent");
		});

		const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

		expect(result).toBeUndefined();
	});

	test("findByName - returns tag when found", async () => {
		const mockRow = {
			id: "test-id",
			name: "Test Tag",
			description: null,
			category: null,
			color: null,
			icon: null,
			priority: null,
			created_at: new Date("2025-01-01").getTime(),
			user_id: "user-1",
		};

		mockQueryReturn = [mockRow];

		const program = Effect.gen(function* () {
			const repo = yield* TagRepository;
			return yield* repo.findByName("Test Tag");
		});

		const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

		expect(result).toBeDefined();
		expect(result?.name).toBe("Test Tag");
	});

	test("getAll - returns all tags ordered by name", async () => {
		const mockRows = [
			{
				id: "id-1",
				name: "Tag A",
				description: null,
				category: null,
				color: null,
				icon: null,
				priority: null,
				created_at: Date.now(),
				user_id: "user-1",
			},
			{
				id: "id-2",
				name: "Tag B",
				description: null,
				category: null,
				color: null,
				icon: null,
				priority: null,
				created_at: Date.now(),
				user_id: "user-1",
			},
		];

		mockQueryReturn = mockRows;

		const program = Effect.gen(function* () {
			const repo = yield* TagRepository;
			return yield* repo.getAll();
		});

		const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("Tag A");
		expect(result[1].name).toBe("Tag B");
	});

	test("delete - deletes tag by id", async () => {
		const program = Effect.gen(function* () {
			const repo = yield* TagRepository;
			yield* repo.delete("test-id");
		});

		await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

		expect(mockExecuteCalls).toHaveLength(1);
		expect(mockExecuteCalls[0].sql).toContain("DELETE FROM tags");
		expect(mockExecuteCalls[0].params).toEqual(["test-id"]);
	});

	test("findByCategory - returns tags in category", async () => {
		const mockRows = [
			{
				id: "id-1",
				name: "Tag 1",
				description: null,
				category: "TestCategory",
				color: null,
				icon: null,
				priority: null,
				created_at: Date.now(),
				user_id: "user-1",
			},
		];

		mockQueryReturn = mockRows;

		const program = Effect.gen(function* () {
			const repo = yield* TagRepository;
			return yield* repo.findByCategory("TestCategory");
		});

		const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

		expect(result).toHaveLength(1);
		expect(result[0].category).toBe("TestCategory");
	});
});
