import {
	type OnlineSearchFound,
	type OnlineSearchUnavailable
} from "./games.interface";

export type SetCompilationItemInput =
	{ mode: "link"; gameId: string } | { mode: "create"; title: string };

export type OnlineSearchSource = "rawg" | "igdb";

export type OnlineSearchOutcome = OnlineSearchFound | OnlineSearchUnavailable;

export type AggregateTable = "GameScores" | "GameTimes";

export type AggregateColumn = "score" | "duration";

export type MissingRelationTable = "GameScores" | "GameTimes" | "GamePlatforms";

export type SourceExclusionTable = "GameScores" | "GameTimes";
