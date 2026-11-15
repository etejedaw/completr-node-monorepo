import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { of, Subject, throwError } from "rxjs";

import { type Game } from "../../../core/models";
import { GamesService } from "../../../core/services/games";
import { ToastService } from "../../../core/services/toast";
import { injectGameAdminActions } from "./game-admin-actions";

const game = { id: "g1" } as Game;

describe("injectGameAdminActions", () => {
	const deactivate = vi.fn();
	const hardDelete = vi.fn();
	const navigate = vi.fn();
	const toast = { warning: vi.fn() };

	function setup() {
		TestBed.configureTestingModule({
			providers: [
				{ provide: GamesService, useValue: { deactivate, hardDelete } },
				{ provide: Router, useValue: { navigate } },
				{ provide: ToastService, useValue: toast }
			]
		});
		return TestBed.runInInjectionContext(() =>
			injectGameAdminActions(signal(game))
		);
	}

	beforeEach(() => {
		deactivate.mockReset().mockReturnValue(of({}));
		hardDelete.mockReset().mockReturnValue(of({}));
		navigate.mockReset();
		toast.warning.mockReset();
	});

	it("sends one delete when confirmed repeatedly", () => {
		hardDelete.mockReturnValue(new Subject());
		const flow = setup();

		flow.remove();
		flow.remove();

		expect(hardDelete).toHaveBeenCalledTimes(1);
		expect(flow.state().deleting).toBe(true);
	});

	it("leaves the page after deleting", () => {
		setup().remove();

		expect(navigate).toHaveBeenCalledWith(["/games"]);
	});

	it("explains a game in use and closes the confirmation", () => {
		hardDelete.mockReturnValue(
			throwError(() => ({ status: 422, error: { type: "GAME_IN_USE" } }))
		);
		const flow = setup();
		flow.update({ confirmDelete: true });

		flow.remove();

		expect(toast.warning).toHaveBeenCalledWith(
			expect.stringContaining("can't be deleted")
		);
		expect(flow.state().confirmDelete).toBe(false);
		expect(flow.state().deleting).toBe(false);
		expect(navigate).not.toHaveBeenCalled();
	});

	it("shows a game that is already gone as not found", () => {
		hardDelete.mockReturnValue(
			throwError(() => ({
				status: 404,
				error: { type: "GAME_NOT_FOUND" }
			}))
		);

		setup().remove();

		expect(toast.warning).toHaveBeenCalledWith(
			expect.stringContaining("no longer exists")
		);
	});

	it("does not repeat the toast the interceptor already showed for a conflict", () => {
		deactivate.mockReturnValue(throwError(() => ({ status: 409 })));

		setup().deactivate();

		expect(toast.warning).not.toHaveBeenCalled();
	});

	it("falls back to a generic message on a network failure", () => {
		deactivate.mockReturnValue(throwError(() => ({ status: 0 })));
		const flow = setup();

		flow.deactivate();

		expect(toast.warning).toHaveBeenCalledWith(
			"Could not deactivate game."
		);
		expect(flow.state().deactivating).toBe(false);
	});
});
