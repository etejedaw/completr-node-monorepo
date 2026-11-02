import { type GameScore, type GameTime } from "../../core/models/game.model";

export type CanonicalScoreType = "completr" | "aggregate" | "rawg" | null;

export interface CanonicalScore {
	type: CanonicalScoreType;
	score: number | null;
	scoreScale: number;
	duration: number | null;
	ratio: number | null;
}

export interface GameWithSources {
	scores?: GameScore[];
	times?: GameTime[];
}
