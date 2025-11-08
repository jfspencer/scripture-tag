/**
 * AnnotationRepository - Data access layer for annotations
 * Uses SQLiteService for database operations
 */

import { Context, Effect, Layer } from "effect";
import type { DatabaseError } from "../../errors/AppErrors";
import type { TagAnnotation } from "../../types/tag";
import { SQLiteService } from "../SQLiteService";

// Database row type (matches SQLite schema)
interface AnnotationRow {
	id: string;
	tag_id: string;
	token_ids: string; // JSON array as string
	user_id: string;
	note: string | null;
	created_at: number;
	last_modified: number;
	version: number;
}

// Helper to map database row to TagAnnotation object
function mapRowToAnnotation(row: AnnotationRow): TagAnnotation {
	return {
		id: row.id,
		tagId: row.tag_id,
		tokenIds: JSON.parse(row.token_ids) as string[],
		userId: row.user_id,
		note: row.note || undefined,
		createdAt: new Date(row.created_at),
		lastModified: new Date(row.last_modified),
		version: row.version,
	};
}

// Helper to map TagAnnotation object to database row values
function annotationToRow(annotation: TagAnnotation): unknown[] {
	return [
		annotation.id,
		annotation.tagId,
		JSON.stringify(annotation.tokenIds),
		annotation.userId,
		annotation.note || null,
		annotation.createdAt.getTime(),
		annotation.lastModified.getTime(),
		annotation.version,
	];
}

// Service definition
export class AnnotationRepository extends Context.Tag("AnnotationRepository")<
	AnnotationRepository,
	{
		readonly save: (annotation: TagAnnotation) => Effect.Effect<void, DatabaseError>;
		readonly findById: (id: string) => Effect.Effect<TagAnnotation | undefined, DatabaseError>;
		readonly findByTagId: (tagId: string) => Effect.Effect<TagAnnotation[], DatabaseError>;
		readonly findByTokenId: (tokenId: string) => Effect.Effect<TagAnnotation[], DatabaseError>;
		readonly getAll: () => Effect.Effect<TagAnnotation[], DatabaseError>;
		readonly delete: (id: string) => Effect.Effect<void, DatabaseError>;
		readonly deleteByTagId: (tagId: string) => Effect.Effect<void, DatabaseError>;
	}
>() {}

// Service implementation
export const makeAnnotationRepository = Effect.gen(function* () {
	const sqlite = yield* SQLiteService;

	return {
		save: (annotation: TagAnnotation) =>
			Effect.gen(function* () {
				const sql = `
					INSERT OR REPLACE INTO annotations 
					(id, tag_id, token_ids, user_id, note, created_at, last_modified, version)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?)
				`;
				yield* sqlite.execute(sql, annotationToRow(annotation));
			}),

		findById: (id: string) =>
			Effect.gen(function* () {
				const sql = "SELECT * FROM annotations WHERE id = ?";
				const rows = yield* sqlite.query<AnnotationRow>(sql, [id]);
				return rows[0] ? mapRowToAnnotation(rows[0]) : undefined;
			}),

		findByTagId: (tagId: string) =>
			Effect.gen(function* () {
				const sql = "SELECT * FROM annotations WHERE tag_id = ?";
				const rows = yield* sqlite.query<AnnotationRow>(sql, [tagId]);
				return rows.map(mapRowToAnnotation);
			}),

		findByTokenId: (tokenId: string) =>
			Effect.gen(function* () {
				// Use SQLite JSON functions to query token_ids array
				const sql = `
					SELECT * FROM annotations 
					WHERE EXISTS (
						SELECT 1 FROM json_each(token_ids) 
						WHERE json_each.value = ?
					)
				`;
				const rows = yield* sqlite.query<AnnotationRow>(sql, [tokenId]);
				return rows.map(mapRowToAnnotation);
			}),

		getAll: () =>
			Effect.gen(function* () {
				const sql = "SELECT * FROM annotations ORDER BY last_modified DESC";
				const rows = yield* sqlite.query<AnnotationRow>(sql);
				return rows.map(mapRowToAnnotation);
			}),

		delete: (id: string) =>
			Effect.gen(function* () {
				const sql = "DELETE FROM annotations WHERE id = ?";
				yield* sqlite.execute(sql, [id]);
			}),

		deleteByTagId: (tagId: string) =>
			Effect.gen(function* () {
				const sql = "DELETE FROM annotations WHERE tag_id = ?";
				yield* sqlite.execute(sql, [tagId]);
			}),
	} as const;
});

// Service layer
export const AnnotationRepositoryLive = Layer.effect(
	AnnotationRepository,
	makeAnnotationRepository,
);
