import {
	type OnlineSearchFound,
	type OnlineSearchUnavailable
} from "./games.interface";

export type SetCompilationItemInput =
	{ mode: "link"; gameId: string } | { mode: "create"; title: string };

export type OnlineSearchSource = "rawg" | "igdb";

export type OnlineSearchOutcome = OnlineSearchFound | OnlineSearchUnavailable;
