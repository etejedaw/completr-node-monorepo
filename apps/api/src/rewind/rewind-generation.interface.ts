import { type PremiumAccess } from "../premium-access/premium-access.interface";
import { type RewindEditionRecord } from "../rewind-editions/rewind-editions.interface";
import {
	type RewindCoopPartner,
	type RewindGameReview,
	type RewindGameTag,
	type RewindQueuedGame,
	type RewindRunPlatinum
} from "../rewind-recap/rewind-recap.interface";
import { type User } from "../users/user.model";
import { type RewindPremiumAccessKind } from "./rewind.constants";
import {
	type Rewind,
	type RewindAiRecap,
	type RewindPremiumStats
} from "./rewind.interface";
import { type Rewind as RewindModel } from "./rewind.model";
import {
	type RewindAiBudgetRecord,
	type RewindAiSpend
} from "./rewind-generation.types";
import { type RewindRecord } from "./rewind-record.interface";
import {
	type RewindCalendar,
	type RewindGameFranchise,
	type RewindGameGenre,
	type RewindRun
} from "./rewind-run.interface";

export interface RewindGenerationResult {
	rewind: Rewind;
	created: boolean;
}

export interface RecapRequest {
	recordId: string;
	requestedAt: Date;
}

export interface RecapRunInput {
	owner: User;
	record: RewindModel;
	calendar: RewindCalendar;
	reusablePremiumStats: RewindPremiumStats | null;
	premiumAccess: PremiumAccess;
	spend: RewindAiSpend | null;
}

export interface RecapSources {
	runs: RewindRun[];
	genres: RewindGameGenre[];
	yearGenres: RewindGameGenre[];
	franchises: RewindGameFranchise[];
	coopPartners: RewindCoopPartner[];
	reviews: RewindGameReview[];
	tags: RewindGameTag[];
	runPlatinums: RewindRunPlatinum[] | null;
	upNext: RewindQueuedGame[];
	platinums: number | null;
	premiumStats: RewindPremiumStats;
}

export interface RecapContent {
	aiRecap: RewindAiRecap | null;
	premiumStats: RewindPremiumStats | null;
}

export interface RewindGenerationAttempt {
	year: number;
	record: (RewindAiBudgetRecord & Pick<RewindRecord, "generatedAt">) | null;
	expectedGeneratedAt: string | null;
	calendar: Pick<RewindCalendar, "today" | "edition">;
	accessKind: RewindPremiumAccessKind | null;
}

export interface RewindQuotaAssignment {
	premiumAccessKind: RewindPremiumAccessKind;
	regenerationsLeft: number;
}

export interface RewindAiBudget {
	edition: RewindEditionRecord | null;
	yearAllowed: boolean;
	hasAiAccess: boolean;
	graceEndsAt: string | null;
	regenerationsLeft: number;
	assignment: RewindQuotaAssignment | null;
	spend: RewindAiSpend | null;
}

export interface RewindAiUseChanges {
	premiumAccessKind: RewindPremiumAccessKind | null;
	regenerationsLeft: number;
	graceUsed: boolean;
}

export interface RewindGenerationReservation {
	record: RewindModel;
	created: boolean;
	spend: RewindAiSpend | null;
}
