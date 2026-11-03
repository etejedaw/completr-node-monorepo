import { inject } from "@angular/core";

import { ToastService } from "../../core/services/toast";
import { isToastedByInterceptor, partialBulkMessage } from "./bulk-feedback";
import { type BulkRemovalOptions } from "./bulk-removal.model";
import { PendingRemovals } from "./pending-removals";

export function injectBulkRemoval<T>(options: BulkRemovalOptions<T>) {
	const toast = inject(ToastService);
	const pending = new PendingRemovals<T>(options.keyOf);

	function remove(items: readonly T[]) {
		if (items.length === 0) return;
		const batch = [...items];
		options.rows.set(pending.hideAll(batch, options.rows()));
		options.total.update(total => Math.max(0, total - batch.length));
		toast.pending({
			message: options.pendingMessage(batch.length),
			onCommit: () => commit(batch),
			onUndo: () => restore(batch)
		});
	}

	function restore(items: readonly T[]) {
		options.rows.set(pending.undoAll(items, options.rows()));
		options.total.update(total => total + items.length);
	}

	function reselect(items: readonly T[]) {
		options.selection.select(items.map(options.keyOf));
	}

	function commit(items: readonly T[]) {
		const ids = [...new Set(items.map(options.requestIdOf))];
		options.request(ids).subscribe({
			next: result => {
				const skipped = new Set(result.skipped.map(item => item.id));
				const kept = items.filter(item =>
					skipped.has(options.requestIdOf(item))
				);
				pending.commitAll(
					items.filter(
						item => !skipped.has(options.requestIdOf(item))
					)
				);
				if (kept.length === 0) return;
				restore(kept);
				reselect(kept);
				toast.warning(
					partialBulkMessage(
						items.length - kept.length,
						kept.length,
						"removed"
					)
				);
			},
			error: error => {
				restore(items);
				reselect(items);
				if (!isToastedByInterceptor(error))
					toast.error(options.failureMessage);
			}
		});
	}

	return {
		remove,
		withoutPending: (rows: readonly T[]) => pending.withoutPending(rows)
	};
}
