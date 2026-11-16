import {
	type RewindLanguage,
	type RewindRegenerationBlock
} from "../../../../core/models/rewind.model";

export interface RewindOwnerPanelCopy {
	eyebrow: string;
	onlyYou: string;
	onlyYouHint: string;
	seasonOpen: string;
	seasonUntil: (date: string) => string;
	aiGenerationsLabel: (count: number) => string;
	aiGraceExtra: (date: string) => string;
	aiPerk: string;
	writtenIn: Record<RewindLanguage, string>;
	publicRunsOnly: string;
	regenerate: string;
	regenerating: string;
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
}

export type RewindOwnerPanelState =
	"closed" | "scheduled" | "open-with-ai" | "open-without-ai";

export type RewindOwnerSeasonTone = "open" | "closed";

export interface RewindOwnerSeasonChip {
	value: string;
	detail: string | null;
	tone: RewindOwnerSeasonTone;
}

export interface RewindOwnerAiChip {
	count: number;
	label: string;
	grace: string | null;
}
