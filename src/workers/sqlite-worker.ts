/**
 * SQLite Web Worker
 * Handles all database operations using SQLite WASM with OPFS persistence
 */

import sqlite3InitModule from "@sqlite.org/sqlite-wasm";

interface WorkerRequest {
	id: number;
	type: "init" | "query" | "execute" | "export" | "import";
	payload: {
		sql?: string;
		params?: unknown[];
		data?: Uint8Array;
		strategy?: "replace" | "merge" | "skip-existing";
	};
}

interface WorkerResponse {
	id: number;
	result?: unknown;
	error?: string;
}

// biome-ignore lint/suspicious/noExplicitAny: SQLite WASM types are not available
let db: any = null;
// biome-ignore lint/suspicious/noExplicitAny: SQLite WASM types are not available
let sqlite3: any = null;

// Initialize SQLite with OPFS
async function initDatabase() {
	try {
		sqlite3 = await sqlite3InitModule({
			print: console.log,
			printErr: console.error,
		});

		// Use OPFS VFS for persistence
		const opfs = sqlite3.capi.sqlite3_vfs_find("opfs");
		if (!opfs) {
			throw new Error("OPFS VFS not available");
		}

		// Open database with OPFS
		db = new sqlite3.oo1.OpfsDb("/scripture-tags.db");

		// Load schema
		const schemaSQL = `
			-- Tags table
			CREATE TABLE IF NOT EXISTS tags (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				description TEXT,
				category TEXT,
				color TEXT,
				icon TEXT,
				priority INTEGER,
				created_at INTEGER NOT NULL,
				user_id TEXT NOT NULL
			);

			CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
			CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
			CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

			-- Annotations table
			CREATE TABLE IF NOT EXISTS annotations (
				id TEXT PRIMARY KEY,
				tag_id TEXT NOT NULL,
				token_ids TEXT NOT NULL,
				user_id TEXT NOT NULL,
				note TEXT,
				created_at INTEGER NOT NULL,
				last_modified INTEGER NOT NULL,
				version INTEGER NOT NULL DEFAULT 1,
				FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
			);

			CREATE INDEX IF NOT EXISTS idx_annotations_tag_id ON annotations(tag_id);
			CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON annotations(user_id);
			CREATE INDEX IF NOT EXISTS idx_annotations_last_modified ON annotations(last_modified);

			-- Tag styles table
			CREATE TABLE IF NOT EXISTS tag_styles (
				tag_id TEXT PRIMARY KEY,
				user_id TEXT,
				background_color TEXT,
				text_color TEXT,
				underline_style TEXT,
				underline_color TEXT,
				font_weight TEXT,
				icon TEXT,
				icon_position TEXT,
				opacity REAL,
				FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
			);

			CREATE INDEX IF NOT EXISTS idx_tag_styles_user_id ON tag_styles(user_id);
		`;

		db.exec(schemaSQL);

		return { success: true };
	} catch (error) {
		console.error("Failed to initialize database:", error);
		throw error;
	}
}

// Execute SQL query and return rows
function executeQuery(sql: string, params: unknown[] = []): unknown[] {
	if (!db) {
		throw new Error("Database not initialized");
	}

	const rows: unknown[] = [];
	try {
		const stmt = db.prepare(sql);
		stmt.bind(params);

		while (stmt.step()) {
			const row: Record<string, unknown> = {};
			const columnCount = stmt.getColumnCount();

			for (let i = 0; i < columnCount; i++) {
				const name = stmt.getColumnName(i);
				const value = stmt.get(i);
				row[name] = value;
			}

			rows.push(row);
		}

		stmt.finalize();
		return rows;
	} catch (error) {
		console.error("Query execution failed:", error);
		throw error;
	}
}

// Execute SQL statement (INSERT, UPDATE, DELETE)
function executeStatement(sql: string, params: unknown[] = []): void {
	if (!db) {
		throw new Error("Database not initialized");
	}

	try {
		const stmt = db.prepare(sql);
		stmt.bind(params);
		stmt.step();
		stmt.finalize();
	} catch (error) {
		console.error("Statement execution failed:", error);
		throw error;
	}
}

// Export database to Uint8Array
function exportDatabase(): Uint8Array {
	if (!db) {
		throw new Error("Database not initialized");
	}

	try {
		// Use SQLite's export functionality
		const exported = sqlite3.capi.sqlite3_js_db_export(db.pointer);
		return new Uint8Array(exported);
	} catch (error) {
		console.error("Database export failed:", error);
		throw error;
	}
}

// Import database from Uint8Array
async function importDatabase(
	data: Uint8Array,
	strategy: "replace" | "merge" | "skip-existing",
): Promise<void> {
	if (!db) {
		throw new Error("Database not initialized");
	}

	try {
		// Create temporary database from imported data
		const tempDbName = `/temp-import-${Date.now()}.db`;
		const tempDb = new sqlite3.oo1.DB(tempDbName, "c");

		// Load imported data into temp database
		sqlite3.capi.sqlite3_js_db_import(tempDb.pointer, data);

		// Merge based on strategy
		db.exec("BEGIN TRANSACTION");

		try {
			if (strategy === "replace") {
				// Clear existing data
				db.exec("DELETE FROM tag_styles");
				db.exec("DELETE FROM annotations");
				db.exec("DELETE FROM tags");
			}

			// Attach temporary database
			db.exec(`ATTACH DATABASE '${tempDbName}' AS import_db`);

			// Merge tags
			const tagSQL =
				strategy === "skip-existing"
					? `INSERT OR IGNORE INTO tags SELECT * FROM import_db.tags`
					: `INSERT OR REPLACE INTO tags SELECT * FROM import_db.tags`;
			db.exec(tagSQL);

			// Merge annotations
			const annotationSQL =
				strategy === "skip-existing"
					? `INSERT OR IGNORE INTO annotations SELECT * FROM import_db.annotations`
					: `INSERT OR REPLACE INTO annotations SELECT * FROM import_db.annotations`;
			db.exec(annotationSQL);

			// Merge tag styles
			const styleSQL =
				strategy === "skip-existing"
					? `INSERT OR IGNORE INTO tag_styles SELECT * FROM import_db.tag_styles`
					: `INSERT OR REPLACE INTO tag_styles SELECT * FROM import_db.tag_styles`;
			db.exec(styleSQL);

			// Detach temporary database
			db.exec("DETACH DATABASE import_db");

			db.exec("COMMIT");
		} catch (error) {
			db.exec("ROLLBACK");
			throw error;
		} finally {
			tempDb.close();
		}
	} catch (error) {
		console.error("Database import failed:", error);
		throw error;
	}
}

// Message handler
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
	const { id, type, payload } = event.data;
	const response: WorkerResponse = { id };

	try {
		switch (type) {
			case "init":
				response.result = await initDatabase();
				break;

			case "query":
				if (!payload.sql) {
					throw new Error("SQL query required");
				}
				response.result = executeQuery(payload.sql, payload.params || []);
				break;

			case "execute":
				if (!payload.sql) {
					throw new Error("SQL statement required");
				}
				executeStatement(payload.sql, payload.params || []);
				response.result = { success: true };
				break;

			case "export":
				response.result = exportDatabase();
				break;

			case "import":
				if (!payload.data || !payload.strategy) {
					throw new Error("Import data and strategy required");
				}
				await importDatabase(payload.data, payload.strategy);
				response.result = { success: true };
				break;

			default:
				throw new Error(`Unknown request type: ${type}`);
		}
	} catch (error) {
		response.error = error instanceof Error ? error.message : String(error);
	}

	self.postMessage(response);
};

// Auto-initialize on worker load
initDatabase().catch((error) => {
	console.error("Failed to auto-initialize database:", error);
});
