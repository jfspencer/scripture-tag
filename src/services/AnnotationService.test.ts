/**
 * Unit tests for AnnotationService
 * Tests the business logic layer for annotations
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import type { Tag, TagAnnotation } from "../types/tag";
import { AnnotationService, makeAnnotationService } from "./AnnotationService";
import { AnnotationRepository } from "./repositories/AnnotationRepository";
import { TagRepository } from "./repositories/TagRepository";

// Mock data stores
let mockAnnotations: Map<string, TagAnnotation> = new Map();
let mockTags: Map<string, Tag> = new Map();

const MockAnnotationRepository = Layer.succeed(AnnotationRepository, {
	save: (annotation: TagAnnotation) => {
		mockAnnotations.set(annotation.id, annotation);
		return Effect.succeed(undefined);
	},
	findById: (id: string) => Effect.succeed(mockAnnotations.get(id)),
	findByTagId: (tagId: string) => {
		const annotations = Array.from(mockAnnotations.values()).filter((a) => a.tagId === tagId);
		return Effect.succeed(annotations);
	},
	findByTokenId: (tokenId: string) => {
		const annotations = Array.from(mockAnnotations.values()).filter((a) =>
			a.tokenIds.includes(tokenId),
		);
		return Effect.succeed(annotations);
	},
	getAll: () => {
		const annotations = Array.from(mockAnnotations.values()).sort(
			(a, b) => b.lastModified.getTime() - a.lastModified.getTime(),
		);
		return Effect.succeed(annotations);
	},
	delete: (id: string) => {
		mockAnnotations.delete(id);
		return Effect.succeed(undefined);
	},
	deleteByTagId: (tagId: string) => {
		for (const [id, annotation] of mockAnnotations.entries()) {
			if (annotation.tagId === tagId) {
				mockAnnotations.delete(id);
			}
		}
		return Effect.succeed(undefined);
	},
});

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
	getAll: () => Effect.succeed(Array.from(mockTags.values())),
	delete: (id: string) => {
		mockTags.delete(id);
		return Effect.succeed(undefined);
	},
	findByCategory: (category: string) => {
		const tags = Array.from(mockTags.values()).filter((t) => t.category === category);
		return Effect.succeed(tags);
	},
});

const TestLayer = Layer.provide(
	Layer.effect(AnnotationService, makeAnnotationService),
	Layer.mergeAll(MockAnnotationRepository, MockTagRepository),
);

describe("AnnotationService", () => {
	beforeEach(() => {
		mockAnnotations = new Map();
		mockTags = new Map();
	});

	describe("createAnnotation", () => {
		test("creates annotation with valid data", async () => {
			const tag: Tag = {
				id: "tag-1",
				name: "Test Tag",
				metadata: {},
				createdAt: new Date(),
				userId: "user-1",
			};
			mockTags.set(tag.id, tag);

			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				return yield* service.createAnnotation("tag-1", ["gen.1.1.1", "gen.1.1.2"], "Test note");
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result.tagId).toBe("tag-1");
			expect(result.tokenIds).toEqual(["gen.1.1.1", "gen.1.1.2"]);
			expect(result.note).toBe("Test note");
			expect(result.id).toBeDefined();
			expect(result.version).toBe(1);
		});

		test("creates annotation without note", async () => {
			const tag: Tag = {
				id: "tag-1",
				name: "Test Tag",
				metadata: {},
				createdAt: new Date(),
				userId: "user-1",
			};
			mockTags.set(tag.id, tag);

			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				return yield* service.createAnnotation("tag-1", ["gen.1.1.1"]);
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result.note).toBeUndefined();
		});

		test("fails when tag not found", async () => {
			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				return yield* service.createAnnotation("nonexistent-tag", ["gen.1.1.1"]);
			}).pipe(Effect.catchTag("AnnotationError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error.reason).toBe("TagNotFound");
			}
		});

		test("fails with empty token array", async () => {
			const tag: Tag = {
				id: "tag-1",
				name: "Test Tag",
				metadata: {},
				createdAt: new Date(),
				userId: "user-1",
			};
			mockTags.set(tag.id, tag);

			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				return yield* service.createAnnotation("tag-1", []);
			}).pipe(Effect.catchTag("AnnotationError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error.reason).toBe("NoTokens");
			}
		});

		test("fails with invalid token ID format", async () => {
			const tag: Tag = {
				id: "tag-1",
				name: "Test Tag",
				metadata: {},
				createdAt: new Date(),
				userId: "user-1",
			};
			mockTags.set(tag.id, tag);

			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				return yield* service.createAnnotation("tag-1", ["invalid-token-id"]);
			}).pipe(Effect.catchTag("AnnotationError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error.reason).toBe("InvalidTokens");
			}
		});

		test("accepts valid token ID formats", async () => {
			const tag: Tag = {
				id: "tag-1",
				name: "Test Tag",
				metadata: {},
				createdAt: new Date(),
				userId: "user-1",
			};
			mockTags.set(tag.id, tag);

			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				return yield* Effect.all([
					service.createAnnotation("tag-1", ["gen.1.1.1"]),
					service.createAnnotation("tag-1", ["1-ne.2.3.10"]),
					service.createAnnotation("tag-1", ["ps.119.105.25"]),
				]);
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result).toHaveLength(3);
		});
	});

	describe("updateAnnotation", () => {
		test("updates annotation note", async () => {
			const tag: Tag = {
				id: "tag-1",
				name: "Test Tag",
				metadata: {},
				createdAt: new Date(),
				userId: "user-1",
			};
			mockTags.set(tag.id, tag);

			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				const created = yield* service.createAnnotation("tag-1", ["gen.1.1.1"], "Original note");
				return yield* service.updateAnnotation(created.id, { note: "Updated note" });
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result.note).toBe("Updated note");
			expect(result.version).toBe(2); // Version incremented
			expect(result.lastModified.getTime()).toBeGreaterThanOrEqual(result.createdAt.getTime());
		});

		test("updates annotation token IDs", async () => {
			const tag: Tag = {
				id: "tag-1",
				name: "Test Tag",
				metadata: {},
				createdAt: new Date(),
				userId: "user-1",
			};
			mockTags.set(tag.id, tag);

			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				const created = yield* service.createAnnotation("tag-1", ["gen.1.1.1"]);
				return yield* service.updateAnnotation(created.id, {
					tokenIds: ["gen.1.1.2", "gen.1.1.3"],
				});
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result.tokenIds).toEqual(["gen.1.1.2", "gen.1.1.3"]);
		});

		test("fails when annotation not found", async () => {
			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				return yield* service.updateAnnotation("nonexistent-id", { note: "New note" });
			}).pipe(Effect.catchTag("AnnotationError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error.reason).toBe("NotFound");
			}
		});

		test("fails when updating to empty token array", async () => {
			const tag: Tag = {
				id: "tag-1",
				name: "Test Tag",
				metadata: {},
				createdAt: new Date(),
				userId: "user-1",
			};
			mockTags.set(tag.id, tag);

			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				const created = yield* service.createAnnotation("tag-1", ["gen.1.1.1"]);
				return yield* service.updateAnnotation(created.id, { tokenIds: [] });
			}).pipe(Effect.catchTag("AnnotationError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error.reason).toBe("NoTokens");
			}
		});

		test("fails when updating to invalid token IDs", async () => {
			const tag: Tag = {
				id: "tag-1",
				name: "Test Tag",
				metadata: {},
				createdAt: new Date(),
				userId: "user-1",
			};
			mockTags.set(tag.id, tag);

			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				const created = yield* service.createAnnotation("tag-1", ["gen.1.1.1"]);
				return yield* service.updateAnnotation(created.id, { tokenIds: ["invalid"] });
			}).pipe(Effect.catchTag("AnnotationError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error.reason).toBe("InvalidTokens");
			}
		});
	});

	describe("deleteAnnotation", () => {
		test("deletes existing annotation", async () => {
			const tag: Tag = {
				id: "tag-1",
				name: "Test Tag",
				metadata: {},
				createdAt: new Date(),
				userId: "user-1",
			};
			mockTags.set(tag.id, tag);

			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				const created = yield* service.createAnnotation("tag-1", ["gen.1.1.1"]);
				yield* service.deleteAnnotation(created.id);
				return yield* service.getAnnotation(created.id);
			}).pipe(Effect.catchTag("AnnotationError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
		});

		test("fails when annotation not found", async () => {
			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				return yield* service.deleteAnnotation("nonexistent-id");
			}).pipe(Effect.catchTag("AnnotationError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error.reason).toBe("NotFound");
			}
		});
	});

	describe("getAnnotation", () => {
		test("retrieves existing annotation", async () => {
			const tag: Tag = {
				id: "tag-1",
				name: "Test Tag",
				metadata: {},
				createdAt: new Date(),
				userId: "user-1",
			};
			mockTags.set(tag.id, tag);

			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				const created = yield* service.createAnnotation("tag-1", ["gen.1.1.1"]);
				return yield* service.getAnnotation(created.id);
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result.tagId).toBe("tag-1");
		});

		test("fails when annotation not found", async () => {
			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				return yield* service.getAnnotation("nonexistent-id");
			}).pipe(Effect.catchTag("AnnotationError", (error) => Effect.succeed({ error })));

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect("error" in result).toBe(true);
		});
	});

	describe("getAnnotationsForToken", () => {
		test("returns all annotations for a token", async () => {
			const tag: Tag = {
				id: "tag-1",
				name: "Test Tag",
				metadata: {},
				createdAt: new Date(),
				userId: "user-1",
			};
			mockTags.set(tag.id, tag);

			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				yield* service.createAnnotation("tag-1", ["gen.1.1.1", "gen.1.1.2"]);
				yield* service.createAnnotation("tag-1", ["gen.1.1.1"]);
				yield* service.createAnnotation("tag-1", ["gen.1.1.3"]);
				return yield* service.getAnnotationsForToken("gen.1.1.1");
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result).toHaveLength(2);
		});

		test("returns empty array when no annotations", async () => {
			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				return yield* service.getAnnotationsForToken("gen.1.1.1");
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result).toEqual([]);
		});
	});

	describe("getAnnotationsForTag", () => {
		test("returns all annotations for a tag", async () => {
			const tag1: Tag = {
				id: "tag-1",
				name: "Tag 1",
				metadata: {},
				createdAt: new Date(),
				userId: "user-1",
			};
			const tag2: Tag = {
				id: "tag-2",
				name: "Tag 2",
				metadata: {},
				createdAt: new Date(),
				userId: "user-1",
			};
			mockTags.set(tag1.id, tag1);
			mockTags.set(tag2.id, tag2);

			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				yield* service.createAnnotation("tag-1", ["gen.1.1.1"]);
				yield* service.createAnnotation("tag-1", ["gen.1.1.2"]);
				yield* service.createAnnotation("tag-2", ["gen.1.1.3"]);
				return yield* service.getAnnotationsForTag("tag-1");
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result).toHaveLength(2);
			expect(result.every((a) => a.tagId === "tag-1")).toBe(true);
		});
	});

	describe("getAllAnnotations", () => {
		test("returns all annotations ordered by last modified", async () => {
			const tag: Tag = {
				id: "tag-1",
				name: "Test Tag",
				metadata: {},
				createdAt: new Date(),
				userId: "user-1",
			};
			mockTags.set(tag.id, tag);

			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				yield* service.createAnnotation("tag-1", ["gen.1.1.1"]);
				yield* service.createAnnotation("tag-1", ["gen.1.1.2"]);
				yield* service.createAnnotation("tag-1", ["gen.1.1.3"]);
				return yield* service.getAllAnnotations();
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result).toHaveLength(3);
		});

		test("returns empty array when no annotations", async () => {
			const program = Effect.gen(function* () {
				const service = yield* AnnotationService;
				return yield* service.getAllAnnotations();
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

			expect(result).toEqual([]);
		});
	});
});
