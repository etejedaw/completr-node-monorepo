import { type MetacriticSourceDetail } from "./games-external-data.interface";

export type ExternalDataStatus =
	"updated" | "not_found" | "ambiguous" | "no_data" | "failed";

export type ExternalDataErrorOutcome =
	| { status: "not_found"; errorCode: null }
	| { status: "failed"; errorCode: string | null };

export type MetacriticLookup =
	| { status: "matched"; detail: MetacriticSourceDetail; isNewMatch: boolean }
	| { status: "not_found" | "ambiguous" };
