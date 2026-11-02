import { type RewindLanguage } from "../../rewind/rewind.constants";
import { type ShareCopy } from "../rewind-share.interface";

const ENGLISH_COPY: ShareCopy = {
	language: "en",
	numberLocale: "en-US",
	personas: {
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
	ownerLabel: username => `@${username}'s Rewind`,
	pageTitle: (username, year) => `@${username}'s ${year} Rewind`,
	continueLink: "Continue to Completr",
	tiles: {
		gamesFinished: { one: "game finished", other: "games finished" },
		gamesStarted: { one: "game started", other: "games started" },
		hoursPlayed: "hours played",
		finishRate: "finish rate",
		platinums: { one: "platinum", other: "platinums" },
		leftBehind: "left behind",
		averageRating: "average rating",
		genres: { one: "genre", other: "genres" }
	},
	summary: {
		emptyYear: "A year in games.",
		games: { one: "game", other: "games" },
		finished: { one: "finished", other: "finished" },
		leftBehind: { one: "left behind", other: "left behind" },
		started: { one: "started", other: "started" },
		lastSeparator: " and "
	}
};

const SPANISH_COPY: ShareCopy = {
	language: "es",
	numberLocale: "es-ES",
	personas: {
		"trophy-hunter": {
			title: "Cazatrofeos",
			phrase: "No solo terminaste juegos: los exprimiste."
		},
		marathoner: {
			title: "Maratonista",
			phrase: "Juegos largos, noches largas, sin atajos."
		},
		"short-and-sweet": {
			title: "Breve y bueno",
			phrase: "Muchos juegos buenos, ninguno se hizo largo."
		},
		finisher: {
			title: "Completista",
			phrase: "Si empiezas un juego, ves los créditos."
		},
		"genre-explorer": {
			title: "Trotagéneros",
			phrase: "Ningún género se salvó de ti este año."
		},
		"picky-player": {
			title: "Exigente",
			phrase: "La vida es muy corta para juegos que no enganchan."
		},
		"steady-player": {
			title: "Constante",
			phrase: "Un juego a la vez, todo el año."
		}
	},
	ownerLabel: username => `Rewind de @${username}`,
	pageTitle: (username, year) => `Rewind ${year} de @${username}`,
	continueLink: "Continuar a Completr",
	tiles: {
		gamesFinished: { one: "juego terminado", other: "juegos terminados" },
		gamesStarted: { one: "juego empezado", other: "juegos empezados" },
		hoursPlayed: "horas jugadas",
		finishRate: "tasa de finalización",
		platinums: { one: "platino", other: "platinos" },
		leftBehind: "abandonados",
		averageRating: "nota media",
		genres: { one: "género", other: "géneros" }
	},
	summary: {
		emptyYear: "Un año de juegos.",
		games: { one: "juego", other: "juegos" },
		finished: { one: "terminado", other: "terminados" },
		leftBehind: { one: "abandonado", other: "abandonados" },
		started: { one: "empezado", other: "empezados" },
		lastSeparator: " y "
	}
};

const SHARE_COPIES: Record<RewindLanguage, ShareCopy> = {
	en: ENGLISH_COPY,
	es: SPANISH_COPY
};

export function shareCopy(language: RewindLanguage): ShareCopy {
	return SHARE_COPIES[language];
}
