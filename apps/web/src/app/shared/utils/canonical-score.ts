import { GameScore, GameTime } from "../../core/models/game.model";

export type CanonicalScoreType = "completr" | "aggregate" | "rawg" | null;

export interface CanonicalScore {
	type: CanonicalScoreType;
	score: number | null;
	scoreScale: number;
	duration: number | null;
	ratio: number | null;
}

interface GameWithSources {
	scores?: GameScore[];
	times?: GameTime[];
}

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

export function pickCanonicalScore(game: GameWithSources | null | undefined): CanonicalScore {
	const empty: CanonicalScore = {
		type: null,
		score: null,
		scoreScale: 5,
		duration: null,
		ratio: null
	};

	if (!game) return empty;

	const completrScore = game.scores?.find(s => s.source === "completr")?.score;
	const completrTime = game.times?.find(t => t.source === "completr")?.duration;

	if (completrScore != null && completrTime != null && completrTime > 0) {
		return {
			type: "completr",
			score: completrScore,
			scoreScale: 5,
			duration: completrTime,
			ratio: round2(completrScore / completrTime)
		};
	}

	const metacritic = game.scores?.find(s => s.source === "metacritic")?.score;
	const hltb = game.times?.find(t => t.source === "hltb")?.duration;

	if (metacritic != null && hltb != null && hltb > 0) {
		return {
			type: "aggregate",
			score: metacritic,
			scoreScale: 100,
			duration: hltb,
			ratio: round2(metacritic / hltb)
		};
	}

	const rawgScore = game.scores?.find(s => s.source === "rawg")?.score;
	const rawgTime = game.times?.find(t => t.source === "rawg")?.duration;

	if (rawgScore != null && rawgTime != null && rawgTime > 0) {
		return {
			type: "rawg",
			score: rawgScore,
			scoreScale: 5,
			duration: rawgTime,
			ratio: round2((rawgScore * 20) / rawgTime)
		};
	}

	return empty;
}
