// Custom error types for the application using Effect-TS Data.TaggedError

import { Data } from "effect";

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
	cause?: unknown;
	message?: string;
}> {}

export class HttpError extends Data.TaggedError("HttpError")<{
	cause?: unknown;
	message?: string;
}> {}

export class TagError extends Data.TaggedError("TagError")<{
	reason: "EmptyName" | "DuplicateName" | "NotFound" | "InvalidData";
	message?: string;
}> {}

export class AnnotationError extends Data.TaggedError("AnnotationError")<{
	reason: "TagNotFound" | "NoTokens" | "NotFound" | "InvalidTokens";
	message?: string;
}> {}

export class GitSyncError extends Data.TaggedError("GitSyncError")<{
	reason: "ManifestNotFound" | "FileLoadFailed" | "ImportFailed" | "ExportFailed";
	message?: string;
}> {}
