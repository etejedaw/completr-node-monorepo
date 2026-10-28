import { type RewindPersonaCode } from "../../core/models/rewind.model";

export interface RewindPersona {
	title: string;
	phrase: string;
	icon: string;
}

export const REWIND_PERSONAS: Record<RewindPersonaCode, RewindPersona> = {
	"trophy-hunter": {
		title: "Trophy Hunter",
		phrase: "You didn't just finish games, you emptied them.",
		icon: "emoji_events"
	},
	marathoner: {
		title: "Marathoner",
		phrase: "Long games, long nights, no shortcuts.",
		icon: "hourglass_bottom"
	},
	"short-and-sweet": {
		title: "Short & Sweet",
		phrase: "Lots of great games, none of them overstayed.",
		icon: "bolt"
	},
	finisher: {
		title: "The Finisher",
		phrase: "When you start a game, you see the credits.",
		icon: "sports_score"
	},
	"genre-explorer": {
		title: "Genre Explorer",
		phrase: "No genre was safe from you this year.",
		icon: "explore"
	},
	"picky-player": {
		title: "Picky Player",
		phrase: "Life's too short for games that don't click.",
		icon: "filter_alt"
	},
	"steady-player": {
		title: "Steady Player",
		phrase: "One game at a time, all year long.",
		icon: "event_repeat"
	}
};

const FALLBACK_PERSONA: RewindPersonaCode = "steady-player";

function isPersonaCode(code: unknown): code is RewindPersonaCode {
	return typeof code === "string" && Object.hasOwn(REWIND_PERSONAS, code);
}

export function rewindPersona(code: string | null | undefined): RewindPersona {
	return REWIND_PERSONAS[isPersonaCode(code) ? code : FALLBACK_PERSONA];
}
