import { type Game } from "../../core/models";

export interface Franchise {
	id: string;
	name: string;
	code: string;
	description?: string | null;
}

export interface FranchisePreviewGame {
	id: string;
	code: string;
	title: string;
	backgroundUrl: string | null;
}

export interface FranchiseSummary extends Franchise {
	gameCount: number;
	isTracked: boolean;
	previewGames: FranchisePreviewGame[];
}

export interface FranchisePage {
	franchises: FranchiseSummary[];
	total: number;
}

export interface TrackedFranchise {
	franchise: { id: string; name: string; code: string };
	gameCount: number;
}

export interface FranchiseDetail {
	franchise: Franchise;
	games: (Game & { backlogStatus: string | null })[];
	gameCount: number;
	isTracked: boolean;
	hasMore: boolean;
}

export interface FranchiseDto {
	name: string;
	description?: string | null;
	gameIds?: string[];
}
