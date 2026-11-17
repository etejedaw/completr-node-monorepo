import { type RewindLanguage } from "../../../../core/models/rewind.model";
import { DEFAULT_REWIND_LANGUAGE, formatRewindNumber } from "../../rewind-copy";
import { type RewindDesign2025Copy } from "./rewind-design-2025.model";

export const REWIND_DESIGN_2025_COPY: Record<
	RewindLanguage,
	RewindDesign2025Copy
> = {
	en: {
		locale: "en-US",
		tally: {
			finished: "Finished",
			abandoned: "Left behind",
			hoursPlayed: "Hours played",
			averageRating: "Average rating",
			outOf: (value, scale) => `${value} out of ${scale}`
		},
		premiumStats: {
			heading: "Premium stats",
			premiumLabels: { premium: "Premium", gift: "Gift" },
			hoursByMonth: "Your year's rhythm",
			hoursByMonthHint: "Hours played each month",
			hours: "Hours",
			month: "Month",
			tasteVsCritics: "You vs. the critics",
			tasteVsCriticsHint:
				"Right of the line: you liked it more than the critics",
			game: "Game",
			yourRating: "You",
			critics: "Critics",
			gap: "Gap",
			likedMore: "You liked it more",
			likedLess: "You liked it less",
			agreed: "Same as the critics",
			genreShare: "Genre share",
			genreShareHint: "How your games split across genres",
			moreGenres: count => `${count} more genres`,
			genre: "Genre",
			games: "Games",
			share: "Share"
		},
		yearMix: {
			heading: "More of your year",
			gameLength: "How long were your games?",
			gameLengthHint: "Finished games by hours played",
			lengthRanges: {
				"under-5": "Under 5 h",
				"5-15": "5 to 15 h",
				"15-30": "15 to 30 h",
				"over-30": "Over 30 h"
			},
			length: "Length",
			withoutHours: count => `${count} without hours`,
			releaseDecades: "Release decades",
			releaseDecadesHint: "Finished games by the year they came out",
			decade: "Decade",
			decadeLabel: decade => `${decade}s`,
			topDecade: label => `Most came from the ${label}`,
			withoutRelease: count => `${count} without a release date`,
			games: "Games",
			share: "Share"
		},
		coverOfTheYear: "Cover of the year",
		coverSummary: (rating, finishedOn) =>
			`Your highest rating of the year, ${rating} out of 5. Finished on ${finishedOn}.`,
		quarter: quarter => `Q${quarter}`,
		gamesNoun: count => (count === 1 ? "game" : "games"),
		shelvesLabel: range => `Games finished from ${range}`,
		fastestAndBestValue: "Fastest and best value",
		ratioUnit: "ratio",
		favoriteGenre: "Favorite genre",
		platform: "Platform",
		monthsNoun: count => (count === 1 ? "month" : "months"),
		runsNoun: count => (count === 1 ? "run" : "runs"),
		thenGenres: genres => `then ${genres}`,
		platformRuns: (count, platform) => `${count} on ${platform}`,
		leftBehind: "What you left behind",
		leftBehindSummary: count =>
			count === 1
				? "1 game you left halfway this year"
				: `${count} games you left halfway this year`,
		abandonedGameLabel: (title, date) => `${title}, ${date}, abandoned`
	},
	es: {
		locale: "es",
		tally: {
			finished: "Terminados",
			abandoned: "Abandonados",
			hoursPlayed: "Horas jugadas",
			averageRating: "Nota promedio",
			outOf: (value, scale) => `${value} de ${scale}`
		},
		premiumStats: {
			heading: "Estadísticas Premium",
			premiumLabels: { premium: "Premium", gift: "Regalo" },
			hoursByMonth: "El ritmo de tu año",
			hoursByMonthHint: "Horas jugadas cada mes",
			hours: "Horas",
			month: "Mes",
			tasteVsCritics: "Tú vs. la crítica",
			tasteVsCriticsHint:
				"A la derecha de la línea: te gustó más que a la crítica",
			game: "Juego",
			yourRating: "Tú",
			critics: "Crítica",
			gap: "Diferencia",
			likedMore: "Te gustó más",
			likedLess: "Te gustó menos",
			agreed: "Igual que la crítica",
			genreShare: "Reparto por género",
			genreShareHint: "Cómo se repartieron tus juegos entre géneros",
			moreGenres: count => `${count} géneros más`,
			genre: "Género",
			games: "Juegos",
			share: "Porcentaje"
		},
		yearMix: {
			heading: "Más de tu año",
			gameLength: "¿Cuánto duraron tus juegos?",
			gameLengthHint: "Juegos terminados según sus horas",
			lengthRanges: {
				"under-5": "Menos de 5 h",
				"5-15": "De 5 a 15 h",
				"15-30": "De 15 a 30 h",
				"over-30": "Más de 30 h"
			},
			length: "Duración",
			withoutHours: count => `${count} sin horas`,
			releaseDecades: "Décadas de lanzamiento",
			releaseDecadesHint:
				"Juegos terminados según el año en que salieron",
			decade: "Década",
			decadeLabel: decade =>
				decade < 2000 ? `Años ${decade % 100}` : `Años ${decade}`,
			topDecade: label =>
				`La mayoría salió en los ${label.toLocaleLowerCase("es")}`,
			withoutRelease: count => `${count} sin fecha de lanzamiento`,
			games: "Juegos",
			share: "Porcentaje"
		},
		coverOfTheYear: "La portada del año",
		coverSummary: (rating, finishedOn) =>
			`Tu nota más alta del año, ${rating} de 5. Terminado el ${finishedOn}.`,
		quarter: quarter => `T${quarter}`,
		gamesNoun: count => (count === 1 ? "juego" : "juegos"),
		shelvesLabel: range => `Juegos terminados de ${range}`,
		fastestAndBestValue: "El más corto y mejor ratio",
		ratioUnit: "ratio",
		favoriteGenre: "Género favorito",
		platform: "Plataforma",
		monthsNoun: count => (count === 1 ? "mes" : "meses"),
		runsNoun: count => (count === 1 ? "partida" : "partidas"),
		thenGenres: genres => `luego ${genres}`,
		platformRuns: (count, platform) => `${count} en ${platform}`,
		leftBehind: "Los que soltaste",
		leftBehindSummary: count =>
			count === 1
				? "1 juego que dejaste a medias este año"
				: `${formatRewindNumber(count, "es")} juegos que dejaste a medias este año`,
		abandonedGameLabel: (title, date) => `${title}, ${date}, abandonado`
	}
};

export function rewindDesign2025Copy(
	language: RewindLanguage | null | undefined
): RewindDesign2025Copy {
	return language && Object.hasOwn(REWIND_DESIGN_2025_COPY, language)
		? REWIND_DESIGN_2025_COPY[language]
		: REWIND_DESIGN_2025_COPY[DEFAULT_REWIND_LANGUAGE];
}
