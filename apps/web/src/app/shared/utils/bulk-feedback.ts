import { HttpErrorResponse } from "@angular/common/http";

import { type BulkItemNoun } from "../components/bulk-action-bar/bulk-action-bar.model";

const STATUSES_TOASTED_BY_INTERCEPTOR: ReadonlySet<number> = new Set([
	402, 409, 422, 429
]);

export function countOf(count: number, noun: BulkItemNoun): string {
	return `${count} ${count === 1 ? noun.one : noun.other}`;
}

export function partialBulkMessage(
	succeeded: number,
	skipped: number,
	verb: string
): string {
	return `${succeeded} ${verb}, ${skipped} couldn't be changed`;
}

export function isToastedByInterceptor(error: unknown): boolean {
	return (
		error instanceof HttpErrorResponse &&
		STATUSES_TOASTED_BY_INTERCEPTOR.has(error.status)
	);
}
