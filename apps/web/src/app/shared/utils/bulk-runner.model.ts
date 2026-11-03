import { type Observable } from "rxjs";

import { type BulkResult } from "../../core/models";

export interface BulkRunOptions<TResult extends BulkResult> {
	request: Observable<TResult>;
	applied: (result: TResult) => void;
	successMessage: (count: number) => string;
	partialVerb: string;
	failureMessage: string;
	rowIdsOf: (resultIds: readonly string[]) => string[];
}
