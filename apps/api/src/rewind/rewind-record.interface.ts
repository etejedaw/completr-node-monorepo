import {
	type Rewind,
	type RewindAiRecap,
	type RewindLanguage,
	type RewindPremiumStats
} from "./rewind.interface";
import { type RewindAiRecapStatus } from "./rewind.model";

export interface RewindRecord {
	year: number;
	language: RewindLanguage;
	includesPrivateRuns: boolean;
	generatedAt: Date;
	regenerationsUsed: number;
	graceUsed: boolean;
	aiRecap: RewindAiRecap | null;
	aiRecapStatus: RewindAiRecapStatus;
	aiRecapRequestedAt: Date | null;
	premiumStats: RewindPremiumStats | null;
}

export interface RewindOwnerClock {
	today: Date;
	now: Date;
}

export interface RewindYearVisibility {
	generatedYears: ReadonlySet<number>;
	includeUngenerated: boolean;
}

export type RewindStoredView = Pick<
	Rewind,
	"language" | "generatedAt" | "aiRecap" | "premiumStats" | "ownerControls"
>;
