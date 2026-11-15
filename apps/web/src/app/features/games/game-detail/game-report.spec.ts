import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { of, Subject, throwError } from "rxjs";

import { type Game } from "../../../core/models";
import { GamesService } from "../../../core/services/games";
import { ToastService } from "../../../core/services/toast";
import { injectGameReport } from "./game-report";

const game = { id: "g1" } as Game;

describe("injectGameReport", () => {
	const reportGame = vi.fn();
	const toast = { warning: vi.fn() };

	function setup(current: Game | null = game) {
		TestBed.configureTestingModule({
			providers: [
				{ provide: GamesService, useValue: { reportGame } },
				{ provide: ToastService, useValue: toast }
			]
		});
		return TestBed.runInInjectionContext(() =>
			injectGameReport(signal(current))
		);
	}

	beforeEach(() => {
		reportGame.mockReset().mockReturnValue(of({}));
		toast.warning.mockReset();
	});

	it("sends a typed message once even when submitted repeatedly", () => {
		const pending = new Subject<unknown>();
		reportGame.mockReturnValue(pending);
		const report = setup();
		report.open();
		report.setMessage("The cover is wrong here");

		report.submit();
		report.submit();
		report.submit();

		expect(reportGame).toHaveBeenCalledTimes(1);
		expect(report.state().submitting).toBe(true);
	});

	it("ignores messages shorter than ten characters", () => {
		const report = setup();
		report.setMessage("too short");

		report.submit();

		expect(reportGame).not.toHaveBeenCalled();
	});

	it("shows the server detail and lets the user retry", () => {
		reportGame
			.mockReturnValueOnce(
				throwError(() => ({ status: 500, error: { title: "Boom" } }))
			)
			.mockReturnValue(of({}));
		const report = setup();
		report.open();
		report.setMessage("The cover is wrong here");

		report.submit();
		expect(report.state().error).toBe("Boom");
		expect(report.state().submitting).toBe(false);

		report.submit();
		expect(report.state().sent).toBe(true);
		expect(report.state().show).toBe(false);
	});

	it("falls back to a generic message when the error has no body", () => {
		reportGame.mockReturnValue(throwError(() => ({ status: 0 })));
		const report = setup();
		report.setMessage("The cover is wrong here");

		report.submit();

		expect(report.state().error).toBe("Failed to submit report");
	});

	it("does nothing without a loaded game", () => {
		const report = setup(null);
		report.setMessage("The cover is wrong here");

		report.submit();
		report.reportMissingData();

		expect(reportGame).not.toHaveBeenCalled();
	});

	describe("missing data auto-report", () => {
		it("marks the report as sent", () => {
			const report = setup();

			report.reportMissingData();

			expect(reportGame).toHaveBeenCalledWith(
				"g1",
				expect.any(String),
				"missing_score"
			);
			expect(report.state().sent).toBe(true);
		});

		it("treats a duplicate report (409) as already sent", () => {
			reportGame.mockReturnValue(throwError(() => ({ status: 409 })));
			const report = setup();

			report.reportMissingData();

			expect(report.state().sent).toBe(true);
			expect(toast.warning).not.toHaveBeenCalled();
		});

		it.each([500, 0, 404])(
			"warns and stays retryable after a %s",
			status => {
				reportGame.mockReturnValue(throwError(() => ({ status })));
				const report = setup();

				report.reportMissingData();

				expect(toast.warning).toHaveBeenCalledWith(
					"Could not send the report. Try again."
				);
				expect(report.state().sent).toBe(false);
				expect(report.state().submitting).toBe(false);
			}
		);

		it("sends a single request on repeated clicks", () => {
			reportGame.mockReturnValue(new Subject());
			const report = setup();

			report.reportMissingData();
			report.reportMissingData();

			expect(reportGame).toHaveBeenCalledTimes(1);
		});
	});
});
