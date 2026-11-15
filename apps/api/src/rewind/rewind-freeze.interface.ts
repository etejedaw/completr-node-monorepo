import { type RewindEditionRecord } from "../rewind-editions/rewind-editions.interface";
import { type Rewind, type RewindOwner } from "./rewind.interface";
import { type Rewind as RewindModel } from "./rewind.model";
import { type RewindFreezeOutcomeKind } from "./rewind-freeze.types";
import {
	type RewindRecord,
	type RewindYearVisibility
} from "./rewind-record.interface";
import {
	type RewindCalendar,
	type RewindGameGenre,
	type RewindRun
} from "./rewind-run.interface";

export interface RewindViewSource {
	record: RewindRecord;
	owner: RewindOwner;
	runs: RewindRun[];
	genres: RewindGameGenre[];
	platinums: number;
	previousYearPlatinums: number;
	calendar: RewindCalendar;
	visibility: RewindYearVisibility;
	design: string;
	frozenAt: string;
	requireListedYear: boolean;
}

export interface RewindSnapshotContext {
	calendar: RewindCalendar;
	generatedYears: ReadonlySet<number>;
	platinums: number;
	previousYearPlatinums: number;
	design: string;
	frozenAt: string;
}

export interface RewindLiveFields extends Pick<
	Rewind,
	"user" | "isSpotlight" | "otherYears" | "ownerControls" | "premiumAccess"
> {
	platinumsVisible: boolean;
}

export interface RewindFreezeOutcome {
	kind: RewindFreezeOutcomeKind;
	record: RewindModel | null;
}

export interface RewindFreezeTally {
	frozen: number;
	pending: number;
	failed: number;
}

export interface RewindFreezeReport extends RewindFreezeTally {
	locked: boolean;
	closedEditions: number[];
	frozenEditions: number[];
}

export interface ClosedRewindEditions {
	years: number[];
	latest: RewindEditionRecord;
}
