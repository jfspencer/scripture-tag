/**
 * AnnotationService - Business logic for annotation management
 * Handles validation, business rules, and orchestrates repository operations
 */

import { Context, Effect, Layer } from "effect";
import { AnnotationError, type DatabaseError } from "../errors/AppErrors";
import type { TagAnnotation } from "../types/tag";
import { AnnotationRepository } from "./repositories/AnnotationRepository";
import { TagRepository } from "./repositories/TagRepository";

// Helper to map DatabaseError to AnnotationError
const mapDbError = (error: DatabaseError) =>
	new AnnotationError({
		reason: "InvalidTokens",
		message: `Database error: ${error.message || "Unknown error"}`,
	});

// Service definition
export class AnnotationService extends Context.Tag("AnnotationService")<
	AnnotationService,
	{
		readonly createAnnotation: (
			tagId: string,
			tokenIds: string[],
			note?: string,
		) => Effect.Effect<TagAnnotation, AnnotationError>;
		readonly updateAnnotation: (
			annotationId: string,
			updates: Partial<Pick<TagAnnotation, "note" | "tokenIds">>,
		) => Effect.Effect<TagAnnotation, AnnotationError>;
		readonly deleteAnnotation: (annotationId: string) => Effect.Effect<void, AnnotationError>;
		readonly getAnnotation: (annotationId: string) => Effect.Effect<TagAnnotation, AnnotationError>;
		readonly getAnnotationsForToken: (
			tokenId: string,
		) => Effect.Effect<TagAnnotation[], AnnotationError>;
		readonly getAnnotationsForTag: (
			tagId: string,
		) => Effect.Effect<TagAnnotation[], AnnotationError>;
		readonly getAllAnnotations: () => Effect.Effect<TagAnnotation[], AnnotationError>;
	}
>() {}

// Service implementation
export const makeAnnotationService = Effect.gen(function* () {
	const repo = yield* AnnotationRepository;
	const tagRepo = yield* TagRepository;

	return {
		createAnnotation: (tagId: string, tokenIds: string[], note?: string) =>
			Effect.gen(function* () {
				// Validate tag exists
				const tag = yield* tagRepo.findById(tagId).pipe(Effect.mapError(mapDbError));
				if (!tag) {
					return yield* Effect.fail(
						new AnnotationError({
							reason: "TagNotFound",
							message: `Tag with id "${tagId}" not found`,
						}),
					);
				}

				// Validate tokens
				if (tokenIds.length === 0) {
					return yield* Effect.fail(
						new AnnotationError({
							reason: "NoTokens",
							message: "At least one token ID is required",
						}),
					);
				}

				// Basic token ID format validation (book.chapter.verse.position)
				const tokenIdPattern = /^[a-z0-9-]+\.\d+\.\d+\.\d+$/;
				const invalidTokens = tokenIds.filter((id) => !tokenIdPattern.test(id));
				if (invalidTokens.length > 0) {
					return yield* Effect.fail(
						new AnnotationError({
							reason: "InvalidTokens",
							message: `Invalid token IDs: ${invalidTokens.join(", ")}`,
						}),
					);
				}

				// Create annotation
				const annotation: TagAnnotation = {
					id: crypto.randomUUID(),
					tagId,
					tokenIds,
					userId: "default", // TODO: Get from auth context
					note,
					createdAt: new Date(),
					lastModified: new Date(),
					version: 1,
				};

				yield* repo.save(annotation).pipe(Effect.mapError(mapDbError));
				return annotation;
			}),

		updateAnnotation: (
			annotationId: string,
			updates: Partial<Pick<TagAnnotation, "note" | "tokenIds">>,
		) =>
			Effect.gen(function* () {
				// Check if annotation exists
				const existing = yield* repo.findById(annotationId).pipe(Effect.mapError(mapDbError));
				if (!existing) {
					return yield* Effect.fail(
						new AnnotationError({
							reason: "NotFound",
							message: `Annotation with id "${annotationId}" not found`,
						}),
					);
				}

				// Validate token IDs if updating
				if (updates.tokenIds !== undefined) {
					if (updates.tokenIds.length === 0) {
						return yield* Effect.fail(
							new AnnotationError({
								reason: "NoTokens",
								message: "At least one token ID is required",
							}),
						);
					}

					const tokenIdPattern = /^[a-z0-9-]+\.\d+\.\d+\.\d+$/;
					const invalidTokens = updates.tokenIds.filter((id) => !tokenIdPattern.test(id));
					if (invalidTokens.length > 0) {
						return yield* Effect.fail(
							new AnnotationError({
								reason: "InvalidTokens",
								message: `Invalid token IDs: ${invalidTokens.join(", ")}`,
							}),
						);
					}
				}

				// Apply updates
				const updated: TagAnnotation = {
					...existing,
					...updates,
					lastModified: new Date(),
					version: existing.version + 1,
				};

				yield* repo.save(updated).pipe(Effect.mapError(mapDbError));
				return updated;
			}),

		deleteAnnotation: (annotationId: string) =>
			Effect.gen(function* () {
				// Check if annotation exists
				const existing = yield* repo.findById(annotationId).pipe(Effect.mapError(mapDbError));
				if (!existing) {
					return yield* Effect.fail(
						new AnnotationError({
							reason: "NotFound",
							message: `Annotation with id "${annotationId}" not found`,
						}),
					);
				}

				yield* repo.delete(annotationId).pipe(Effect.mapError(mapDbError));
			}),

		getAnnotation: (annotationId: string) =>
			Effect.gen(function* () {
				const annotation = yield* repo.findById(annotationId).pipe(Effect.mapError(mapDbError));
				if (!annotation) {
					return yield* Effect.fail(
						new AnnotationError({
							reason: "NotFound",
							message: `Annotation with id "${annotationId}" not found`,
						}),
					);
				}
				return annotation;
			}),

		getAnnotationsForToken: (tokenId: string) =>
			repo.findByTokenId(tokenId).pipe(Effect.mapError(mapDbError)),

		getAnnotationsForTag: (tagId: string) =>
			repo.findByTagId(tagId).pipe(Effect.mapError(mapDbError)),

		getAllAnnotations: () => repo.getAll().pipe(Effect.mapError(mapDbError)),
	} as const;
});

// Service layer
export const AnnotationServiceLive = Layer.effect(AnnotationService, makeAnnotationService);
