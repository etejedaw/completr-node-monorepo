import { TestBed } from "@angular/core/testing";

import { StatusBreakdown, type StatusCounts } from "./status-breakdown";

describe("StatusBreakdown", () => {
	function render(counts: Partial<StatusCounts>) {
		const fixture = TestBed.createComponent(StatusBreakdown);
		fixture.componentRef.setInput("counts", {
			not_started: 0,
			playing: 0,
			completed: 0,
			abandoned: 0,
			endless: 0,
			...counts
		});
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	function rows(element: HTMLElement) {
		return Array.from(element.querySelectorAll("li")).map(li =>
			Array.from(li.querySelectorAll("span"))
				.map(span => span.textContent?.trim())
				.filter(Boolean)
				.join(" ")
		);
	}

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [StatusBreakdown] });
	});

	it("lists every status in display order with count and percentage", () => {
		const element = render({ not_started: 1, completed: 3 });

		expect(rows(element)).toEqual([
			"Not Started 1 25%",
			"Playing 0 0%",
			"Completed 3 75%",
			"Endless 0 0%",
			"Abandoned 0 0%"
		]);
	});

	it("rounds the percentages", () => {
		const element = render({ playing: 1, completed: 2 });

		expect(rows(element)).toContain("Playing 1 33%");
		expect(rows(element)).toContain("Completed 2 67%");
	});

	it("shows zero percent everywhere when there are no games", () => {
		const element = render({});

		expect(rows(element).every(row => row?.endsWith("0 0%"))).toBe(true);
	});

	it("summarizes the counts for assistive tech", () => {
		const element = render({ playing: 2, completed: 2 });

		expect(
			element.querySelector("[role='img']")?.getAttribute("aria-label")
		).toBe(
			"Games by status: Not Started 0 (0%), Playing 2 (50%), Completed 2 (50%), Endless 0 (0%), Abandoned 0 (0%)"
		);
	});

	it("draws a bar segment only for statuses with games", () => {
		const element = render({ playing: 2, abandoned: 1 });

		const segments = Array.from(
			element.querySelectorAll<HTMLElement>("[role='img'] > span")
		);
		expect(segments.map(s => s.title)).toEqual([
			"Playing: 2",
			"Abandoned: 1"
		]);
		expect(segments.map(s => s.style.flexGrow)).toEqual(["2", "1"]);
	});

	it("dims the legend rows of empty statuses", () => {
		const element = render({ playing: 1 });

		const dimmed = Array.from(element.querySelectorAll("li")).filter(li =>
			li.classList.contains("opacity-50")
		);
		expect(dimmed).toHaveLength(4);
	});
});
