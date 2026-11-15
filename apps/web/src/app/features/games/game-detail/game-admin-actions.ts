import { DestroyRef, inject, type Signal, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Router } from "@angular/router";

import { type Game } from "../../../core/models";
import { GamesService } from "../../../core/services/games";
import { ToastService } from "../../../core/services/toast";
import { adminErrorMessage } from "../../../core/utils/admin-error-message";
import { type AdminActionsState } from "./components/game-admin-bar.model";

const CONFLICT_STATUS = 409;

export function injectGameAdminActions(game: Signal<Game | null>) {
	const gamesService = inject(GamesService);
	const router = inject(Router);
	const toast = inject(ToastService);
	const destroyRef = inject(DestroyRef);

	const state = signal<AdminActionsState>({
		confirmDeactivate: false,
		confirmDelete: false,
		editor: false,
		deactivating: false,
		deleting: false
	});

	function update(patch: Partial<AdminActionsState>) {
		state.update(current => ({ ...current, ...patch }));
	}

	function reportError(err: { status?: number }, fallback: string) {
		if (err.status === CONFLICT_STATUS) return;
		toast.warning(adminErrorMessage(err) ?? fallback);
	}

	function deactivate() {
		const current = game();
		if (!current || state().deactivating) return;
		update({ deactivating: true });
		gamesService
			.deactivate(current.id)
			.pipe(takeUntilDestroyed(destroyRef))
			.subscribe({
				next: () => router.navigate(["/games"]),
				error: err => {
					update({ deactivating: false, confirmDeactivate: false });
					reportError(err, "Could not deactivate game.");
				}
			});
	}

	function remove() {
		const current = game();
		if (!current || state().deleting) return;
		update({ deleting: true });
		gamesService
			.hardDelete(current.id)
			.pipe(takeUntilDestroyed(destroyRef))
			.subscribe({
				next: () => router.navigate(["/games"]),
				error: err => {
					update({ deleting: false, confirmDelete: false });
					reportError(err, "Could not delete game.");
				}
			});
	}

	return { state, update, deactivate, remove };
}
