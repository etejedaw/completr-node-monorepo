import { type BacklogEntry, type BacklogStatus } from "../../../../core/models";

export interface BacklogTableEntryEvent {
	entry: BacklogEntry;
	event: Event;
}

export interface BacklogTableStatusSelection extends BacklogTableEntryEvent {
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
