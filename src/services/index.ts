/**
 * Services barrel export
 * Provides convenient access to all services, layers, and runtime
 */

export {
	AnnotationService,
	AnnotationServiceLive,
	makeAnnotationService,
} from "./AnnotationService";
export { GitSyncService, GitSyncServiceLive, makeGitSyncService } from "./GitSyncService";
// Layers and runtime
export { AppLayer, DatabaseLayer, RepositoryLayer, ServiceLayer } from "./layers";
export {
	AnnotationRepository,
	AnnotationRepositoryLive,
	makeAnnotationRepository,
} from "./repositories/AnnotationRepository";

// Repositories
export {
	makeTagRepository,
	TagRepository,
	TagRepositoryLive,
} from "./repositories/TagRepository";
export {
	makeTagStyleRepository,
	TagStyleRepository,
	TagStyleRepositoryLive,
} from "./repositories/TagStyleRepository";
export { AppRuntime, runEffect, runEffectExit } from "./runtime";
// Core services
export { makeSQLiteService, SQLiteService, SQLiteServiceLive } from "./SQLiteService";
export { makeTagService, TagService, TagServiceLive } from "./TagService";
