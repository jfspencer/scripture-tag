/**
 * Unit tests for TagService
 * Tests the business logic layer for tags
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import type { Tag } from "../types/tag";
import { TagRepository } from "./repositories/TagRepository";
import { makeTagService, TagService } from "./TagService";

// Mock implementations
let mockTags: Map<string, Tag> = new Map();

const MockTagRepository = Layer.succeed(TagRepository, {
	save: (tag: Tag) => {
		mockTags.set(tag.id, tag);
		return Effect.succeed(undefined);
	},
	findById: (id: string) => Effect.succeed(mockTags.get(id)),
	findByName: (name: string) => {
		const found = Array.from(mockTags.values()).find((t) => t.name === name);
		return Effect.succeed(found);
	},
	getAll: () => {
		const tags = Array.from(mockTags.values()).sort((a, b) => a.name.localeCompare(b.name));
		return Effect.succeed(tags);
	},
	delete: (id: string) => {
		mockTags.delete(id);
		return Effect.succeed(undefined);
	},
	findByCategory: (category: string) => {
		const tags = Array.from(mockTags.values()).filter((t) => t.category === category);
		return Effect.succeed(tags);
	},
});

const TestLayer = Layer.provide(Layer.effect(TagService, makeTagService), MockTagRepository);

describe("TagService", () => {
	beforeEach(() => {
		mockTags = new Map();
	});

	describe("createTag", () => {
		test("creates tag with valid data", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				return yield* service.createTag("Creation Theme", "Theological", {
					color: "#3b82f6",
					priority: 1,
				});
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result.name).toBe("Creation Theme");
			expect(result.category).toBe("Theological");
			expect(result.metadata.color).toBe("#3b82f6");
			expect(result.metadata.priority).toBe(1);
			expect(result.id).toBeDefined();
			expect(result.createdAt).toBeInstanceOf(Date);
		});

		test("trims tag name", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				return yield* service.createTag("  Trimmed Name  ");
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result.name).toBe("Trimmed Name");
		});

		test("fails with empty name", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				return yield* service.createTag("");
			}).pipe(Effect.catchTag("TagError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error._tag).toBe("TagError");
				expect(result.error.reason).toBe("EmptyName");
			}
		});

		test("fails with only whitespace name", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				return yield* service.createTag("   ");
			}).pipe(Effect.catchTag("TagError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
		});

		test("fails when tag name already exists", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				yield* service.createTag("Duplicate Name");
				return yield* service.createTag("Duplicate Name");
			}).pipe(Effect.catchTag("TagError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error.reason).toBe("DuplicateName");
			}
		});

		test("creates tag with minimal data", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				return yield* service.createTag("Simple Tag");
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result.name).toBe("Simple Tag");
			expect(result.category).toBeUndefined();
			expect(result.metadata).toEqual({});
		});
	});

	describe("updateTag", () => {
		test("updates tag name", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				const created = yield* service.createTag("Original Name");
				return yield* service.updateTag(created.id, { name: "Updated Name" });
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result.name).toBe("Updated Name");
		});

		test("updates tag metadata", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				const created = yield* service.createTag("Test Tag", "Category1", { color: "#ff0000" });
				return yield* service.updateTag(created.id, {
					metadata: { priority: 5 },
				});
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result.metadata.priority).toBe(5);
			expect(result.metadata.color).toBe("#ff0000"); // Preserved
		});

		test("fails when tag not found", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				return yield* service.updateTag("nonexistent-id", { name: "New Name" });
			}).pipe(Effect.catchTag("TagError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error.reason).toBe("NotFound");
			}
		});

		test("fails when updating to empty name", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				const created = yield* service.createTag("Original Name");
				return yield* service.updateTag(created.id, { name: "" });
			}).pipe(Effect.catchTag("TagError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error.reason).toBe("EmptyName");
			}
		});

		test("fails when updating to duplicate name", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				yield* service.createTag("Tag 1");
				const tag2 = yield* service.createTag("Tag 2");
				return yield* service.updateTag(tag2.id, { name: "Tag 1" });
			}).pipe(Effect.catchTag("TagError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error.reason).toBe("DuplicateName");
			}
		});

		test("allows updating to same name", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				const created = yield* service.createTag("Tag Name");
				return yield* service.updateTag(created.id, { name: "Tag Name" });
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result.name).toBe("Tag Name");
		});
	});

	describe("deleteTag", () => {
		test("deletes existing tag", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				const created = yield* service.createTag("To Delete");
				yield* service.deleteTag(created.id);
				return yield* service.getTag(created.id);
			}).pipe(Effect.catchTag("TagError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
		});

		test("fails when tag not found", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				return yield* service.deleteTag("nonexistent-id");
			}).pipe(Effect.catchTag("TagError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error.reason).toBe("NotFound");
			}
		});
	});

	describe("getTag", () => {
		test("retrieves existing tag", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				const created = yield* service.createTag("Test Tag");
				return yield* service.getTag(created.id);
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result.name).toBe("Test Tag");
		});

		test("fails when tag not found", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				return yield* service.getTag("nonexistent-id");
			}).pipe(Effect.catchTag("TagError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
		});
	});

	describe("getAllTags", () => {
		test("returns all tags sorted by name", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				yield* service.createTag("Charlie");
				yield* service.createTag("Alice");
				yield* service.createTag("Bob");
				return yield* service.getAllTags();
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result).toHaveLength(3);
			expect(result[0].name).toBe("Alice");
			expect(result[1].name).toBe("Bob");
			expect(result[2].name).toBe("Charlie");
		});

		test("returns empty array when no tags", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				return yield* service.getAllTags();
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result).toEqual([]);
		});
	});

	describe("getTagsByCategory", () => {
		test("returns tags in specified category", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				yield* service.createTag("Tag 1", "Theological");
				yield* service.createTag("Tag 2", "Theological");
				yield* service.createTag("Tag 3", "Characters");
				return yield* service.getTagsByCategory("Theological");
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result).toHaveLength(2);
			expect(result.every((t) => t.category === "Theological")).toBe(true);
		});

		test("returns empty array for nonexistent category", async () => {
			const program = Effect.gen(function* () {
				const service = yield* TagService;
				return yield* service.getTagsByCategory("NonexistentCategory");
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result).toEqual([]);
		});
	});
});
