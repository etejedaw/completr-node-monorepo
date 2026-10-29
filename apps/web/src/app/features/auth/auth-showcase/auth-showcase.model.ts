import { type ShowcaseGame } from "../showcase-games.model";

export interface ShowcasePoster {
	src: string | null;
	title: string;
}

export interface FeaturedGame {
	code: string | null;
	src: string | null;
	title: string;
	details: string | null;
	score: number;
	hours: number;
	ratio: number;
}

export type RatedShowcaseGame = ShowcaseGame & {
	score: number;
	hours: number;
	ratio: number;
};
