import { type RawgGameDetail } from "../../../rawg/rawg.interface";
import { type SourceValueExtractor } from "./source-value-extractor";

const positiveOrNull = (value: number | null) =>
	value !== null && value > 0 ? value : null;

export const RAWG_SCORE_EXTRACTORS: readonly SourceValueExtractor<RawgGameDetail>[] =
	[
		{
			source: "metacritic",
			extract: game => positiveOrNull(game.metacritic)
		},
		{ source: "rawg", extract: game => positiveOrNull(game.rating) }
	];
