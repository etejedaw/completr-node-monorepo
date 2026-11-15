import { type Signal, type WritableSignal } from "@angular/core";

import { type SavedFilter } from "../saved-filters.model";

export interface ViewStatsOptions {
	activeFilterId: Signal<string | null>;
	savedFilters: WritableSignal<SavedFilter[]>;
	backlogFilters: WritableSignal<SavedFilter[]>;
}
