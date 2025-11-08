/**
 * SQLiteService - Effect-TS service for SQLite database operations
 * Communicates with Web Worker for all database operations
 */

import { Context, Effect, Layer } from "effect";
import { DatabaseError } from "../errors/AppErrors";

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

// Service definition
export class SQLiteService extends Context.Tag("SQLiteService")<
	SQLiteService,
	{
		readonly query: <T = unknown>(
			sql: string,
			params?: unknown[],
		) => Effect.Effect<T[], DatabaseError>;
		readonly execute: (sql: string, params?: unknown[]) => Effect.Effect<void, DatabaseError>;
		readonly exportDatabase: () => Effect.Effect<Uint8Array, DatabaseError>;
		readonly importDatabase: (
			data: Uint8Array,
			strategy: "replace" | "merge" | "skip-existing",
		) => Effect.Effect<void, DatabaseError>;
	}
>() {}

// Service implementation
export const makeSQLiteService = Effect.gen(function* () {
	// Initialize Web Worker
	const worker = new Worker(new URL("../workers/sqlite-worker.ts", import.meta.url), {
		type: "module",
	});

	let requestId = 0;
	const pending = new Map<
		number,
		{
			resolve: (value: unknown) => void;
			reject: (error: unknown) => void;
		}
	>();

	// Handle messages from worker
	worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
		const { id, result, error } = e.data;
		const handler = pending.get(id);

		if (handler) {
			if (error) {
				handler.reject(new DatabaseError({ message: error, cause: error }));
			} else {
				handler.resolve(result);
			}
			pending.delete(id);
		}
	};

	// Handle worker errors
	worker.onerror = (error) => {
		console.error("SQLite Worker error:", error);
		// Reject all pending requests
		for (const handler of pending.values()) {
			handler.reject(new DatabaseError({ message: "Worker error", cause: error }));
		}
		pending.clear();
	};

	// Send request to worker
	const sendRequest = <T>(
		type: WorkerRequest["type"],
		payload: WorkerRequest["payload"],
	): Effect.Effect<T, DatabaseError> =>
		Effect.async<T, DatabaseError>((resume) => {
			const id = requestId++;

			pending.set(id, {
				resolve: (result) => resume(Effect.succeed(result as T)),
				reject: (error) =>
					resume(
						Effect.fail(
							error instanceof DatabaseError
								? error
								: new DatabaseError({ message: String(error), cause: error }),
						),
					),
			});

			worker.postMessage({ id, type, payload } satisfies WorkerRequest);
		});

	// Initialize database
	yield* sendRequest("init", {});

	// Return service implementation
	return {
		query: <T = unknown>(sql: string, params: unknown[] = []) =>
			sendRequest<T[]>("query", { sql, params }),

		execute: (sql: string, params: unknown[] = []) => sendRequest<void>("execute", { sql, params }),

		exportDatabase: () => sendRequest<Uint8Array>("export", {}),

		importDatabase: (data: Uint8Array, strategy: "replace" | "merge" | "skip-existing") =>
			sendRequest<void>("import", { data, strategy }),
	} as const;
});

// Service layer
export const SQLiteServiceLive = Layer.effect(SQLiteService, makeSQLiteService);
