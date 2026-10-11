import { type TimeSource } from "../../../game-times/game-time.model";
import { type RawgGameDetail } from "../../../rawg/rawg.interface";
import { type SourceValueExtractor } from "./source-value-extractor";

export const RAWG_TIME_EXTRACTORS: readonly SourceValueExtractor<
	RawgGameDetail,
	TimeSource
>[] = [
	{
		source: "rawg",
		extract: game => (game.playtime > 0 ? game.playtime : null)
	}
];
