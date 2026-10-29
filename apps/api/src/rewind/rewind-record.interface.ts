import { type User } from "../users/user.model";
import { type SectionAccess } from "../users/users.types";
import { type RewindLanguage } from "./rewind.constants";
import {
	type RewindAiRecap,
	type RewindPremiumStats
} from "./rewind.interface";
import {
	type Rewind as RewindModel,
	type RewindAiRecapStatus
} from "./rewind.model";
import { type RewindCalendar, type RewindRun } from "./rewind-run.interface";

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

export interface RewindViewerContext {
	owner: User;
	access: SectionAccess;
	isOwner: boolean;
	runs: RewindRun[];
	calendar: RewindCalendar;
	records: Map<number, RewindModel>;
}
