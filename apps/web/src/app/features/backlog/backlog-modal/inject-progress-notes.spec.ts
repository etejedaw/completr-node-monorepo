import { HttpErrorResponse } from "@angular/common/http";
import { TestBed } from "@angular/core/testing";
import { Subject, throwError } from "rxjs";

import { ToastService } from "../../../core/services/toast";
import { BacklogProgressService } from "../../backlog-progress/backlog-progress";
import { type ProgressNote } from "../../backlog-progress/backlog-progress.model";
import { injectProgressNotes } from "./inject-progress-notes";

describe("injectProgressNotes", () => {
	const toast = { error: vi.fn() };
	const service = {
		getProgress: vi.fn(),
		addProgress: vi.fn(),
		deleteProgress: vi.fn()
	};
	const note = (id: string): ProgressNote => ({
		id,
		note: `note ${id}`,
		createdAt: "2026-01-01"
	});

	function setup() {
		toast.error.mockReset();
		Object.values(service).forEach(fn => fn.mockReset());
		TestBed.configureTestingModule({
			providers: [
				{ provide: ToastService, useValue: toast },
				{ provide: BacklogProgressService, useValue: service }
			]
		});
		return TestBed.runInInjectionContext(() =>
			injectProgressNotes(() => "b1")
		);
	}

	it("sends one request when the add button is clicked twice before the answer", () => {
		const progress = setup();
		const answer = new Subject<ProgressNote>();
		service.addProgress.mockReturnValue(answer);
		progress.updateDraft("At the boss");

		progress.addNote();
		progress.addNote();
		answer.next(note("n1"));
		answer.complete();

		expect(service.addProgress).toHaveBeenCalledTimes(1);
		expect(progress.notes().map(n => n.id)).toEqual(["n1"]);
		expect(progress.draft()).toBe("");
		expect(progress.loading()).toBe(false);
	});

	it("ignores a draft made only of whitespace", () => {
		const progress = setup();
		progress.updateDraft("   \n ");

		progress.addNote();

		expect(service.addProgress).not.toHaveBeenCalled();
	});

	it("keeps the draft and warns when saving the note fails", () => {
		const progress = setup();
		service.addProgress.mockReturnValue(
			throwError(() => new HttpErrorResponse({ status: 500 }))
		);
		progress.updateDraft("Keep me");

		progress.addNote();

		expect(progress.draft()).toBe("Keep me");
		expect(progress.loading()).toBe(false);
		expect(toast.error).toHaveBeenCalledWith("Couldn't save the note.");
	});

	it("releases the note being deleted when the run is gone", () => {
		const progress = setup();
		service.deleteProgress.mockReturnValue(
			throwError(() => new HttpErrorResponse({ status: 404 }))
		);

		progress.deleteNote(note("n1"));

		expect(progress.savingId()).toBeNull();
		expect(toast.error).toHaveBeenCalledWith("Couldn't delete the note.");
	});

	it("ignores a second delete while one is in flight", () => {
		const progress = setup();
		service.deleteProgress.mockReturnValue(new Subject<void>());

		progress.deleteNote(note("n1"));
		progress.deleteNote(note("n2"));

		expect(service.deleteProgress).toHaveBeenCalledTimes(1);
		expect(progress.savingId()).toBe("n1");
	});
});
