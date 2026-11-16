import { type Rewind as RewindModel } from "./rewind.model";
import { type RewindFreezeOutcomeKind } from "./rewind-freeze.types";

export type ClosedEditionRewindRefusal =
	| "user-missing"
	| "rewind-missing"
	| "edition-missing"
	| "edition-not-closed"
	| "already-frozen"
	| "recap-in-progress";

export type ClosedEditionRewindClaim =
	| { kind: "claimed"; record: RewindModel }
	| { kind: "refused"; reason: ClosedEditionRewindRefusal };

export type ClosedEditionRewindOutcome =
	| { kind: "refused"; reason: ClosedEditionRewindRefusal }
	| { kind: "ai-failed" }
	| {
			kind: "not-frozen";
			aiRecapReady: boolean;
			freeze: RewindFreezeOutcomeKind;
	  }
	| {
			kind: "frozen";
			aiRecapReady: boolean;
			design: string;
			frozenAt: Date;
	  };
