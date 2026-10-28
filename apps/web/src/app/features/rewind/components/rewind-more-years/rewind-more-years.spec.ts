import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import { of, throwError } from "rxjs";

import { RewindService } from "../../rewind";
import { RewindMoreYears } from "./rewind-more-years";

const summary = (year: number) => ({
	year,
	finishedCount: 2,
	startedCount: 3,
	hoursPlayed: 10,
	persona: "steady-player" as const,
	covers: []
});

describe("RewindMoreYears", () => {
	async function renderMoreYears(getYears: () => unknown) {
		return render(RewindMoreYears, {
			inputs: { username: "ada", currentYear: 2026 },
			providers: [
				provideRouter([]),
				{ provide: RewindService, useValue: { getYears } }
			]
		});
	}

	it("lists the other years and leaves out the one on screen", async () => {
		await renderMoreYears(() =>
			of({ spotlightYear: null, years: [2026, 2025, 2024].map(summary) })
		);

		expect(
			await screen.findByRole("heading", { name: "More Rewinds" })
		).toBeInTheDocument();
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
		expect(
			screen.queryByRole("link", { name: /2026/ })
		).not.toBeInTheDocument();
	});

	it("renders nothing when the archive cannot be loaded", async () => {
		await renderMoreYears(() =>
			throwError(() => Object.assign(new Error("down"), { status: 500 }))
		);

		expect(
			screen.queryByRole("heading", { name: "More Rewinds" })
		).not.toBeInTheDocument();
	});
});
