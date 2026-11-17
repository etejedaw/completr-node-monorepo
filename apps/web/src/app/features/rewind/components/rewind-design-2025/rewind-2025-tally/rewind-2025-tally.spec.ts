import { TestBed } from "@angular/core/testing";

import { type RewindTotals } from "../../../../../core/models/rewind.model";
import {
	formatRewind2025TallyValue,
	REWIND_2025_TALLY_DURATION_MS,
	REWIND_2025_TALLY_STAGGER_MS,
	Rewind2025Tally,
	rewind2025TallyRows
} from "./rewind-2025-tally";
import { type Rewind2025TallyRow } from "./rewind-2025-tally.model";

let rows: Rewind2025TallyRow[];

const baseRows: Rewind2025TallyRow[] = [
	{ label: "Finished", value: 18, unit: "count" },
	{ label: "Hours played", value: 212.5, unit: "hours" }
];

describe("Rewind2025Tally", () => {
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

	async function render() {
		const fixture = TestBed.createComponent(Rewind2025Tally);
		fixture.componentRef.setInput("rows", rows);
		fixture.detectChanges();
		await fixture.whenStable();
		return fixture;
	}

	function visibleNumbers(element: HTMLElement) {
		return [
			...element.querySelectorAll(
				"dd > span > span[aria-hidden='true']:first-child"
			)
		].map(node => node.textContent?.trim());
	}

	function spokenNumbers(element: HTMLElement) {
		return [...element.querySelectorAll("dd .sr-only")].map(node =>
			node.textContent?.trim()
		);
	}

	beforeEach(() => {
		rows = baseRows;
		reducedMotion = false;
		vi.spyOn(performance, "now").mockReturnValue(1000);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("labels each number and always gives assistive tech the final value", async () => {
		stubBrowser();
		const fixture = await render();
		const element = fixture.nativeElement as HTMLElement;

		expect(
			[...element.querySelectorAll("dt")].map(dt =>
				dt.textContent?.trim()
			)
		).toEqual(["Finished", "Hours played"]);
		expect(spokenNumbers(element)).toEqual(["18", "212.5"]);
	});

	it("counts up from zero once the tally enters the screen, staggering rows", async () => {
		stubBrowser();
		const fixture = await render();
		const element = fixture.nativeElement as HTMLElement;
		expect(visibleNumbers(element)).toEqual(["0", "0"]);

		observerCallback([{ isIntersecting: true }]);
		runFrame(1000 + REWIND_2025_TALLY_STAGGER_MS);
		fixture.detectChanges();
		const [finishedMidway, hoursMidway] = visibleNumbers(element);
		expect(Number(finishedMidway)).toBeGreaterThan(0);
		expect(hoursMidway).toBe("0");

		runFrame(
			1000 + REWIND_2025_TALLY_DURATION_MS + REWIND_2025_TALLY_STAGGER_MS
		);
		fixture.detectChanges();
		expect(visibleNumbers(element)).toEqual(["18", "212.5"]);
		expect(frames.size).toBe(0);
	});

	it("does not restart when the tally scrolls out and back in", async () => {
		stubBrowser();
		const fixture = await render();

		observerCallback([{ isIntersecting: true }]);
		runFrame(1000 + REWIND_2025_TALLY_DURATION_MS * 2);
		observerCallback([{ isIntersecting: false }]);
		observerCallback([{ isIntersecting: true }]);
		fixture.detectChanges();

		expect(frames.size).toBe(0);
		expect(visibleNumbers(fixture.nativeElement as HTMLElement)).toEqual([
			"18",
			"212.5"
		]);
	});

	it("shows the final values without animating when the user prefers reduced motion", async () => {
		reducedMotion = true;
		stubBrowser();
		const fixture = await render();

		observerCallback([{ isIntersecting: true }]);
		runFrame(1000);
		fixture.detectChanges();

		expect(visibleNumbers(fixture.nativeElement as HTMLElement)).toEqual([
			"18",
			"212.5"
		]);
	});

	it("shows the final values when the browser cannot observe the viewport", async () => {
		stubBrowser({ observer: false });
		const fixture = await render();

		expect(visibleNumbers(fixture.nativeElement as HTMLElement)).toEqual([
			"18",
			"212.5"
		]);
	});

	it("counts the average rating with stars and one decimal", async () => {
		rows = [
			{ label: "Finished", value: 7, unit: "count" },
			{ label: "Average rating", value: 4, unit: "rating" }
		];
		stubBrowser();
		const fixture = await render();
		const element = fixture.nativeElement as HTMLElement;

		expect(visibleNumbers(element)).toEqual(["0", "0.0"]);
		expect(spokenNumbers(element)).toEqual(["7", "4.0 out of 5"]);
		expect(element.querySelectorAll("app-star-rating")).toHaveLength(1);

		observerCallback([{ isIntersecting: true }]);
		runFrame(
			1000 + REWIND_2025_TALLY_DURATION_MS + REWIND_2025_TALLY_STAGGER_MS
		);
		fixture.detectChanges();
		expect(visibleNumbers(element)).toEqual(["7", "4.0"]);
	});

	it("speaks the final values in Spanish when the Rewind is in Spanish", async () => {
		rows = [
			{
				label: "Horas jugadas",
				value: 313.3,
				unit: "hours"
			},
			{
				label: "Nota promedio",
				value: 4.3,
				unit: "rating"
			}
		];
		stubBrowser();
		reducedMotion = true;
		const fixture = TestBed.createComponent(Rewind2025Tally);
		fixture.componentRef.setInput("rows", rows);
		fixture.componentRef.setInput("language", "es");
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;

		expect(visibleNumbers(element)).toEqual(["313,3", "4,3"]);
		expect(spokenNumbers(element)).toEqual(["313,3", "4,3 de 5"]);
	});

	it("draws the results as one band with the unit beside hours and rating, hidden from assistive tech", async () => {
		rows = [
			...baseRows,
			{ label: "Average rating", value: 3.7, unit: "rating" }
		];
		stubBrowser();
		reducedMotion = true;
		const fixture = await render();
		const element = fixture.nativeElement as HTMLElement;

		const cells = [...element.querySelectorAll<HTMLElement>("dl > div")];
		expect(cells).toHaveLength(3);
		const units = cells.map(cell =>
			[...cell.querySelectorAll("dd > span > span")]
				.slice(1)
				.map(unit => [
					unit.textContent?.trim(),
					unit.getAttribute("aria-hidden")
				])
		);
		expect(units).toEqual([[], [["h", "true"]], [["/5", "true"]]]);
		expect(spokenNumbers(element)).toEqual(["18", "212.5", "3.7 out of 5"]);
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

describe("rewind2025TallyRows", () => {
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

	const labels = (rows: Rewind2025TallyRow[]) => rows.map(row => row.label);

	it("shows only the four results of the 2025 magazine, whatever else the totals carry", () => {
		expect(labels(rewind2025TallyRows(totals))).toEqual([
			"Finished",
			"Left behind",
			"Hours played",
			"Average rating"
		]);
	});

	it("gives every row its unit", () => {
		expect(rewind2025TallyRows(totals).map(row => row.unit)).toEqual([
			"count",
			"count",
			"hours",
			"rating"
		]);
	});

	it("hides Average rating when there is nothing to rate", () => {
		expect(
			labels(rewind2025TallyRows({ ...totals, averageRating: null }))
		).toEqual(["Finished", "Left behind", "Hours played"]);
	});

	it("keeps Finished, Left behind and Hours played even at zero", () => {
		const rows = rewind2025TallyRows({
			finished: 0,
			abandoned: 0,
			started: 0,
			hoursPlayed: 0,
			platinums: null,
			finishRate: null,
			averageRating: null,
			genresPlayed: 0,
			platformsPlayed: 0
		});

		expect(rows.map(row => [row.label, row.value])).toEqual([
			["Finished", 0],
			["Left behind", 0],
			["Hours played", 0]
		]);
	});

	it("labels every row in Spanish", () => {
		expect(labels(rewind2025TallyRows(totals, "es"))).toEqual([
			"Terminados",
			"Abandonados",
			"Horas jugadas",
			"Nota promedio"
		]);
	});
});

describe("formatRewind2025TallyValue", () => {
	it("formats each unit", () => {
		expect(formatRewind2025TallyValue("count", 18)).toBe("18");
		expect(formatRewind2025TallyValue("hours", 212.5)).toBe("212.5");
		expect(formatRewind2025TallyValue("rating", 5)).toBe("5.0");
		expect(formatRewind2025TallyValue("rating", 3.5)).toBe("3.5");
	});

	it("formats each unit in Spanish", () => {
		expect(formatRewind2025TallyValue("hours", 313.3, "es")).toBe("313,3");
		expect(formatRewind2025TallyValue("rating", 4, "es")).toBe("4,0");
	});
});
