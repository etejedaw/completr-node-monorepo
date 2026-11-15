import { type HttpErrorResponse } from "@angular/common/http";
import { DestroyRef, inject, linkedSignal, signal } from "@angular/core";
import { Router } from "@angular/router";

import {
	type GenerateRewindRequest,
	type Rewind
} from "../../../../core/models/rewind.model";
import { ToastService } from "../../../../core/services/toast";
import { isToastedByErrorInterceptor } from "../../../../core/utils/toasted-error-statuses";
import { RewindService } from "../../rewind";
import {
	BLOCKING_GENERATE_ERRORS,
	type RewindGenerateError,
	rewindGenerateError
} from "../../rewind-errors";
import { type RewindGenerateFlowOptions } from "./rewind-generate-flow.model";

const ERRORS_THAT_CHANGE_THE_REWIND: readonly RewindGenerateError[] = [
	"conflict",
	"limit"
];

const ERRORS_THAT_CHANGE_THE_OWNER_CONTROLS: readonly RewindGenerateError[] = [
	"period_closed",
	"year_requires_premium",
	"premium_required"
];

export function injectRewindGenerateFlow(options: RewindGenerateFlowOptions) {
	const rewindService = inject(RewindService);
	const toast = inject(ToastService);
	const router = inject(Router);
	const destroyRef = inject(DestroyRef);

	const isOpen = signal(false);
	const isPending = signal(false);
	const error = signal<RewindGenerateError | null>(null);
	const latestRewind = linkedSignal<Rewind | null>(
		() => options.rewind?.() ?? null
	);

	function notifyHost(rewind: Rewind) {
		latestRewind.set(rewind);
		if (!destroyRef.destroyed) options.onGenerated(rewind);
	}

	function announceInBackground(username: string, rewind: Rewind) {
		toast.success(`Your ${rewind.year} Rewind is ready`, {
			action: {
				label: "View",
				run: () =>
					void router.navigate([
						"/user",
						username,
						"rewind",
						rewind.year
					])
			}
		});
	}

	function reloadAfterChange(username: string, year: number) {
		rewindService.getRewind(username, year).subscribe({
			next: rewind => notifyHost(rewind),
			error: () => undefined
		});
	}

	function submit(request: GenerateRewindRequest) {
		if (isPending()) return;
		const username = options.username();
		const year = options.year();
		isPending.set(true);
		error.set(null);
		rewindService.generate(year, request).subscribe({
			next: rewind => {
				isPending.set(false);
				const seenInDialog = isOpen();
				isOpen.set(false);
				notifyHost(rewind);
				if (!seenInDialog) {
					announceInBackground(username, rewind);
				} else if (!destroyRef.destroyed) {
					options.onFinishedInDialog?.(rewind);
				}
			},
			error: (failure: unknown) => {
				isPending.set(false);
				const kind = rewindGenerateError(failure);
				error.set(kind);
				const controlsChanged =
					ERRORS_THAT_CHANGE_THE_OWNER_CONTROLS.includes(kind) &&
					latestRewind() !== null;
				if (
					ERRORS_THAT_CHANGE_THE_REWIND.includes(kind) ||
					controlsChanged
				)
					reloadAfterChange(username, year);
				if (shouldToastFailure(failure, kind))
					toast.error(
						`Couldn't generate your ${year} Rewind. Try again.`
					);
			}
		});
	}

	function shouldToastFailure(failure: unknown, kind: RewindGenerateError) {
		const status = (failure as HttpErrorResponse | undefined)?.status ?? 0;
		return (
			!isOpen() &&
			!isToastedByErrorInterceptor(status) &&
			!BLOCKING_GENERATE_ERRORS.includes(kind)
		);
	}

	function open() {
		if (!isPending()) error.set(null);
		isOpen.set(true);
	}

	function close() {
		isOpen.set(false);
	}

	return {
		isOpen: isOpen.asReadonly(),
		isPending: isPending.asReadonly(),
		error: error.asReadonly(),
		latestRewind: latestRewind.asReadonly(),
		open,
		close,
		submit
	};
}
