/**
 * Unit tests for AnnotationRepository
 * Tests the data access layer for annotations
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import type { TagAnnotation } from "../../types/tag";
import { SQLiteService } from "../SQLiteService";
import { AnnotationRepository, makeAnnotationRepository } from "./AnnotationRepository";

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

const TestLayer = Layer.provide(
	Layer.effect(AnnotationRepository, makeAnnotationRepository),
	MockSQLiteService,
);

describe("AnnotationRepository", () => {
	beforeEach(() => {
		mockQueryReturn = [];
		mockExecuteCalls = [];
	});

	test("save - inserts annotation into database", async () => {
		const annotation: TagAnnotation = {
			id: "annotation-id",
			tagId: "tag-id",
			tokenIds: ["gen.1.1.1", "gen.1.1.2"],
			userId: "user-1",
			note: "Test note",
			createdAt: new Date("2025-01-01"),
			lastModified: new Date("2025-01-02"),
			version: 1,
		};

		const program = Effect.gen(function* () {
			const repo = yield* AnnotationRepository;
			yield* repo.save(annotation);
		});

		await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

		expect(mockExecuteCalls).toHaveLength(1);
		const { sql, params } = mockExecuteCalls[0];
		expect(sql).toContain("INSERT OR REPLACE INTO annotations");
		expect(params).toEqual([
			"annotation-id",
			"tag-id",
			'["gen.1.1.1","gen.1.1.2"]', // JSON stringified
			"user-1",
			"Test note",
			new Date("2025-01-01").getTime(),
			new Date("2025-01-02").getTime(),
			1,
		]);
	});

	test("findById - returns annotation when found", async () => {
		const mockRow = {
			id: "annotation-id",
			tag_id: "tag-id",
			token_ids: '["gen.1.1.1","gen.1.1.2"]',
			user_id: "user-1",
			note: "Test note",
			created_at: new Date("2025-01-01").getTime(),
			last_modified: new Date("2025-01-02").getTime(),
			version: 1,
		};

		mockQueryReturn = [mockRow];

		const program = Effect.gen(function* () {
			const repo = yield* AnnotationRepository;
			return yield* repo.findById("annotation-id");
		});

		const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

		expect(result).toEqual({
			id: "annotation-id",
			tagId: "tag-id",
			tokenIds: ["gen.1.1.1", "gen.1.1.2"],
			userId: "user-1",
			note: "Test note",
			createdAt: new Date("2025-01-01"),
			lastModified: new Date("2025-01-02"),
			version: 1,
		});
	});

	test("findById - returns undefined when not found", async () => {
		mockQueryReturn = [];

		const program = Effect.gen(function* () {
			const repo = yield* AnnotationRepository;
			return yield* repo.findById("nonexistent");
		});

		const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

		expect(result).toBeUndefined();
	});

	test("findByTagId - returns all annotations for a tag", async () => {
		const mockRows = [
			{
				id: "annotation-1",
				tag_id: "tag-id",
				token_ids: '["gen.1.1.1"]',
				user_id: "user-1",
				note: null,
				created_at: Date.now(),
				last_modified: Date.now(),
				version: 1,
			},
			{
				id: "annotation-2",
				tag_id: "tag-id",
				token_ids: '["gen.1.1.2"]',
				user_id: "user-1",
				note: null,
				created_at: Date.now(),
				last_modified: Date.now(),
				version: 1,
			},
		];

		mockQueryReturn = mockRows;

		const program = Effect.gen(function* () {
			const repo = yield* AnnotationRepository;
			return yield* repo.findByTagId("tag-id");
		});

		const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

		expect(result).toHaveLength(2);
		expect(result[0].tagId).toBe("tag-id");
		expect(result[1].tagId).toBe("tag-id");
	});

	test("findByTokenId - returns annotations containing the token", async () => {
		const mockRows = [
			{
				id: "annotation-1",
				tag_id: "tag-id",
				token_ids: '["gen.1.1.1","gen.1.1.2"]',
				user_id: "user-1",
				note: null,
				created_at: Date.now(),
				last_modified: Date.now(),
				version: 1,
			},
		];

		mockQueryReturn = mockRows;

		const program = Effect.gen(function* () {
			const repo = yield* AnnotationRepository;
			return yield* repo.findByTokenId("gen.1.1.1");
		});

		const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

		expect(result).toHaveLength(1);
		expect(result[0].tokenIds).toContain("gen.1.1.1");
	});

	test("getAll - returns all annotations ordered by last modified", async () => {
		const mockRows = [
			{
				id: "annotation-1",
				tag_id: "tag-id-1",
				token_ids: '["gen.1.1.1"]',
				user_id: "user-1",
				note: null,
				created_at: Date.now(),
				last_modified: Date.now(),
				version: 1,
			},
			{
				id: "annotation-2",
				tag_id: "tag-id-2",
				token_ids: '["gen.1.1.2"]',
				user_id: "user-1",
				note: null,
				created_at: Date.now(),
				last_modified: Date.now(),
				version: 1,
			},
		];

		mockQueryReturn = mockRows;

		const program = Effect.gen(function* () {
			const repo = yield* AnnotationRepository;
			return yield* repo.getAll();
		});

		const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

		expect(result).toHaveLength(2);
		expect(result[0].id).toBe("annotation-1");
		expect(result[1].id).toBe("annotation-2");
	});

	test("delete - deletes annotation by id", async () => {
		const program = Effect.gen(function* () {
			const repo = yield* AnnotationRepository;
			yield* repo.delete("annotation-id");
		});

		await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

		expect(mockExecuteCalls).toHaveLength(1);
		expect(mockExecuteCalls[0].sql).toContain("DELETE FROM annotations");
		expect(mockExecuteCalls[0].params).toEqual(["annotation-id"]);
	});

	test("deleteByTagId - deletes all annotations for a tag", async () => {
		const program = Effect.gen(function* () {
			const repo = yield* AnnotationRepository;
			yield* repo.deleteByTagId("tag-id");
		});

		await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

		expect(mockExecuteCalls).toHaveLength(1);
		expect(mockExecuteCalls[0].sql).toContain("DELETE FROM annotations");
		expect(mockExecuteCalls[0].sql).toContain("tag_id");
		expect(mockExecuteCalls[0].params).toEqual(["tag-id"]);
	});
});
