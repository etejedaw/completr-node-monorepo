import { DestroyRef, inject, type Signal, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

import { type Game } from "../../../core/models";
import { GamesService } from "../../../core/services/games";
import { ToastService } from "../../../core/services/toast";
import { type ReportModalState } from "./game-detail.model";

const REPORT_MESSAGE_MIN_LENGTH = 10;
const CONFLICT_STATUS = 409;
const AUTO_REPORT_MESSAGE =
	"Missing data for Completr Score (auto-reported from aggregate slot)";

export function injectGameReport(game: Signal<Game | null>) {
	const gamesService = inject(GamesService);
	const toast = inject(ToastService);
	const destroyRef = inject(DestroyRef);

	const state = signal<ReportModalState>({
		show: false,
		message: "",
		submitting: false,
		sent: false,
		error: ""
	});

	function update(patch: Partial<ReportModalState>) {
		state.update(current => ({ ...current, ...patch }));
	}

	function open() {
		update({ show: true, message: "", error: "" });
	}

	function close() {
		update({ show: false });
	}

	function setMessage(message: string) {
		update({ message });
	}

	function reportMissingData() {
		const gameId = game()?.id;
		if (!gameId || state().submitting) return;
		update({ submitting: true });
		gamesService
			.reportGame(gameId, AUTO_REPORT_MESSAGE, "missing_score")
			.pipe(takeUntilDestroyed(destroyRef))
			.subscribe({
				next: () => update({ submitting: false, sent: true }),
				error: err => {
					if (err.status === CONFLICT_STATUS) {
						update({ submitting: false, sent: true });
						return;
					}
					update({ submitting: false });
					toast.warning("Could not send the report. Try again.");
				}
			});
	}

	function submit() {
		const gameId = game()?.id;
		const { message, submitting } = state();
		if (!gameId || message.length < REPORT_MESSAGE_MIN_LENGTH || submitting)
			return;

		update({ submitting: true, error: "" });
		gamesService
			.reportGame(gameId, message)
			.pipe(takeUntilDestroyed(destroyRef))
			.subscribe({
				next: () =>
					update({ submitting: false, show: false, sent: true }),
				error: err =>
					update({
						submitting: false,
						error:
							err.error?.detail ||
							err.error?.title ||
							"Failed to submit report"
					})
			});
	}

	return { state, open, close, setMessage, reportMissingData, submit };
}
