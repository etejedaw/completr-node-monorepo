import { type Signal, type WritableSignal } from "@angular/core";

import { type BacklogEntry } from "../../core/models";

export interface BacklogBulkActionsOptions {
	entries: WritableSignal<BacklogEntry[]>;
	total: WritableSignal<number>;
	queuedIds: Signal<ReadonlySet<string>>;
	reloadQueue: () => void;
}

export type BacklogBulkDialog = "status" | "rating";
