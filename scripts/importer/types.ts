// Scripture Data Structures for Import Process

export type BookCategory =
	| "bom-book"
	| "law"
	| "history"
	| "wisdom"
	| "prophets-major"
	| "prophets-minor"
	| "gospels"
	| "acts"
	| "epistles-paul"
	| "epistles-general"
	| "apocalyptic";
export type LayoutType =
	| "prose"
	| "poetry"
	| "list"
	| "quotation"
	| "letter-opening"
	| "letter-closing";
export type VerseNumberDisplay = "inline" | "superscript" | "margin" | "hidden";
export type EmphasisType = "italic" | "bold" | "small-caps" | "red-letter";
export type SemanticType =
	| "divine-name"
	| "proper-noun"
	| "quotation"
	| "added"
	| "uncertain"
	| "poetic-line";

export interface TokenPresentationMetadata {
	emphasis?: EmphasisType;
	semanticType?: SemanticType;
	case?: "upper" | "title" | "small-caps";
	precedingPunctuation?: string;
	followingPunctuation?: string;
}

export interface TextToken {
	id: string;
	text: string;
	position: number;
	verseId: string;
	presentation?: TokenPresentationMetadata;
}

export interface VersePresentationMetadata {
	paragraphStart?: boolean;
	paragraphEnd?: boolean;
	sectionStart?: boolean;
	layoutType: LayoutType;
	indentLevel: number;
	verseNumberDisplay: VerseNumberDisplay;
	speaker?: string;
	styleHints?: string[];
}

export interface Verse {
	id: string;
	book: string;
	chapter: number;
	verse: number;
	tokens: TextToken[];
	translation: string;
	presentation: VersePresentationMetadata;
}

export interface Section {
	id: string;
	startVerse: number;
	endVerse: number;
	heading: string;
	subheading?: string;
}

export interface ChapterHeading {
	summary: string;
	description?: string;
	topics?: string[];
}

export interface ChapterPresentationMetadata {
	displayHeading: boolean;
	twoColumn: boolean;
	chapterNumberDisplay: "standard" | "decorative" | "hidden";
}

export interface Chapter {
	id: string;
	book: string;
	chapter: number;
	translation: string;
	heading?: ChapterHeading;
	sections: Section[];
	verses: Verse[];
	presentation: ChapterPresentationMetadata;
}

export interface BookMetadata {
	author?: string;
	dateWritten?: string;
	audience?: string;
	purpose?: string;
	themes: string[];
	chapterCount: number;
	verseCount: number;
}

export interface Book {
	id: string;
	name: string;
	fullName: string;
	abbreviation: string;
	category: BookCategory;
	chapters: Chapter[];
	metadata: BookMetadata;
}

export interface BookInfo {
	id: string;
	name: string;
	category: BookCategory;
	chapters: number;
}

export interface TranslationManifest {
	id: string;
	name: string;
	abbreviation: string;
	language: string;
	copyright: string;
	books: BookInfo[];
}

export interface ScriptureManifest {
	version: string;
	translations: TranslationManifest[];
}

// Raw data types from Church API
export interface RawVerseData {
	number: string;
	text: string;
	isParagraphStart?: boolean;
	isParagraphEnd?: boolean;
	speaker?: string;
	emphasis?: boolean;
	class?: string;
}

export interface RawSectionData {
	title?: string;
	type?: string;
	startVerse?: number;
	endVerse?: number;
	verses?: RawVerseData[];
}

export interface RawChapterHeading {
	summary?: string;
	description?: string;
	topics?: string[];
}

export interface RawScriptureContent {
	body: string; // HTML string containing the scripture text
	heading?: RawChapterHeading;
	sections?: RawSectionData[];
}

export interface RawScriptureData {
	content: RawScriptureContent;
}
