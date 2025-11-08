// Tag data structures for the annotation system

export interface Tag {
	id: string; // UUID
	name: string; // User-defined name
	description?: string; // Optional description
	category?: string; // Group related tags
	metadata: {
		color?: string; // Default color (#hex)
		icon?: string; // Optional icon identifier
		priority?: number; // For overlap resolution (higher = top)
	};
	createdAt: Date;
	userId: string; // For future multi-user support
}

export interface TagAnnotation {
	id: string; // UUID
	tagId: string; // Reference to Tag
	tokenIds: string[]; // Array supports word groups (e.g., ["gen.1.1.1", "gen.1.1.2"])
	userId: string;
	note?: string; // Optional user notes
	createdAt: Date;
	lastModified: Date;
	version: number; // For conflict resolution
}

export interface TagStyle {
	tagId: string;
	userId?: string; // User-specific overrides
	style: {
		backgroundColor?: string;
		textColor?: string;
		underlineStyle?: "solid" | "dashed" | "dotted" | "wavy" | "double";
		underlineColor?: string;
		fontWeight?: "normal" | "bold" | "semibold";
		icon?: string;
		iconPosition?: "before" | "after" | "above" | "below";
		opacity?: number; // For layered overlays
	};
}
