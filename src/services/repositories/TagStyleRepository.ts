/**
 * TagStyleRepository - Data access layer for tag styles
 * Uses SQLiteService for database operations
 */

import { Context, Effect, Layer } from "effect";
import type { DatabaseError } from "../../errors/AppErrors";
import type { TagStyle } from "../../types/tag";
import { SQLiteService } from "../SQLiteService";

// Database row type (matches SQLite schema)
interface TagStyleRow {
	tag_id: string;
	user_id: string | null;
	background_color: string | null;
	text_color: string | null;
	underline_style: string | null;
	underline_color: string | null;
	font_weight: string | null;
	icon: string | null;
	icon_position: string | null;
	opacity: number | null;
}

// Helper to map database row to TagStyle object
function mapRowToTagStyle(row: TagStyleRow): TagStyle {
	return {
		tagId: row.tag_id,
		userId: row.user_id || undefined,
		style: {
			backgroundColor: row.background_color || undefined,
			textColor: row.text_color || undefined,
			underlineStyle: (row.underline_style as TagStyle["style"]["underlineStyle"]) || undefined,
			underlineColor: row.underline_color || undefined,
			fontWeight: (row.font_weight as TagStyle["style"]["fontWeight"]) || undefined,
			icon: row.icon || undefined,
			iconPosition: (row.icon_position as TagStyle["style"]["iconPosition"]) || undefined,
			opacity: row.opacity || undefined,
		},
	};
}

// Helper to map TagStyle object to database row values
function tagStyleToRow(tagStyle: TagStyle): unknown[] {
	return [
		tagStyle.tagId,
		tagStyle.userId || null,
		tagStyle.style.backgroundColor || null,
		tagStyle.style.textColor || null,
		tagStyle.style.underlineStyle || null,
		tagStyle.style.underlineColor || null,
		tagStyle.style.fontWeight || null,
		tagStyle.style.icon || null,
		tagStyle.style.iconPosition || null,
		tagStyle.style.opacity || null,
	];
}

// Service definition
export class TagStyleRepository extends Context.Tag("TagStyleRepository")<
	TagStyleRepository,
	{
		readonly save: (tagStyle: TagStyle) => Effect.Effect<void, DatabaseError>;
		readonly findByTagId: (tagId: string) => Effect.Effect<TagStyle | undefined, DatabaseError>;
		readonly getAll: () => Effect.Effect<TagStyle[], DatabaseError>;
		readonly delete: (tagId: string) => Effect.Effect<void, DatabaseError>;
		readonly deleteByUserId: (userId: string) => Effect.Effect<void, DatabaseError>;
	}
>() {}

// Service implementation
export const makeTagStyleRepository = Effect.gen(function* () {
	const sqlite = yield* SQLiteService;

	return {
		save: (tagStyle: TagStyle) =>
			Effect.gen(function* () {
				const sql = `
					INSERT OR REPLACE INTO tag_styles 
					(tag_id, user_id, background_color, text_color, underline_style, 
					 underline_color, font_weight, icon, icon_position, opacity)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`;
				yield* sqlite.execute(sql, tagStyleToRow(tagStyle));
			}),

		findByTagId: (tagId: string) =>
			Effect.gen(function* () {
				const sql = "SELECT * FROM tag_styles WHERE tag_id = ?";
				const rows = yield* sqlite.query<TagStyleRow>(sql, [tagId]);
				return rows[0] ? mapRowToTagStyle(rows[0]) : undefined;
			}),

		getAll: () =>
			Effect.gen(function* () {
				const sql = "SELECT * FROM tag_styles";
				const rows = yield* sqlite.query<TagStyleRow>(sql);
				return rows.map(mapRowToTagStyle);
			}),

		delete: (tagId: string) =>
			Effect.gen(function* () {
				const sql = "DELETE FROM tag_styles WHERE tag_id = ?";
				yield* sqlite.execute(sql, [tagId]);
			}),

		deleteByUserId: (userId: string) =>
			Effect.gen(function* () {
				const sql = "DELETE FROM tag_styles WHERE user_id = ?";
				yield* sqlite.execute(sql, [userId]);
			}),
	} as const;
});

// Service layer
export const TagStyleRepositoryLive = Layer.effect(TagStyleRepository, makeTagStyleRepository);
