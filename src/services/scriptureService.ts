import { Effect, Context, Layer, Data } from 'effect';
import type { ScriptureManifest, TranslationManifest, Chapter } from '../types/scripture';

// Error types
export class ScriptureLoadError extends Data.TaggedError('ScriptureLoadError')<{
  message: string;
  cause?: unknown;
}> {}

export class NetworkError extends Data.TaggedError('NetworkError')<{
  url: string;
  status?: number;
  statusText?: string;
}> {}

// Cache service
export class ScriptureCacheService extends Context.Tag('ScriptureCacheService')<
  ScriptureCacheService,
  {
    readonly manifest: () => ScriptureManifest | null;
    readonly setManifest: (manifest: ScriptureManifest) => Effect.Effect<void>;
    readonly getTranslationManifest: (id: string) => TranslationManifest | null;
    readonly setTranslationManifest: (
      id: string,
      manifest: TranslationManifest
    ) => Effect.Effect<void>;
    readonly getChapter: (
      translationId: string,
      bookId: string,
      chapter: number
    ) => Chapter | null;
    readonly setChapter: (
      translationId: string,
      bookId: string,
      chapter: number,
      data: Chapter
    ) => Effect.Effect<void>;
    readonly clear: () => Effect.Effect<void>;
  }
>() {}

// In-memory cache implementation
export const makeScriptureCacheService = () => {
  let manifestCache: ScriptureManifest | null = null;
  const translationManifests = new Map<string, TranslationManifest>();
  const chapterCache = new Map<string, Chapter>();

  const makeChapterKey = (translationId: string, bookId: string, chapter: number) =>
    `${translationId}:${bookId}:${chapter}`;

  return {
    manifest: () => manifestCache,
    setManifest: (manifest: ScriptureManifest) =>
      Effect.sync(() => {
        manifestCache = manifest;
      }),
    getTranslationManifest: (id: string) => translationManifests.get(id) ?? null,
    setTranslationManifest: (id: string, manifest: TranslationManifest) =>
      Effect.sync(() => {
        translationManifests.set(id, manifest);
      }),
    getChapter: (translationId: string, bookId: string, chapter: number) =>
      chapterCache.get(makeChapterKey(translationId, bookId, chapter)) ?? null,
    setChapter: (translationId: string, bookId: string, chapter: number, data: Chapter) =>
      Effect.sync(() => {
        chapterCache.set(makeChapterKey(translationId, bookId, chapter), data);
      }),
    clear: () =>
      Effect.sync(() => {
        manifestCache = null;
        translationManifests.clear();
        chapterCache.clear();
      }),
  };
};

export const ScriptureCacheServiceLive = Layer.succeed(
  ScriptureCacheService,
  makeScriptureCacheService()
);

// Scripture service
export class ScriptureService extends Context.Tag('ScriptureService')<
  ScriptureService,
  {
    readonly loadManifest: () => Effect.Effect<
      ScriptureManifest,
      NetworkError | ScriptureLoadError
    >;
    readonly loadTranslationManifest: (
      translationId: string
    ) => Effect.Effect<TranslationManifest, NetworkError | ScriptureLoadError>;
    readonly loadChapter: (
      translationId: string,
      bookId: string,
      chapterNum: number
    ) => Effect.Effect<Chapter, NetworkError | ScriptureLoadError>;
    readonly preloadChapter: (
      translationId: string,
      bookId: string,
      chapterNum: number
    ) => Effect.Effect<void, never>;
  }
>() {}

// Fetch helper with error handling
const fetchJson = <T>(url: string) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new NetworkError({
          url,
          status: response.status,
          statusText: response.statusText,
        });
      }
      return (await response.json()) as T;
    },
    catch: (error) => {
      if (error instanceof NetworkError) {
        return error;
      }
      return new NetworkError({ url, statusText: String(error) });
    },
  });

export const makeScriptureService = Effect.gen(function* () {
  const cache = yield* ScriptureCacheService;

  return {
    loadManifest: () =>
      Effect.gen(function* () {
        const cached = cache.manifest();
        if (cached) {
          return cached;
        }

        const manifest = yield* fetchJson<ScriptureManifest>('/scripture/manifest.json');
        yield* cache.setManifest(manifest);
        return manifest;
      }),

    loadTranslationManifest: (translationId: string) =>
      Effect.gen(function* () {
        const cached = cache.getTranslationManifest(translationId);
        if (cached) {
          return cached;
        }

        const manifest = yield* fetchJson<TranslationManifest>(
          `/scripture/translations/${translationId}/manifest.json`
        );
        yield* cache.setTranslationManifest(translationId, manifest);
        return manifest;
      }),

    loadChapter: (translationId: string, bookId: string, chapterNum: number) =>
      Effect.gen(function* () {
        const cached = cache.getChapter(translationId, bookId, chapterNum);
        if (cached) {
          return cached;
        }

        const chapter = yield* fetchJson<Chapter>(
          `/scripture/translations/${translationId}/${bookId}/chapter-${chapterNum}.json`
        );
        yield* cache.setChapter(translationId, bookId, chapterNum, chapter);
        return chapter;
      }),

    preloadChapter: (translationId: string, bookId: string, chapterNum: number) =>
      Effect.gen(function* () {
        const cached = cache.getChapter(translationId, bookId, chapterNum);
        if (cached) {
          return;
        }

        // Fire and forget - ignore errors
        yield* Effect.tryPromise({
          try: async () => {
            const response = await fetch(
              `/scripture/translations/${translationId}/${bookId}/chapter-${chapterNum}.json`
            );
            if (response.ok) {
              const chapter = (await response.json()) as Chapter;
              return cache.setChapter(translationId, bookId, chapterNum, chapter);
            }
          },
          catch: () => undefined,
        }).pipe(Effect.ignore);
      }),
  };
});

export const ScriptureServiceLive = Layer.effect(ScriptureService, makeScriptureService);

// Main application layer
export const ScriptureAppLayer = ScriptureServiceLive.pipe(
  Layer.provide(ScriptureCacheServiceLive)
);

