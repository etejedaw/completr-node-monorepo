import {
	FINISHER_MIN_FINISH_RATE,
	FINISHER_MIN_FINISHED,
	GENRE_EXPLORER_MIN_GENRES,
	MARATHONER_MIN_AVERAGE_HOURS,
	MARATHONER_MIN_FINISHED,
	PICKY_PLAYER_MIN_ABANDONED,
	type RewindPersonaCode,
	SHORT_AND_SWEET_MAX_AVERAGE_HOURS,
	SHORT_AND_SWEET_MIN_FINISHED,
	TROPHY_HUNTER_MIN_PLATINUMS
} from "../rewind.constants";
import {
	type PersonaRule,
	type RewindPersonaStats
} from "../rewind-build.interface";

const PERSONA_RULES: PersonaRule[] = [
	{
		code: "trophy-hunter",
		matches: ({ totals }) =>
			totals.platinums !== null &&
			totals.platinums >= TROPHY_HUNTER_MIN_PLATINUMS
	},
	{
		code: "marathoner",
		matches: ({ totals, averageFinishedHours }) =>
			totals.finished >= MARATHONER_MIN_FINISHED &&
			averageFinishedHours !== null &&
			averageFinishedHours >= MARATHONER_MIN_AVERAGE_HOURS
	},
	{
		code: "short-and-sweet",
		matches: ({ totals, averageFinishedHours }) =>
			totals.finished >= SHORT_AND_SWEET_MIN_FINISHED &&
			averageFinishedHours !== null &&
			averageFinishedHours <= SHORT_AND_SWEET_MAX_AVERAGE_HOURS
	},
	{
		code: "finisher",
		matches: ({ totals }) =>
			totals.finished >= FINISHER_MIN_FINISHED &&
			totals.finishRate !== null &&
			totals.finishRate >= FINISHER_MIN_FINISH_RATE
	},
	{
		code: "genre-explorer",
		matches: ({ totals }) =>
			totals.genresPlayed >= GENRE_EXPLORER_MIN_GENRES
	},
	{
		code: "picky-player",
		matches: ({ totals }) =>
			totals.abandoned > totals.finished &&
			totals.abandoned >= PICKY_PLAYER_MIN_ABANDONED
	}
];

export function chooseRewindPersona(
	stats: RewindPersonaStats
): RewindPersonaCode {
	const rule = PERSONA_RULES.find(candidate => candidate.matches(stats));
	return rule?.code ?? "steady-player";
}
