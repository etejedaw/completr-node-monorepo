import { HttpErrorResponse } from "@angular/common/http";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { of, Subject, throwError } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { ToastService } from "../../../core/services/toast";
import { CoopRunsService } from "../../coop-runs/coop-runs";
import { PublicSocialService } from "../../public-profile/services/public-social.service";
import { injectCoopRun } from "./inject-coop-run";

describe("injectCoopRun", () => {
	const toast = { error: vi.fn() };
	const coopService = {
		getMembers: vi.fn(),
		getCandidates: vi.fn(),
		addMember: vi.fn(),
		removeMember: vi.fn(),
		sync: vi.fn()
	};
	const onSynced = vi.fn();

	function setup() {
		toast.error.mockReset();
		onSynced.mockReset();
		Object.values(coopService).forEach(fn => fn.mockReset());
		coopService.getMembers.mockReturnValue(of([]));
		TestBed.configureTestingModule({
			providers: [
				{ provide: ToastService, useValue: toast },
				{ provide: CoopRunsService, useValue: coopService },
				{ provide: PublicSocialService, useValue: {} },
				{ provide: AuthService, useValue: { user: signal(null) } }
			]
		});
		return TestBed.runInInjectionContext(() =>
			injectCoopRun({ entryId: () => "b1", onSynced })
		);
	}

	it("adds a friend once when the picker is chosen twice in a row", () => {
		const coop = setup();
		coopService.getCandidates.mockReturnValue(
			of({
				accessible: true,
				candidates: [{ id: "c1" }, { id: "c2" }]
			})
		);
		coopService.addMember.mockReturnValue(new Subject<unknown>());

		coop.addMember("u2");
		coop.chooseCandidate("c1");
		coop.chooseCandidate("c1");

		expect(coopService.addMember).toHaveBeenCalledTimes(1);
		expect(coopService.addMember).toHaveBeenCalledWith("b1", "u2", "c1");
	});

	it("ignores a second add while the candidates are loading", () => {
		const coop = setup();
		coopService.getCandidates.mockReturnValue(new Subject<unknown>());

		coop.addMember("u2");
		coop.addMember("u2");

		expect(coopService.getCandidates).toHaveBeenCalledTimes(1);
	});

	it("releases the add button and warns when the player cannot be added", () => {
		const coop = setup();
		coopService.getCandidates.mockReturnValue(
			throwError(() => new HttpErrorResponse({ status: 500 }))
		);

		coop.addMember("u2");

		expect(coop.adding()).toBe(false);
		expect(toast.error).toHaveBeenCalledWith("Couldn't add this player.");
	});

	it("does not sync when no field is selected", () => {
		const coop = setup();
		coop.openSyncDialog({ userId: "u2", backlogId: "b2" } as never);
		for (const field of [
			"status",
			"startedAt",
			"finishedAt",
			"realDuration"
		] as const)
			coop.toggleSyncField(field);

		coop.commitSync();

		expect(coop.hasAnySyncFieldSelected()).toBe(false);
		expect(coopService.sync).not.toHaveBeenCalled();
	});

	it("syncs once on a double click and closes after the answer", () => {
		const coop = setup();
		const answer = new Subject<unknown>();
		coopService.sync.mockReturnValue(answer);
		coop.openSyncDialog({ userId: "u2", backlogId: "b2" } as never);

		coop.commitSync();
		coop.commitSync();
		answer.next({});
		answer.complete();

		expect(coopService.sync).toHaveBeenCalledTimes(1);
		expect(onSynced).toHaveBeenCalledOnce();
		expect(coop.syncing()).toBe(false);
	});

	it("keeps the sync dialog open and warns when the sync fails", () => {
		const coop = setup();
		coopService.sync.mockReturnValue(
			throwError(() => new HttpErrorResponse({ status: 404 }))
		);
		coop.openSyncDialog({ userId: "u2", backlogId: "b2" } as never);

		coop.commitSync();

		expect(coop.syncMember()).not.toBeNull();
		expect(coop.syncing()).toBe(false);
		expect(onSynced).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith("Couldn't sync this run.");
	});
});
