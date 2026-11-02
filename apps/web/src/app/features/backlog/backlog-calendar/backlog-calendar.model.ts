import { type BacklogEntry, type BacklogStatus } from "../../../core/models";

export interface BarSlot {
	entry: BacklogEntry;
	status: BacklogStatus;
	showTitle: boolean;
	roundLeft: boolean;
	roundRight: boolean;
}

export interface CalendarLayout {
	slots: Map<string, (BarSlot | null)[]>;
	overflow: Map<string, number>;
	dayEntries: Map<string, BacklogEntry[]>;
}

export interface WeekSegment {
	entry: BacklogEntry;
	status: BacklogStatus;
	segStart: Date;
	segEnd: Date;
	startsBeforeWeek: boolean;
	endsAfterWeek: boolean;
	lane: number;
}

export interface DateRange {
	start: Date;
	end: Date;
}
