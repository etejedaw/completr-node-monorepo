import { type ReleaseView } from "./release.model";

export interface PendingScroll {
	anchor: string;
	behavior: ScrollBehavior;
}

export interface MonthSummary {
	month: string;
	count: number;
}

export interface MonthGroup {
	month: string;
	releases: ReleaseView[];
}
