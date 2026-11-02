import { type HttpErrorResponse } from "@angular/common/http";
import { inject, signal } from "@angular/core";

import { ToastService } from "../../core/services/toast";
import {
	type FranchiseTrackingOptions,
	type TrackableFranchise
} from "./franchise-tracking.model";
import { FranchisesService } from "./franchises";

export function injectFranchiseTracking(
	options: FranchiseTrackingOptions = {}
) {
	const franchisesService = inject(FranchisesService);
	const toast = inject(ToastService);

	const trackedOverrides = signal<Record<string, boolean>>({});
	const pendingCodes = signal<ReadonlySet<string>>(new Set());

	const setPending = (code: string, pending: boolean) =>
		pendingCodes.update(codes => {
			const next = new Set(codes);
			if (pending) next.add(code);
			else next.delete(code);
			return next;
		});

	const isTracked = (franchise: TrackableFranchise) =>
		trackedOverrides()[franchise.code] ?? franchise.isTracked;

	const isPending = (franchise: TrackableFranchise) =>
		pendingCodes().has(franchise.code);

	const reportFailure = (
		franchise: TrackableFranchise,
		error: HttpErrorResponse
	) => {
		if (error.status === 404) {
			toast.error(`${franchise.name} is no longer in the catalog.`);
			options.onMissing?.();
			return;
		}
		toast.error(`Couldn't update ${franchise.name}. Try again.`);
	};

	const toggle = (franchise: TrackableFranchise) => {
		if (isPending(franchise)) return;
		const tracked = !isTracked(franchise);
		setPending(franchise.code, true);
		franchisesService.setTracked(franchise.code, tracked).subscribe({
			next: () => {
				trackedOverrides.update(overrides => ({
					...overrides,
					[franchise.code]: tracked
				}));
				setPending(franchise.code, false);
			},
			error: (error: HttpErrorResponse) => {
				setPending(franchise.code, false);
				reportFailure(franchise, error);
			}
		});
	};

	return { isTracked, isPending, toggle };
}
