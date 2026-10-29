import {
	type Rewind,
	type RewindAiRecap,
	type RewindPremiumStats
} from "./rewind.interface";
import { type RewindRecord } from "./rewind-record.interface";
import { type RewindGameGenre, type RewindRun } from "./rewind-run.interface";

export interface RewindGenerationResult {
	rewind: Rewind;
	created: boolean;
}

export interface RecapRequest {
	recordId: string;
	requestedAt: Date;
}

export interface RecapSources {
	runs: RewindRun[];
	genres: RewindGameGenre[];
	yearGenres: RewindGameGenre[];
	platinums: number | null;
	premiumStats: RewindPremiumStats;
}

export interface RecapContent {
	aiRecap: RewindAiRecap | null;
	premiumStats: RewindPremiumStats | null;
}

export interface RewindGenerationAttempt {
	record: Pick<
		RewindRecord,
		"year" | "generatedAt" | "regenerationsUsed" | "graceUsed"
	> | null;
	expectedGeneratedAt: string | null;
	today: Date;
}
