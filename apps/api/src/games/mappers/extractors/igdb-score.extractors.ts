import { type IgdbGame } from "../../../igdb/igdb.interface";
import { type SourceValueExtractor } from "../../games.interface";

const IGDB_MAX_RATING = 100;

export function extractIgdbUserRating({ rating }: IgdbGame): number | null {
	if (typeof rating !== "number" || !Number.isFinite(rating)) return null;
	if (rating > IGDB_MAX_RATING) return null;
	const rounded = Math.round(rating);
	return rounded > 0 ? rounded : null;
}

export const IGDB_SCORE_EXTRACTORS: readonly SourceValueExtractor<IgdbGame>[] =
	[{ source: "igdb", extract: extractIgdbUserRating }];
