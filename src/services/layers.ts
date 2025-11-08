/**
 * Service Layers Composition
 * Wires all services together and provides main application layer
 */

import { Layer } from "effect";
import { AnnotationServiceLive } from "./AnnotationService";
import { GitSyncServiceLive } from "./GitSyncService";
import { AnnotationRepositoryLive } from "./repositories/AnnotationRepository";
import { TagRepositoryLive } from "./repositories/TagRepository";
import { SQLiteServiceLive } from "./SQLiteService";
import { TagServiceLive } from "./TagService";

/**
 * Individual service layers for testing or selective use
 */
export const DatabaseLayer = SQLiteServiceLive;

export const RepositoryLayer = Layer.mergeAll(TagRepositoryLive, AnnotationRepositoryLive);

export const ServiceLayer = Layer.mergeAll(
	TagServiceLive,
	AnnotationServiceLive,
	GitSyncServiceLive,
);

/**
 * Main application layer with all services
 * Dependency graph:
 * - SQLiteService (base layer)
 * - TagRepository & AnnotationRepository (depend on SQLiteService)
 * - TagService & AnnotationService (depend on repositories)
 * - GitSyncService (depends on SQLiteService)
 */
export const AppLayer = ServiceLayer.pipe(
	Layer.provide(RepositoryLayer),
	Layer.provide(DatabaseLayer),
);
