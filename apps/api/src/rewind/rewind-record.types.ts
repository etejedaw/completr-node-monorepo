import { type Rewind } from "./rewind.interface";

export type RewindStoredView = Pick<
	Rewind,
	| "language"
	| "generatedAt"
	| "frozenAt"
	| "aiRecap"
	| "premiumStats"
	| "premiumAccessKind"
	| "ownerControls"
>;
