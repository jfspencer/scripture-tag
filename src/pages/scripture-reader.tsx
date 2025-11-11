import { Separator } from "@kobalte/core/separator";
import { Effect } from "effect";
import { createEffect, createSignal, onMount, Show } from "solid-js";
import ChapterDisplay from "../components/ChapterDisplay";
import ScriptureNavigator from "../components/ScriptureNavigator";
import { ScriptureAppLayer, ScriptureService } from "../services/scriptureService";
import type { Chapter, ScriptureManifest, Translation } from "../types/scripture";

export default function ScriptureReader() {
	const [manifest, setManifest] = createSignal<ScriptureManifest | null>(null);
	const [selectedTranslation, setSelectedTranslation] = createSignal<string>("bofm");
	const [selectedBook, setSelectedBook] = createSignal<string>("1-ne");
	const [selectedChapter, setSelectedChapter] = createSignal<number>(1);
	const [currentChapter, setCurrentChapter] = createSignal<Chapter | null>(null);
	const [loading, setLoading] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	const [navigatorWidth, setNavigatorWidth] = createSignal(300);
	const [isResizing, setIsResizing] = createSignal(false);

	// Request counter to prevent race conditions
	let requestCounter = 0;

	// Load manifest on mount
	onMount(() => {
		const loadManifestEffect = Effect.gen(function* () {
			const service = yield* ScriptureService;
			return yield* service.loadManifest();
		});

		const program = loadManifestEffect.pipe(Effect.provide(ScriptureAppLayer));

		Effect.runPromise(program)
			.then((result) => {
				setManifest(result);
				setError(null);
			})
			.catch((err) => {
				console.error("Failed to load manifest:", err);
				setError("Failed to load scripture manifest. Please try again.");
			});
	});

	// Load chapter when selection changes
	createEffect(() => {
		const translation = selectedTranslation();
		const book = selectedBook();
		const chapter = selectedChapter();

		if (!translation || !book || !chapter) return;

		// Increment request counter to track this specific request
		requestCounter++;
		const currentRequestId = requestCounter;

		setLoading(true);
		setError(null);

		const loadChapterEffect = Effect.gen(function* () {
			const service = yield* ScriptureService;
			return yield* service.loadChapter(translation, book, chapter);
		});

		const program = loadChapterEffect.pipe(Effect.provide(ScriptureAppLayer));

		Effect.runPromise(program)
			.then((result) => {
				// Only update state if this is still the most recent request
				if (currentRequestId === requestCounter) {
					setCurrentChapter(result);
					setLoading(false);
					setError(null);
				}
			})
			.catch((err) => {
				// Only update error state if this is still the most recent request
				if (currentRequestId === requestCounter) {
					console.error("Failed to load chapter:", err);
					setError(`Failed to load ${book} chapter ${chapter}. Please try again.`);
					setLoading(false);
				}
			});
	});

	const handleSelectChapter = (translationId: string, bookId: string, chapter: number) => {
		// Clear current chapter to prevent stale data display
		setCurrentChapter(null);
		setSelectedTranslation(translationId);
		setSelectedBook(bookId);
		setSelectedChapter(chapter);
	};

	// Resizable panel handlers
	const handleMouseDown = (e: MouseEvent) => {
		setIsResizing(true);
		e.preventDefault();
	};

	const handleMouseMove = (e: MouseEvent) => {
		if (!isResizing()) return;
		const newWidth = e.clientX;
		if (newWidth >= 200 && newWidth <= 600) {
			setNavigatorWidth(newWidth);
		}
	};

	const handleMouseUp = () => {
		setIsResizing(false);
	};

	onMount(() => {
		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	});

	return (
		<div class="h-screen flex flex-col overflow-hidden">
			{/* Header */}
			<header class="bg-[#1e1e1e] text-white px-4 py-3 border-b border-gray-700">
				<h1 class="text-xl font-semibold">Scripture Reader</h1>
			</header>

			{/* Main content area */}
			<div class="flex-1 flex overflow-hidden">
				{/* Navigator Panel */}
				<div
					class="flex-shrink-0 border-r border-gray-700 overflow-hidden"
					style={{ width: `${navigatorWidth()}px` }}
				>
					<Show when={manifest()} fallback={<div class="p-4 text-gray-400">Loading...</div>}>
						<ScriptureNavigator
							translations={manifest()?.translations ?? ([] as Translation[])}
							selectedTranslation={selectedTranslation()}
							selectedBook={selectedBook()}
							selectedChapter={selectedChapter()}
							onSelectChapter={handleSelectChapter}
						/>
					</Show>
				</div>

				{/* Resizer */}
				<Separator
					orientation="vertical"
					class="w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize transition-colors"
					classList={{ "bg-blue-500": isResizing() }}
					onMouseDown={handleMouseDown}
				/>

				{/* Detail Panel */}
				<div class="flex-1 overflow-hidden">
					<Show when={error()}>
						<div class="bg-red-50 border-l-4 border-red-500 p-4 m-4">
							<div class="flex">
								<div class="flex-shrink-0">
									<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
										<title>Error</title>
										<path
											fill-rule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
											clip-rule="evenodd"
										/>
									</svg>
								</div>
								<div class="ml-3">
									<p class="text-sm text-red-700">{error()}</p>
								</div>
							</div>
						</div>
					</Show>

					<Show
						when={!loading() && currentChapter()}
						fallback={
							<div class="flex items-center justify-center h-full">
								<div class="text-center">
									<Show when={loading()}>
										<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
										<p class="text-gray-500">Loading chapter...</p>
									</Show>
									<Show when={!loading() && !currentChapter()}>
										<p class="text-gray-500 text-lg">Select a chapter to begin reading</p>
									</Show>
								</div>
							</div>
						}
					>
						<ChapterDisplay chapter={currentChapter() ?? ({} as Chapter)} />
					</Show>
				</div>
			</div>
		</div>
	);
}
