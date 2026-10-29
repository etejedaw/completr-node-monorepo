import { type BacklogEntry, type BacklogStatus } from "../../../../core/models";

export interface PendingStatusUpdate {
	entry: BacklogEntry;
	status: BacklogStatus;
	startedAt: string;
	finishedAt: string;
	realDuration: string;
	rating: number | null;
	reviewToggle: boolean;
	reviewContent: string;
	notes: string;
	markPlatinum: boolean;
	platinumedAt: string;
}
