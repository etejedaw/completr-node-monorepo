import { type RewindLanguage } from "../../../../core/models/rewind.model";
import { DEFAULT_REWIND_LANGUAGE } from "../../rewind-copy";
import { type RewindDesign2025Copy } from "./rewind-design-2025.model";

export const REWIND_DESIGN_2025_COPY: Record<
	RewindLanguage,
	RewindDesign2025Copy
> = {
	en: {
		coverOfTheYear: "Cover of the year",
		coverSummary: (rating, finishedOn) =>
			`Your highest rating of the year, ${rating} out of 5. Finished on ${finishedOn}.`,
		quarter: quarter => `Q${quarter}`,
		gamesNoun: count => (count === 1 ? "game" : "games"),
		shelvesLabel: range => `Games finished from ${range}`
	},
	es: {
		coverOfTheYear: "La portada del año",
		coverSummary: (rating, finishedOn) =>
			`Tu nota más alta del año, ${rating} de 5. Terminado el ${finishedOn}.`,
		quarter: quarter => `T${quarter}`,
		gamesNoun: count => (count === 1 ? "juego" : "juegos"),
		shelvesLabel: range => `Juegos terminados de ${range}`
	}
};

export function rewindDesign2025Copy(
	language: RewindLanguage | null | undefined
): RewindDesign2025Copy {
	return language && Object.hasOwn(REWIND_DESIGN_2025_COPY, language)
		? REWIND_DESIGN_2025_COPY[language]
		: REWIND_DESIGN_2025_COPY[DEFAULT_REWIND_LANGUAGE];
}
