import { TestBed } from "@angular/core/testing";

import {
	type RewindLanguage,
	type RewindTotals
} from "../../../../../core/models/rewind.model";
import {
	formatRewind2026ResultsValue,
	REWIND_2026_RESULTS_DURATION_MS,
	REWIND_2026_RESULTS_STAGGER_MS,
	rewind2026ResultsRows,
	Rewind2026ResultsStrip
} from "./rewind-2026-results-strip";

const totals: RewindTotals = {
	finished: 18,
	abandoned: 4,
	started: 23,
	hoursPlayed: 212.5,
	platinums: 2,
	finishRate: 82,
	averageRating: 4.3,
	genresPlayed: 6,
	platformsPlayed: 2
};

const bareTotals: RewindTotals = {
	finished: 0,
	abandoned: 0,
	started: 0,
	hoursPlayed: 0,
	platinums: null,
	finishRate: null,
	averageRating: null,
	genresPlayed: 0,
	platformsPlayed: 0
};

const labels = (rows: { label: string }[]) => rows.map(row => row.label);

describe("rewind2026ResultsRows", () => {
	it("lists every row in order when all of them have a value", () => {
		expect(labels(rewind2026ResultsRows(totals))).toEqual([
			"Finished",
			"Left behind",
			"Started",
			"Hours played",
			"Platinums",
			"Finish rate",
			"Average rating"
		]);
	});

	it("gives every row its colour and unit", () => {
		expect(
			rewind2026ResultsRows(totals).map(row => [row.tone, row.unit])
		).toEqual([
			["success", "count"],
			["danger", "count"],
			["playing", "count"],
			["playing", "hours"],
			["platinum", "count"],
			["lists", "percent"],
			["brand", "rating"]
		]);
	});

	it("hides the finish rate and the average rating when there is nothing to rate", () => {
		const rows = labels(
			rewind2026ResultsRows({
				...totals,
				finishRate: null,
				averageRating: null
			})
		);

		expect(rows).not.toContain("Finish rate");
		expect(rows).not.toContain("Average rating");
	});

	it("keeps a 0% finish rate, which is still a result", () => {
		expect(
			labels(rewind2026ResultsRows({ ...totals, finishRate: 0 }))
		).toContain("Finish rate");
	});

	it("hides Started and Platinums when they are zero or the viewer cannot see them", () => {
		expect(
			labels(
				rewind2026ResultsRows({ ...totals, started: 0, platinums: 0 })
			)
		).toEqual([
			"Finished",
			"Left behind",
			"Hours played",
			"Finish rate",
			"Average rating"
		]);
		expect(
			labels(rewind2026ResultsRows({ ...totals, platinums: null }))
		).not.toContain("Platinums");
	});

	it("keeps Finished, Left behind and Hours played even with nothing played", () => {
		expect(
			rewind2026ResultsRows(bareTotals).map(row => [row.label, row.value])
		).toEqual([
			["Finished", 0],
			["Left behind", 0],
			["Hours played", 0]
		]);
	});

	it("labels every row in Spanish", () => {
		expect(
			labels(
				rewind2026ResultsRows({ ...totals, hoursPlayed: 313.3 }, "es")
			)
		).toEqual([
			"Terminados",
			"Abandonados",
			"Empezados",
			"Horas jugadas",
			"Platinos",
			"Tasa de finalización",
			"Nota promedio"
		]);
	});
});

describe("formatRewind2026ResultsValue", () => {
	it("formats each unit without its symbol", () => {
		expect(formatRewind2026ResultsValue("count", 18)).toBe("18");
		expect(formatRewind2026ResultsValue("hours", 212.5)).toBe("212.5");
		expect(formatRewind2026ResultsValue("percent", 100)).toBe("100");
		expect(formatRewind2026ResultsValue("rating", 5)).toBe("5.0");
	});

	it("formats each unit in Spanish", () => {
		expect(formatRewind2026ResultsValue("hours", 313.3, "es")).toBe(
			"313,3"
		);
		expect(formatRewind2026ResultsValue("percent", 82, "es")).toBe("82");
		expect(formatRewind2026ResultsValue("rating", 4, "es")).toBe("4,0");
	});
});

describe("Rewind2026ResultsStrip", () => {
	let frames: Map<number, FrameRequestCallback>;
	let nextFrame: number;
	let observerCallback: (entries: { isIntersecting: boolean }[]) => void;
	let reducedMotion: boolean;

	function stubBrowser({ observer = true } = {}) {
		frames = new Map();
		nextFrame = 1;
		vi.stubGlobal(
			"requestAnimationFrame",
			vi.fn((callback: FrameRequestCallback) => {
				frames.set(nextFrame, callback);
				return nextFrame++;
			})
		);
		vi.stubGlobal(
			"cancelAnimationFrame",
			vi.fn((id: number) => frames.delete(id))
		);
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({ matches: reducedMotion }))
		);
		if (observer) {
			vi.stubGlobal(
				"IntersectionObserver",
				class {
					constructor(handler: typeof observerCallback) {
						observerCallback = handler;
					}
					observe = vi.fn();
					disconnect = vi.fn();
				}
			);
		}
	}

	function runFrame(at: number) {
		const pending = [...frames.entries()];
		frames.clear();
		for (const [, callback] of pending) callback(at);
	}

	async function render(
		value: RewindTotals = totals,
		language: RewindLanguage = "en"
	) {
		const fixture = TestBed.createComponent(Rewind2026ResultsStrip);
		fixture.componentRef.setInput("totals", value);
		fixture.componentRef.setInput("language", language);
		fixture.detectChanges();
		await fixture.whenStable();
		return fixture;
	}

	function visibleNumbers(element: HTMLElement) {
		return [
			...element.querySelectorAll(
				"dd > span[aria-hidden='true']:first-child"
			)
		].map(node => node.textContent?.trim());
	}

	function spokenNumbers(element: HTMLElement) {
		return [...element.querySelectorAll("dd .sr-only")].map(node =>
			node.textContent?.trim()
		);
	}

	beforeEach(() => {
		reducedMotion = false;
		vi.spyOn(performance, "now").mockReturnValue(1000);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("is a Results region with one labelled number per row and the final value for assistive tech", async () => {
		stubBrowser();
		const element = (await render()).nativeElement as HTMLElement;

		expect(
			element.querySelector("section")?.getAttribute("aria-labelledby")
		).toBe(element.querySelector("h2")?.id);
		expect(element.querySelector("h2")?.textContent?.trim()).toBe(
			"Results"
		);
		expect(
			[...element.querySelectorAll("dt")].map(dt =>
				dt.textContent?.trim()
			)
		).toEqual([
			"Finished",
			"Left behind",
			"Started",
			"Hours played",
			"Platinums",
			"Finish rate",
			"Average rating"
		]);
		expect(spokenNumbers(element)).toEqual([
			"18",
			"4",
			"23",
			"212.5",
			"2",
			"82%",
			"4.3 out of 5"
		]);
	});

	it("shows the unit beside hours, finish rate and rating, hidden from assistive tech", async () => {
		reducedMotion = true;
		stubBrowser();
		const element = (await render()).nativeElement as HTMLElement;

		const suffixes = [...element.querySelectorAll("dl > div")].map(cell =>
			[...cell.querySelectorAll("dd > span[aria-hidden='true']")]
				.slice(1)
				.map(unit => unit.textContent?.trim())
		);

		expect(suffixes).toEqual([[], [], [], ["h"], [], ["%"], ["/5"]]);
		expect(visibleNumbers(element)).toEqual([
			"18",
			"4",
			"23",
			"212.5",
			"2",
			"82",
			"4.3"
		]);
	});

	it("paints each number with its own tone", async () => {
		stubBrowser();
		const element = (await render()).nativeElement as HTMLElement;

		expect(
			[...element.querySelectorAll<HTMLElement>("dl > div")].map(cell =>
				cell.style.getPropertyValue("--tone")
			)
		).toEqual([
			"var(--color-success)",
			"var(--color-danger)",
			"var(--color-playing)",
			"var(--color-playing)",
			"var(--color-platinum)",
			"var(--color-nav-lists)",
			"var(--color-brand)"
		]);
	});

	it("leaves out the rows that have nothing to say", async () => {
		reducedMotion = true;
		stubBrowser();
		const element = (await render(bareTotals)).nativeElement as HTMLElement;

		expect(
			[...element.querySelectorAll("dt")].map(dt =>
				dt.textContent?.trim()
			)
		).toEqual(["Finished", "Left behind", "Hours played"]);
		expect(spokenNumbers(element)).toEqual(["0", "0", "0"]);
	});

	it("counts up from zero once the strip enters the screen, staggering the cells", async () => {
		stubBrowser();
		const fixture = await render();
		const element = fixture.nativeElement as HTMLElement;
		expect(visibleNumbers(element)).toEqual([
			"0",
			"0",
			"0",
			"0",
			"0",
			"0",
			"0.0"
		]);

		observerCallback([{ isIntersecting: true }]);
		runFrame(1000 + REWIND_2026_RESULTS_STAGGER_MS);
		fixture.detectChanges();
		const [finishedMidway, , , , , , ratingMidway] =
			visibleNumbers(element);
		expect(Number(finishedMidway)).toBeGreaterThan(0);
		expect(ratingMidway).toBe("0.0");

		runFrame(
			1000 +
				REWIND_2026_RESULTS_DURATION_MS +
				REWIND_2026_RESULTS_STAGGER_MS * 6
		);
		fixture.detectChanges();
		expect(visibleNumbers(element)).toEqual([
			"18",
			"4",
			"23",
			"212.5",
			"2",
			"82",
			"4.3"
		]);
		expect(frames.size).toBe(0);
	});

	it("does not restart when the strip scrolls out and back in, however fast", async () => {
		stubBrowser();
		const fixture = await render();

		observerCallback([{ isIntersecting: true }]);
		observerCallback([{ isIntersecting: true }]);
		runFrame(1000 + REWIND_2026_RESULTS_DURATION_MS * 3);
		observerCallback([{ isIntersecting: false }]);
		observerCallback([{ isIntersecting: true }]);
		fixture.detectChanges();

		expect(frames.size).toBe(0);
		expect(visibleNumbers(fixture.nativeElement as HTMLElement)[0]).toBe(
			"18"
		);
	});

	it("shows the final values without animating when the user prefers reduced motion", async () => {
		reducedMotion = true;
		stubBrowser();
		const fixture = await render();

		observerCallback([{ isIntersecting: true }]);
		runFrame(1000);
		fixture.detectChanges();

		expect(frames.size).toBe(0);
		expect(visibleNumbers(fixture.nativeElement as HTMLElement)).toEqual([
			"18",
			"4",
			"23",
			"212.5",
			"2",
			"82",
			"4.3"
		]);
	});

	it("shows the final values when the browser cannot observe the viewport", async () => {
		stubBrowser({ observer: false });
		const fixture = await render();

		expect(visibleNumbers(fixture.nativeElement as HTMLElement)[3]).toBe(
			"212.5"
		);
	});

	it("speaks the final values in Spanish when the Rewind is in Spanish", async () => {
		reducedMotion = true;
		stubBrowser();
		const element = (await render({ ...totals, hoursPlayed: 313.3 }, "es"))
			.nativeElement as HTMLElement;

		expect(element.querySelector("h2")?.textContent?.trim()).toBe(
			"Resultados"
		);
		expect(visibleNumbers(element)).toContain("313,3");
		expect(spokenNumbers(element)).toEqual([
			"18",
			"4",
			"23",
			"313,3",
			"2",
			"82 %",
			"4,3 de 5"
		]);
	});

	it("keeps up when the totals change while it is counting", async () => {
		stubBrowser();
		const fixture = await render();
		observerCallback([{ isIntersecting: true }]);
		runFrame(1000 + REWIND_2026_RESULTS_STAGGER_MS);

		fixture.componentRef.setInput("totals", {
			...totals,
			averageRating: null,
			finishRate: null
		});
		fixture.detectChanges();
		runFrame(1000 + REWIND_2026_RESULTS_DURATION_MS * 3);
		fixture.detectChanges();

		const element = fixture.nativeElement as HTMLElement;
		expect(element.querySelectorAll("dt")).toHaveLength(5);
		expect(frames.size).toBe(0);
	});

	it("stops the animation when the page is left mid-count", async () => {
		stubBrowser();
		const fixture = await render();
		observerCallback([{ isIntersecting: true }]);

		const countingFrame = nextFrame - 1;
		fixture.destroy();

		expect(cancelAnimationFrame).toHaveBeenCalledWith(countingFrame);
	});
});
