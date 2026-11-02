import { DestroyRef, inject, linkedSignal, signal } from "@angular/core";
import { Router } from "@angular/router";

import {
	type GenerateRewindRequest,
	type Rewind
} from "../../../../core/models/rewind.model";
import { ToastService } from "../../../../core/services/toast";
import { RewindService } from "../../rewind";
import {
	type RewindGenerateError,
	rewindGenerateError
} from "../../rewind-errors";
import { type RewindGenerateFlowOptions } from "./rewind-generate-flow.model";

const ERRORS_ANNOUNCED_BY_INTERCEPTOR: readonly RewindGenerateError[] = [
	"conflict",
	"limit",
	"rate_limited",
	"invalid"
];

const ERRORS_THAT_CHANGE_THE_REWIND: readonly RewindGenerateError[] = [
	"conflict",
	"limit"
];

export type RewindGenerateFlow = ReturnType<typeof injectRewindGenerateFlow>;

export function injectRewindGenerateFlow(options: RewindGenerateFlowOptions) {
	const rewindService = inject(RewindService);
	const toast = inject(ToastService);
	const router = inject(Router);
	let hostDestroyed = false;
	inject(DestroyRef).onDestroy(() => (hostDestroyed = true));

	const isOpen = signal(false);
	const isPending = signal(false);
	const error = signal<RewindGenerateError | null>(null);
	const latestRewind = linkedSignal<Rewind | null>(
		() => options.rewind?.() ?? null
	);

	function notifyHost(rewind: Rewind) {
		latestRewind.set(rewind);
		if (!hostDestroyed) options.onGenerated(rewind);
	}

	function announceInBackground(username: string, rewind: Rewind) {
		toast.pending({
			message: `Your ${rewind.year} Rewind is ready`,
			variant: "success",
			undoLabel: "View",
			onCommit: () => undefined,
			onUndo: () =>
				void router.navigate(["/user", username, "rewind", rewind.year])
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
				} else if (!hostDestroyed) {
					options.onFinishedInDialog?.(rewind);
				}
			},
			error: (failure: unknown) => {
				isPending.set(false);
				const kind = rewindGenerateError(failure);
				error.set(kind);
				if (ERRORS_THAT_CHANGE_THE_REWIND.includes(kind))
					reloadAfterChange(username, year);
				if (
					!isOpen() &&
					!ERRORS_ANNOUNCED_BY_INTERCEPTOR.includes(kind)
				)
					toast.error(
						`Couldn't generate your ${year} Rewind. Try again.`
					);
			}
		});
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
