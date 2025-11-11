import { Collapsible } from "@kobalte/core/collapsible";
import { createEffect, createSignal, For } from "solid-js";
import type { Book, Translation, TranslationId } from "../types/scripture";

interface ScriptureNavigatorProps {
	translations: Translation[];
	selectedTranslation?: TranslationId;
	selectedBook?: string;
	selectedChapter?: number;
	onSelectChapter: (translationId: TranslationId, bookId: string, chapter: number) => void;
}

export default function ScriptureNavigator(props: ScriptureNavigatorProps) {
	const [expandedTranslations, setExpandedTranslations] = createSignal<Set<string>>(new Set());
	const [expandedBooks, setExpandedBooks] = createSignal<Set<string>>(new Set());

	// Auto-expand selected items
	createEffect(() => {
		if (props.selectedTranslation) {
			setExpandedTranslations((prev) => new Set(prev).add(props.selectedTranslation!));
		}
		if (props.selectedBook) {
			const bookKey = `${props.selectedTranslation}:${props.selectedBook}`;
			setExpandedBooks((prev) => new Set(prev).add(bookKey));
		}
	});

	const handleChapterClick = (
		translationId: TranslationId,
		bookId: string,
		chapter: number,
	) => {
		props.onSelectChapter(translationId, bookId, chapter);
	};

	return (
		<div class="h-full overflow-y-auto bg-[#252526] text-[#cccccc] text-sm select-none">
			<div class="py-2">
				<For each={props.translations}>
					{(translation) => {
						const isTranslationOpen = () => expandedTranslations().has(translation.id);
						return (
							<Collapsible
								open={isTranslationOpen()}
								onOpenChange={(isOpen) => {
									setExpandedTranslations((prev) => {
										const next = new Set(prev);
										if (isOpen) {
											next.add(translation.id);
										} else {
											next.delete(translation.id);
										}
										return next;
									});
								}}
							>
								{/* Translation header */}
								<Collapsible.Trigger class="w-full flex items-center px-2 py-1 hover:bg-[#2a2d2e] cursor-pointer">
									<span class="w-4 h-4 flex items-center justify-center mr-1">
										<svg
											class="w-3 h-3 transition-transform"
											classList={{ "rotate-90": isTranslationOpen() }}
											fill="currentColor"
											viewBox="0 0 16 16"
										>
											<path d="M6 4l4 4-4 4z" />
										</svg>
									</span>
									<span class="font-medium">{translation.name}</span>
									<span class="ml-2 text-[#858585] text-xs">({translation.abbreviation})</span>
								</Collapsible.Trigger>

								{/* Books list */}
								<Collapsible.Content class="pl-4">
									<For each={translation.books}>
										{(book) => {
											const bookKey = `${translation.id}:${book.id}`;
											const isBookOpen = () => expandedBooks().has(bookKey);
											return (
												<Collapsible
													open={isBookOpen()}
													onOpenChange={(isOpen) => {
														setExpandedBooks((prev) => {
															const next = new Set(prev);
															if (isOpen) {
																next.add(bookKey);
															} else {
																next.delete(bookKey);
															}
															return next;
														});
													}}
												>
													{/* Book header */}
													<Collapsible.Trigger class="w-full flex items-center px-2 py-1 hover:bg-[#2a2d2e] cursor-pointer">
														<span class="w-4 h-4 flex items-center justify-center mr-1">
															<svg
																class="w-3 h-3 transition-transform"
																classList={{ "rotate-90": isBookOpen() }}
																fill="currentColor"
																viewBox="0 0 16 16"
															>
																<path d="M6 4l4 4-4 4z" />
															</svg>
														</span>
														<span>{book.name}</span>
													</Collapsible.Trigger>

													{/* Chapters list */}
													<Collapsible.Content class="pl-4">
														<For each={Array.from({ length: book.chapters }, (_, i) => i + 1)}>
															{(chapterNum) => {
																const isSelected = () =>
																	props.selectedTranslation === translation.id &&
																	props.selectedBook === book.id &&
																	props.selectedChapter === chapterNum;
																return (
																	<div
																		class="flex items-center px-2 py-1 hover:bg-[#2a2d2e] cursor-pointer"
																		classList={{
																			"bg-[#37373d]": isSelected(),
																			"border-l-2 border-[#007acc]": isSelected(),
																		}}
																		onClick={() =>
																			handleChapterClick(translation.id, book.id, chapterNum)
																		}
																		role="button"
																		tabIndex={0}
																		onKeyPress={(e) => {
																			if (e.key === "Enter" || e.key === " ") {
																				handleChapterClick(translation.id, book.id, chapterNum);
																			}
																		}}
																	>
																		<span class="w-4 h-4 mr-1"></span>
																		<span>Chapter {chapterNum}</span>
																	</div>
																);
															}}
														</For>
													</Collapsible.Content>
												</Collapsible>
											);
										}}
									</For>
								</Collapsible.Content>
							</Collapsible>
						);
					}}
				</For>
			</div>
		</div>
	);
}
