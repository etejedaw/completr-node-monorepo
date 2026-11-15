import { inject, signal } from "@angular/core";

import { ToastService } from "../../../core/services/toast";
import { reportHttpFailure } from "../../../shared/utils/http-failure";
import { BacklogProgressService } from "../../backlog-progress/backlog-progress";
import { type ProgressNote } from "../../backlog-progress/backlog-progress.model";

export function injectProgressNotes(entryId: () => string | undefined) {
	const progressService = inject(BacklogProgressService);
	const toast = inject(ToastService);

	const notes = signal<ProgressNote[]>([]);
	const draft = signal("");
	const loading = signal(false);
	const historyOpen = signal(false);
	const savingId = signal<string | null>(null);

	const load = () => {
		const id = entryId();
		if (!id) return;
		progressService.getProgress(id).subscribe({
			next: list => notes.set(list),
			error: (error: unknown) =>
				reportHttpFailure(
					toast,
					error,
					"Couldn't load the progress notes."
				)
		});
	};

	const updateDraft = (value: string) => draft.set(value);

	const toggleHistory = () => historyOpen.update(open => !open);

	const addNote = () => {
		const note = draft().trim();
		const id = entryId();
		if (!note || !id || loading()) return;
		loading.set(true);
		progressService.addProgress(id, note).subscribe({
			next: created => {
				notes.update(list => [created, ...list]);
				draft.set("");
				loading.set(false);
			},
			error: (error: unknown) => {
				loading.set(false);
				reportHttpFailure(toast, error, "Couldn't save the note.");
			}
		});
	};

	const deleteNote = (note: ProgressNote) => {
		const id = entryId();
		if (!id || savingId()) return;
		savingId.set(note.id);
		progressService.deleteProgress(id, note.id).subscribe({
			next: () => {
				notes.update(list => list.filter(item => item.id !== note.id));
				savingId.set(null);
			},
			error: (error: unknown) => {
				savingId.set(null);
				reportHttpFailure(toast, error, "Couldn't delete the note.");
			}
		});
	};

	return {
		notes,
		draft,
		loading,
		historyOpen,
		savingId,
		load,
		updateDraft,
		toggleHistory,
		addNote,
		deleteNote
	};
}
