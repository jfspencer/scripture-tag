/**
 * TagService - Business logic for tag management
 * Handles validation, business rules, and orchestrates repository operations
 */

import { Context, Effect, Layer } from "effect";
import { type DatabaseError, TagError } from "../errors/AppErrors";
import type { Tag } from "../types/tag";
import { TagRepository } from "./repositories/TagRepository";

// Helper to map DatabaseError to TagError
const mapDbError = (error: DatabaseError) =>
	new TagError({
		reason: "InvalidData",
		message: `Database error: ${error.message || "Unknown error"}`,
	});

// Service definition
export class TagService extends Context.Tag("TagService")<
	TagService,
	{
		readonly createTag: (
			name: string,
			category?: string,
			metadata?: Tag["metadata"],
		) => Effect.Effect<Tag, TagError>;
		readonly updateTag: (
			id: string,
			updates: Partial<Pick<Tag, "name" | "description" | "category" | "metadata">>,
		) => Effect.Effect<Tag, TagError>;
		readonly deleteTag: (tagId: string) => Effect.Effect<void, TagError>;
		readonly getTag: (tagId: string) => Effect.Effect<Tag, TagError>;
		readonly getAllTags: () => Effect.Effect<Tag[], TagError>;
		readonly getTagsByCategory: (category: string) => Effect.Effect<Tag[], TagError>;
	}
>() {}

// Service implementation
export const makeTagService = Effect.gen(function* () {
	const repo = yield* TagRepository;

	return {
		createTag: (name: string, category?: string, metadata?: Tag["metadata"]) =>
			Effect.gen(function* () {
				// Validation: name not empty
				const trimmedName = name.trim();
				if (trimmedName.length === 0) {
					return yield* Effect.fail(
						new TagError({
							reason: "EmptyName",
							message: "Tag name cannot be empty",
						}),
					);
				}

				// Check for duplicates
				const existing = yield* repo.findByName(trimmedName).pipe(Effect.mapError(mapDbError));
				if (existing) {
					return yield* Effect.fail(
						new TagError({
							reason: "DuplicateName",
							message: `Tag with name "${trimmedName}" already exists`,
						}),
					);
				}

				// Create tag
				const tag: Tag = {
					id: crypto.randomUUID(),
					name: trimmedName,
					category,
					metadata: metadata || {},
					createdAt: new Date(),
					userId: "default", // TODO: Get from auth context
				};

				yield* repo.save(tag).pipe(Effect.mapError(mapDbError));
				return tag;
			}),

		updateTag: (
			id: string,
			updates: Partial<Pick<Tag, "name" | "description" | "category" | "metadata">>,
		) =>
			Effect.gen(function* () {
				// Check if tag exists
				const existing = yield* repo.findById(id).pipe(Effect.mapError(mapDbError));
				if (!existing) {
					return yield* Effect.fail(
						new TagError({
							reason: "NotFound",
							message: `Tag with id "${id}" not found`,
						}),
					);
				}

				// Validate name if updating
				if (updates.name !== undefined) {
					const trimmedName = updates.name.trim();
					if (trimmedName.length === 0) {
						return yield* Effect.fail(
							new TagError({
								reason: "EmptyName",
								message: "Tag name cannot be empty",
							}),
						);
					}

					// Check for duplicate name (excluding current tag)
					const duplicate = yield* repo.findByName(trimmedName).pipe(Effect.mapError(mapDbError));
					if (duplicate && duplicate.id !== id) {
						return yield* Effect.fail(
							new TagError({
								reason: "DuplicateName",
								message: `Tag with name "${trimmedName}" already exists`,
							}),
						);
					}
				}

				// Apply updates
				const updated: Tag = {
					...existing,
					...updates,
					metadata: updates.metadata
						? { ...existing.metadata, ...updates.metadata }
						: existing.metadata,
				};

				yield* repo.save(updated).pipe(Effect.mapError(mapDbError));
				return updated;
			}),

		deleteTag: (tagId: string) =>
			Effect.gen(function* () {
				// Check if tag exists
				const tag = yield* repo.findById(tagId).pipe(Effect.mapError(mapDbError));
				if (!tag) {
					return yield* Effect.fail(
						new TagError({
							reason: "NotFound",
							message: `Tag with id "${tagId}" not found`,
						}),
					);
				}

				// Delete the tag (cascades to annotations via foreign key)
				yield* repo.delete(tagId).pipe(Effect.mapError(mapDbError));
			}),

		getTag: (tagId: string) =>
			Effect.gen(function* () {
				const tag = yield* repo.findById(tagId).pipe(Effect.mapError(mapDbError));
				if (!tag) {
					return yield* Effect.fail(
						new TagError({
							reason: "NotFound",
							message: `Tag with id "${tagId}" not found`,
						}),
					);
				}
				return tag;
			}),

		getAllTags: () => repo.getAll().pipe(Effect.mapError(mapDbError)),

		getTagsByCategory: (category: string) =>
			repo.findByCategory(category).pipe(Effect.mapError(mapDbError)),
	} as const;
});

// Service layer
export const TagServiceLive = Layer.effect(TagService, makeTagService);
