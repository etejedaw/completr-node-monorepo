import { type PopularTag } from "../../../../core/services/mood-tags.model";

export interface GameTagChip {
	tag: string;
	players: number;
	mine: boolean;
}

export interface GameTagSuggestion {
	tag: string;
	games: number | null;
	isNew: boolean;
}

export type GameTagsStatus = "loading" | "ready" | "error";

export interface GameTagSearchResult {
	query: string;
	tags: PopularTag[];
}
