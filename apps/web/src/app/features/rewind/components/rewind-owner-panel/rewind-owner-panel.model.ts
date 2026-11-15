import { type RewindRegenerationBlock } from "../../../../core/models/rewind.model";
import { type RewindAiRecapError } from "../../rewind-errors";

export interface RewindOwnerPanelCopy {
	eyebrow: string;
	onlyYou: string;
	onlyYouHint: string;
	season: string;
	seasonOpen: string;
	seasonUntil: (date: string) => string;
	aiGenerations: string;
	aiPerk: string;
	aiLeft: (count: number) => string;
	aiGraceExtra: (date: string) => string;
	aiOutsideSeason: string;
	thisVersion: string;
	writtenIn: string;
	publicRunsOnly: string;
	regenerate: string;
	regenerating: string;
	regenerationsLeft: (count: number) => string;
	graceUntil: (date: string) => string;
	closed: string;
	notOpenYet: string;
	closedHint: string;
	scheduledHint: string;
	finalVersion: (date: string) => string;
	regenerationBlocks: Record<RewindRegenerationBlock, string>;
	includesPrivateRuns: string;
	usesNotes: string;
	aiRecapFailed: string;
	retry: string;
	addAiRecap: string;
	addAiRecapHint: string;
	aiRecapPending: string;
	aiRecapErrors: Record<RewindAiRecapError, string>;
}

export type RewindOwnerPanelState =
	"closed" | "scheduled" | "open-with-ai" | "open-without-ai";

export type RewindOwnerSeasonTone = "open" | "closed";

export interface RewindOwnerSeasonTile {
	value: string;
	detail: string | null;
	tone: RewindOwnerSeasonTone;
}

export interface RewindOwnerAiTile {
	value: string;
	detail: string;
	spokenSummary: readonly string[];
}
