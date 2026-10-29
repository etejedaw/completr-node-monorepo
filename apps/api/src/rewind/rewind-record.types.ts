import { type Rewind } from "./rewind.interface";

export type RewindStoredView = Pick<
	Rewind,
	"language" | "generatedAt" | "aiRecap" | "premiumStats" | "ownerControls"
>;
