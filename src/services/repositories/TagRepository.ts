/**
 * TagRepository - Data access layer for tags
 * Uses SQLiteService for database operations
 */

import { Context, Effect, Layer } from "effect";
import type { DatabaseError } from "../../errors/AppErrors";
import type { Tag } from "../../types/tag";
import { SQLiteService } from "../SQLiteService";

// Database row type (matches SQLite schema)
interface TagRow {
	id: string;
	name: string;
	description: string | null;
	category: string | null;
	color: string | null;
	icon: string | null;
	priority: number | null;
	created_at: number;
	user_id: string;
}

// Helper to map database row to Tag object
function mapRowToTag(row: TagRow): Tag {
	return {
		id: row.id,
		name: row.name,
		description: row.description || undefined,
		category: row.category || undefined,
		metadata: {
			color: row.color || undefined,
			icon: row.icon || undefined,
			priority: row.priority || undefined,
		},
		createdAt: new Date(row.created_at),
		userId: row.user_id,
	};
}

// Helper to map Tag object to database row values
function tagToRow(tag: Tag): unknown[] {
	return [
		tag.id,
		tag.name,
		tag.description || null,
		tag.category || null,
		tag.metadata.color || null,
		tag.metadata.icon || null,
		tag.metadata.priority || null,
		tag.createdAt.getTime(),
		tag.userId,
	];
}

// Service definition
export class TagRepository extends Context.Tag("TagRepository")<
	TagRepository,
	{
		readonly save: (tag: Tag) => Effect.Effect<void, DatabaseError>;
		readonly findById: (id: string) => Effect.Effect<Tag | undefined, DatabaseError>;
		readonly findByName: (name: string) => Effect.Effect<Tag | undefined, DatabaseError>;
		readonly getAll: () => Effect.Effect<Tag[], DatabaseError>;
		readonly delete: (id: string) => Effect.Effect<void, DatabaseError>;
		readonly findByCategory: (category: string) => Effect.Effect<Tag[], DatabaseError>;
	}
>() {}

// Service implementation
export const makeTagRepository = Effect.gen(function* () {
	const sqlite = yield* SQLiteService;

	return {
		save: (tag: Tag) =>
			Effect.gen(function* () {
				const sql = `
					INSERT OR REPLACE INTO tags 
					(id, name, description, category, color, icon, priority, created_at, user_id)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				`;
				yield* sqlite.execute(sql, tagToRow(tag));
			}),

		findById: (id: string) =>
			Effect.gen(function* () {
				const sql = "SELECT * FROM tags WHERE id = ?";
				const rows = yield* sqlite.query<TagRow>(sql, [id]);
				return rows[0] ? mapRowToTag(rows[0]) : undefined;
			}),

		findByName: (name: string) =>
			Effect.gen(function* () {
				const sql = "SELECT * FROM tags WHERE name = ? LIMIT 1";
				const rows = yield* sqlite.query<TagRow>(sql, [name]);
				return rows[0] ? mapRowToTag(rows[0]) : undefined;
			}),

		getAll: () =>
			Effect.gen(function* () {
				const sql = "SELECT * FROM tags ORDER BY name";
				const rows = yield* sqlite.query<TagRow>(sql);
				return rows.map(mapRowToTag);
			}),

		delete: (id: string) =>
			Effect.gen(function* () {
				const sql = "DELETE FROM tags WHERE id = ?";
				yield* sqlite.execute(sql, [id]);
			}),

		findByCategory: (category: string) =>
			Effect.gen(function* () {
				const sql = "SELECT * FROM tags WHERE category = ? ORDER BY name";
				const rows = yield* sqlite.query<TagRow>(sql, [category]);
				return rows.map(mapRowToTag);
			}),
	} as const;
});

// Service layer
export const TagRepositoryLive = Layer.effect(TagRepository, makeTagRepository);
