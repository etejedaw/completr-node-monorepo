import { type OnlineSearchSource } from "../../core/models";

export const ONLINE_SOURCE_LABELS: Record<OnlineSearchSource, string> = {
	rawg: "RAWG",
	igdb: "IGDB"
};

export const ONLINE_SEARCH_UNAVAILABLE_TITLE = "Online search is unavailable";

export const ONLINE_SEARCH_UNAVAILABLE_HINT =
	"This game isn't in Completr yet and the online search (RAWG and IGDB) isn't responding right now. Try again in a few minutes.";

export const IGDB_FALLBACK_NOTE = "RAWG is down, showing results from IGDB";

export function onlineSourceLabel(source: OnlineSearchSource | undefined) {
	return ONLINE_SOURCE_LABELS[source ?? "rawg"];
}
