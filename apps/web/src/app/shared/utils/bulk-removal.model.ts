import { type WritableSignal } from "@angular/core";
import { type Observable } from "rxjs";

import { type BulkResult } from "../../core/models";
import { type RowSelection } from "./row-selection.model";

export interface BulkRemovalOptions<T> {
	rows: WritableSignal<T[]>;
	total: WritableSignal<number>;
	selection: RowSelection<T>;
	keyOf: (row: T) => string;
	requestIdOf: (row: T) => string;
	request: (ids: string[]) => Observable<BulkResult>;
	pendingMessage: (count: number) => string;
	failureMessage: string;
}
