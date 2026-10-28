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
		persona: "trophy-hunter" as const,
		covers: ["a", "b", "c", "d", "e"].map(cover),
		...overrides
	};
}

describe("RewindYearCard", () => {
	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });
	});

	function render(value: RewindYearSummary) {
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

	it("shows the year's persona and paints the card with the year's colour", () => {
		const element = render(summary({ year: 2025 }));
		const link = element.querySelector("a")!;

		expect(link.textContent).toContain("Trophy Hunter");
		expect(link.textContent).not.toContain("you emptied them");
		expect(link.style.getPropertyValue("--tone")).toBe(
			"var(--color-nav-lists)"
		);
	});

	it("gives consecutive years different colours", () => {
		const tones = [2024, 2025, 2026].map(year =>
			render(summary({ year }))
				.querySelector("a")!
				.style.getPropertyValue("--tone")
		);

		expect(new Set(tones).size).toBe(3);
	});

	it("falls back to the started count when nothing was finished", () => {
		const element = render(summary({ finishedCount: 0, covers: [] }));

		expect(element.textContent).toContain("23 started");
		expect(element.querySelectorAll("app-game-poster")).toHaveLength(0);
	});
});
