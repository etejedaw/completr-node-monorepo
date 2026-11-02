import {
	type HltbSourceDetail,
	type MetacriticSourceDetail
} from "./games-external-data.interface";

export type ExternalDataRequestPriority = "interactive" | "background";

export type ExternalDataStatus =
	"updated" | "not_found" | "ambiguous" | "no_data" | "failed";

export type ExternalDataErrorOutcome =
	| { status: "not_found"; errorCode: null }
	| {
			status: "failed";
			errorCode: string | null;
			httpStatus?: number;
			retryAfterSeconds?: number;
	  };

export type MetacriticLookup =
	| { status: "matched"; detail: MetacriticSourceDetail; isNewMatch: boolean }
	| { status: "not_found" | "ambiguous" };

export type HltbLookup =
	| { status: "matched"; detail: HltbSourceDetail; isNewMatch: boolean }
	| { status: "not_found" | "ambiguous" };

export type HltbIdResolution =
	| { status: "resolved"; hltbId: string; matchedBy: "rawg_slug" | "label" }
	| { status: "not_found" | "ambiguous" };
