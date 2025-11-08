/**
 * Service Layers Composition
 * Wires all services together and provides main application layer
 */

import { Layer } from "effect";
import { AnnotationServiceLive } from "./AnnotationService";
import { GitSyncServiceLive } from "./GitSyncService";
import { AnnotationRepositoryLive } from "./repositories/AnnotationRepository";
import { TagRepositoryLive } from "./repositories/TagRepository";
import { TagStyleRepositoryLive } from "./repositories/TagStyleRepository";
import { SQLiteServiceLive } from "./SQLiteService";
import { TagServiceLive } from "./TagService";

console.log("[Layers] Loading service layers");
console.log("[Layers] TagStyleRepositoryLive:", TagStyleRepositoryLive);

/**
 * Database layer - base dependency for all repositories
 */
export const DatabaseLayer = SQLiteServiceLive;

/**
 * Repository layer - all repositories with database dependency satisfied
 * 
 * Important: We provide the database to each repository layer before merging them.
 * This ensures the dependencies are resolved correctly in Effect's layer system.
 */
export const RepositoryLayer = Layer.mergeAll(
	TagRepositoryLive.pipe(Layer.provide(DatabaseLayer)),
	AnnotationRepositoryLive.pipe(Layer.provide(DatabaseLayer)),
	TagStyleRepositoryLive.pipe(Layer.provide(DatabaseLayer)),
);

console.log("[Layers] RepositoryLayer created with all repositories and database");

/**
 * Service layer - all services with their dependencies
 * - TagService & AnnotationService need repositories
 * - GitSyncService needs SQLiteService directly
 */
export const ServiceLayer = Layer.mergeAll(
	TagServiceLive,
	AnnotationServiceLive,
	GitSyncServiceLive,
).pipe(Layer.provide(Layer.mergeAll(RepositoryLayer, DatabaseLayer)));

/**
 * Main application layer with all services and repositories
 * 
 * Dependency graph:
 * - SQLiteService (base layer - no dependencies)
 * - TagRepository & AnnotationRepository & TagStyleRepository (depend on SQLiteService)
 * - TagService & AnnotationService (depend on repositories)
 * - GitSyncService (depends on SQLiteService directly)
 * 
 * Layer composition strategy:
 * 1. Provide DatabaseLayer to each repository individually → RepositoryLayer (fully provided)
 * 2. Provide both RepositoryLayer AND DatabaseLayer to ServiceLayer
 *    - TagService/AnnotationService get repositories
 *    - GitSyncService gets SQLiteService directly
 * 3. Merge services and repositories for final runtime access
 * 
 * Note: We merge both ServiceLayer and RepositoryLayer so the runtime has access
 * to both services AND repositories (Store needs direct repository access).
 */
export const AppLayer = Layer.mergeAll(ServiceLayer, RepositoryLayer);
