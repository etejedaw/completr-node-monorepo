import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { type RewindYearSummary } from "../../../../core/models/rewind.model";
import { RewindYearCard } from "./rewind-year-card";

const cover = (id: string) => ({
	gameId: id,
	code: id,
	title: `Game ${id}`,
	coverUrl: null,
	backgroundUrl: null
});

function summary(overrides: Partial<RewindYearSummary> = {}) {
	return {
		year: 2025,
		finishedCount: 18,
		startedCount: 23,
		hoursPlayed: 212.5,
		covers: ["a", "b", "c", "d", "e"].map(cover),
		...overrides
	};
}

describe("RewindYearCard", () => {
	function render(value: RewindYearSummary) {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });
		const fixture = TestBed.createComponent(RewindYearCard);
		fixture.componentRef.setInput("username", "ada");
		fixture.componentRef.setInput("summary", value);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it("links to the year with its finished count and three covers", () => {
		const element = render(summary());
		const link = element.querySelector("a")!;

		expect(link.getAttribute("href")).toBe("/user/ada/rewind/2025");
		expect(link.textContent).toContain("2025");
		expect(link.textContent).toContain("18 finished");
		expect(element.querySelectorAll("app-game-poster")).toHaveLength(3);
	});

	it("falls back to the started count when nothing was finished", () => {
		const element = render(summary({ finishedCount: 0, covers: [] }));

		expect(element.textContent).toContain("23 started");
		expect(element.querySelectorAll("app-game-poster")).toHaveLength(0);
	});
});
