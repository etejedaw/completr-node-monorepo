import { type Game } from "../games/game.model";

export interface GameCommunityTagRow {
	tag: string;
	players: number;
	mine: boolean;
}

export interface CommunityTagStatsRow {
	tag: string;
	games: number;
	players: number;
}

export interface PublicTaggedGameRow {
	gameId: string;
	players: number;
}

export interface UserTagRow {
	tag: string;
	usageCount: number;
	description: string | null;
	favoriteOrder: number | null;
	icon: string | null;
	color: string | null;
}

export interface TagDetails {
	description?: string | null;
	icon?: string | null;
	color?: string | null;
}

export interface TotalRow {
	total: number;
}

export interface TaggedGame {
	game: Game;
	players: number;
}

export interface TaggedGamesPage {
	tag: string;
	total: number;
	games: TaggedGame[];
}
