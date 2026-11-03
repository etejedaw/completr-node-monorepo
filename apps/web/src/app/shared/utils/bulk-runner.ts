import { inject, signal } from "@angular/core";
import { finalize } from "rxjs";

import { type BulkResult } from "../../core/models";
import { ToastService } from "../../core/services/toast";
import { isToastedByInterceptor, partialBulkMessage } from "./bulk-feedback";
import { type BulkRunOptions } from "./bulk-runner.model";
import { type RowSelection } from "./row-selection.model";

export function injectBulkRunner<T>(selection: RowSelection<T>) {
	const toast = inject(ToastService);
	const busy = signal(false);

	function run<TResult extends BulkResult>(options: BulkRunOptions<TResult>) {
		if (busy()) return;
		busy.set(true);
		options.request.pipe(finalize(() => busy.set(false))).subscribe({
			next: result => {
				options.applied(result);
				const skippedIds = result.skipped.map(item => item.id);
				if (skippedIds.length === 0) {
					selection.clear();
					toast.success(
						options.successMessage(result.succeeded.length)
					);
					return;
				}
				selection.select(options.rowIdsOf(skippedIds));
				toast.warning(
					partialBulkMessage(
						result.succeeded.length,
						skippedIds.length,
						options.partialVerb
					)
				);
			},
			error: error => {
				if (!isToastedByInterceptor(error))
					toast.error(options.failureMessage);
			}
		});
	}

	return { busy: busy.asReadonly(), run };
}
