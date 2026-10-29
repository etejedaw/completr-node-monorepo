import { type GameSummary } from "./types.model";

export interface PublicBacklog {
	id: string;
	status: string;
	score?: number;
	duration?: number;
	ratio?: number | null;
	game: GameSummary;
	platform: { id: string; abbreviation: string };
}

export interface PublicFavorite {
	id: string;
	position: number;
	game: GameSummary;
}

export interface PublicQueue {
	id: string;
	position: number;
	backlog: {
		id: string;
		status: string;
		game: GameSummary;
		platform?: { id: string; abbreviation: string };
	};
}

export interface PublicGameShelf {
	id: string;
	game: GameSummary & { description?: string };
	platform: { id: string; abbreviation: string };
}

export type ComparisonDimension =
	| "completed"
	| "playing"
	| "not_started"
	| "shelf"
	| "favorites"
	| "wishlist";

export interface ComparisonGame {
	id: string;
	code: string;
	title: string;
	backgroundUrl: string | null;
}

export interface UserComparison {
	by: ComparisonDimension;
	inCommon: ComparisonGame[];
	onlyViewer: ComparisonGame[];
	onlyTarget: ComparisonGame[];
	counts: {
		inCommon: number;
		onlyViewer: number;
		onlyTarget: number;
	};
}
