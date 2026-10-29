import { TestBed } from "@angular/core/testing";

import { type RewindTotals } from "../../../../core/models/rewind.model";
import {
	formatTallyValue,
	RewindTally,
	type RewindTallyRow,
	rewindTallyRows,
	TALLY_DURATION_MS,
	TALLY_STAGGER_MS
} from "./rewind-tally";

let rows: RewindTallyRow[];

const baseRows: RewindTallyRow[] = [
	{ label: "Finished", value: 18, tone: "success", unit: "count" },
	{ label: "Hours played", value: 212.5, tone: "playing", unit: "hours" }
];

describe("RewindTally", () => {
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
		const fixture = TestBed.createComponent(RewindTally);
		fixture.componentRef.setInput("rows", rows);
		fixture.detectChanges();
		await fixture.whenStable();
		return fixture;
	}

	function visibleNumbers(element: HTMLElement) {
		return [
			...element.querySelectorAll("dd > span[aria-hidden='true']")
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
		runFrame(1000 + TALLY_STAGGER_MS);
		fixture.detectChanges();
		const [finishedMidway, hoursMidway] = visibleNumbers(element);
		expect(Number(finishedMidway)).toBeGreaterThan(0);
		expect(hoursMidway).toBe("0");

		runFrame(1000 + TALLY_DURATION_MS + TALLY_STAGGER_MS);
		fixture.detectChanges();
		expect(visibleNumbers(element)).toEqual(["18", "212.5"]);
		expect(frames.size).toBe(0);
	});

	it("does not restart when the tally scrolls out and back in", async () => {
		stubBrowser();
		const fixture = await render();

		observerCallback([{ isIntersecting: true }]);
		runFrame(1000 + TALLY_DURATION_MS * 2);
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

	it("counts the finish rate as a percentage and the average rating with stars and one decimal", async () => {
		rows = [
			{ label: "Finish rate", value: 82, tone: "lists", unit: "percent" },
			{ label: "Average rating", value: 4, tone: "brand", unit: "rating" }
		];
		stubBrowser();
		const fixture = await render();
		const element = fixture.nativeElement as HTMLElement;

		expect(visibleNumbers(element)).toEqual(["0%", "0.0"]);
		expect(spokenNumbers(element)).toEqual(["82%", "4.0 out of 5"]);
		expect(element.querySelectorAll("app-star-rating")).toHaveLength(1);

		observerCallback([{ isIntersecting: true }]);
		runFrame(1000 + TALLY_DURATION_MS + TALLY_STAGGER_MS);
		fixture.detectChanges();
		expect(visibleNumbers(element)).toEqual(["82%", "4.0"]);
	});

	it("speaks the final values in Spanish when the Rewind is in Spanish", async () => {
		rows = [
			{
				label: "Horas jugadas",
				value: 313.3,
				tone: "playing",
				unit: "hours"
			},
			{
				label: "Nota promedio",
				value: 4.3,
				tone: "brand",
				unit: "rating"
			}
		];
		stubBrowser();
		reducedMotion = true;
		const fixture = TestBed.createComponent(RewindTally);
		fixture.componentRef.setInput("rows", rows);
		fixture.componentRef.setInput("language", "es");
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;

		expect(visibleNumbers(element)).toEqual(["313,3", "4,3"]);
		expect(spokenNumbers(element)).toEqual(["313,3", "4,3 de 5"]);
	});

	it("paints each row with its own colour token", async () => {
		stubBrowser();
		const fixture = await render();
		const tones = [
			...(
				fixture.nativeElement as HTMLElement
			).querySelectorAll<HTMLElement>("dl > div")
		].map(row => row.style.getPropertyValue("--tone"));

		expect(tones).toEqual(["var(--color-success)", "var(--color-playing)"]);
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

describe("rewindTallyRows", () => {
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

	const labels = (rows: RewindTallyRow[]) => rows.map(row => row.label);

	it("lists every row in order when all of them have a value", () => {
		expect(labels(rewindTallyRows(totals))).toEqual([
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
			rewindTallyRows(totals).map(row => [row.tone, row.unit])
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

	it("hides Finish rate and Average rating when there is nothing to rate", () => {
		expect(
			labels(
				rewindTallyRows({
					...totals,
					finishRate: null,
					averageRating: null
				})
			)
		).not.toEqual(expect.arrayContaining(["Finish rate"]));
		expect(
			labels(rewindTallyRows({ ...totals, averageRating: null }))
		).not.toContain("Average rating");
	});

	it("keeps a 0% finish rate, which is still a result", () => {
		expect(labels(rewindTallyRows({ ...totals, finishRate: 0 }))).toContain(
			"Finish rate"
		);
	});

	it("hides Started and Platinums when they are zero", () => {
		expect(
			labels(rewindTallyRows({ ...totals, started: 0, platinums: 0 }))
		).toEqual([
			"Finished",
			"Left behind",
			"Hours played",
			"Finish rate",
			"Average rating"
		]);
	});

	it("hides Platinums when the viewer cannot see them", () => {
		expect(
			labels(rewindTallyRows({ ...totals, platinums: null }))
		).not.toContain("Platinums");
	});

	it("keeps Finished, Left behind and Hours played even at zero", () => {
		const rows = rewindTallyRows({
			finished: 0,
			abandoned: 0,
			started: 3,
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
			["Started", 3],
			["Hours played", 0]
		]);
	});
});

describe("formatTallyValue", () => {
	it("formats each unit", () => {
		expect(formatTallyValue("count", 18)).toBe("18");
		expect(formatTallyValue("hours", 212.5)).toBe("212.5");
		expect(formatTallyValue("percent", 100)).toBe("100%");
		expect(formatTallyValue("rating", 5)).toBe("5.0");
		expect(formatTallyValue("rating", 3.5)).toBe("3.5");
	});

	it("formats each unit in Spanish", () => {
		expect(formatTallyValue("hours", 313.3, "es")).toBe("313,3");
		expect(formatTallyValue("percent", 82, "es")).toBe("82\u00a0%");
		expect(formatTallyValue("rating", 4, "es")).toBe("4,0");
	});
});

describe("rewindTallyRows in Spanish", () => {
	it("labels every row in Spanish", () => {
		expect(
			rewindTallyRows(
				{
					finished: 18,
					abandoned: 4,
					started: 23,
					hoursPlayed: 313.3,
					platinums: 2,
					finishRate: 82,
					averageRating: 4.3,
					genresPlayed: 6,
					platformsPlayed: 2
				},
				"es"
			).map(row => row.label)
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
