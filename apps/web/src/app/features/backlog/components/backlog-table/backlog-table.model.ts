import { type BacklogEntry, type BacklogStatus } from "../../../../core/models";

export interface BacklogTableEntryEvent {
	entry: BacklogEntry;
	event: Event;
}

export interface BacklogTableStatusChange {
	entry: BacklogEntry;
	status: BacklogStatus;
}

export interface BacklogTableRating {
	entry: BacklogEntry;
	rating: number | null;
}

export interface BacklogTableFavoriteToggle {
	gameId: string;
	event: Event;
}

export interface BacklogTableColumn {
	label: string;
	sortKey: string | null;
	headerClass: string;
	hint?: string;
}
