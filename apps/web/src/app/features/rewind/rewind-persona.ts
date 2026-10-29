import {
	type RewindLanguage,
	type RewindPersonaCode
} from "../../core/models/rewind.model";

export interface RewindPersona {
	title: string;
	phrase: string;
	icon: string;
}

type RewindPersonaText = Omit<RewindPersona, "icon">;

const PERSONA_ICONS: Record<RewindPersonaCode, string> = {
	"trophy-hunter": "emoji_events",
	marathoner: "hourglass_bottom",
	"short-and-sweet": "bolt",
	finisher: "sports_score",
	"genre-explorer": "explore",
	"picky-player": "filter_alt",
	"steady-player": "event_repeat"
};

const PERSONA_TEXT: Record<
	RewindLanguage,
	Record<RewindPersonaCode, RewindPersonaText>
> = {
	en: {
		"trophy-hunter": {
			title: "Trophy Hunter",
			phrase: "You didn't just finish games, you emptied them."
		},
		marathoner: {
			title: "Marathoner",
			phrase: "Long games, long nights, no shortcuts."
		},
		"short-and-sweet": {
			title: "Short & Sweet",
			phrase: "Lots of great games, none of them overstayed."
		},
		finisher: {
			title: "The Finisher",
			phrase: "When you start a game, you see the credits."
		},
		"genre-explorer": {
			title: "Genre Explorer",
			phrase: "No genre was safe from you this year."
		},
		"picky-player": {
			title: "Picky Player",
			phrase: "Life's too short for games that don't click."
		},
		"steady-player": {
			title: "Steady Player",
			phrase: "One game at a time, all year long."
		}
	},
	es: {
		"trophy-hunter": {
			title: "Cazatrofeos",
			phrase: "No solo terminaste juegos: los exprimiste al 100 %."
		},
		marathoner: {
			title: "Maratonista",
			phrase: "Juegos largos, noches largas y cero atajos."
		},
		"short-and-sweet": {
			title: "Al grano",
			phrase: "Muchos juegos buenos y ninguno se hizo eterno."
		},
		finisher: {
			title: "Cazacréditos",
			phrase: "Si empiezas un juego, llegas a los créditos."
		},
		"genre-explorer": {
			title: "Explorador de géneros",
			phrase: "Este año ningún género se salvó de ti."
		},
		"picky-player": {
			title: "Paladar exigente",
			phrase: "La vida es muy corta para juegos que no enganchan."
		},
		"steady-player": {
			title: "Constante",
			phrase: "Un juego a la vez, todo el año."
		}
	}
};

function personasIn(
	language: RewindLanguage
): Record<RewindPersonaCode, RewindPersona> {
	const texts = PERSONA_TEXT[language];
	return Object.fromEntries(
		(Object.keys(PERSONA_ICONS) as RewindPersonaCode[]).map(code => [
			code,
			{ ...texts[code], icon: PERSONA_ICONS[code] }
		])
	) as Record<RewindPersonaCode, RewindPersona>;
}

export const REWIND_PERSONAS_BY_LANGUAGE: Record<
	RewindLanguage,
	Record<RewindPersonaCode, RewindPersona>
> = {
	en: personasIn("en"),
	es: personasIn("es")
};

export const REWIND_PERSONAS = REWIND_PERSONAS_BY_LANGUAGE.en;

const FALLBACK_PERSONA: RewindPersonaCode = "steady-player";

function isPersonaCode(code: unknown): code is RewindPersonaCode {
	return typeof code === "string" && Object.hasOwn(PERSONA_ICONS, code);
}

function isLanguage(language: unknown): language is RewindLanguage {
	return (
		typeof language === "string" &&
		Object.hasOwn(REWIND_PERSONAS_BY_LANGUAGE, language)
	);
}

export function rewindPersona(
	code: string | null | undefined,
	language: RewindLanguage = "en"
): RewindPersona {
	const personas =
		REWIND_PERSONAS_BY_LANGUAGE[isLanguage(language) ? language : "en"];
	return personas[isPersonaCode(code) ? code : FALLBACK_PERSONA];
}
