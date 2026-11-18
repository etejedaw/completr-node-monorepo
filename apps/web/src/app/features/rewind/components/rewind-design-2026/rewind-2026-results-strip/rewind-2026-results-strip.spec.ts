import { TestBed } from "@angular/core/testing";

import {
	type RewindLanguage,
	type RewindTotals
} from "../../../../../core/models/rewind.model";
import {
	formatRewind2026ResultsValue,
	phoneLayoutFor,
	REWIND_2026_RESULTS_DURATION_MS,
	REWIND_2026_RESULTS_STAGGER_MS,
	rewind2026ResultsRows,
	Rewind2026ResultsStrip,
	startsPhoneRow
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

	it("gives every row its unit and no colour of its own", () => {
		const rows = rewind2026ResultsRows(totals);

		expect(rows.map(row => row.unit)).toEqual([
			"count",
			"count",
			"count",
			"hours",
			"count",
			"percent",
			"rating"
		]);
		expect(rows.every(row => !("tone" in row))).toBe(true);
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

describe("phone layout", () => {
	function rowsOfPhoneGrid(count: number) {
		const layout = phoneLayoutFor(count);
		const rows: number[][] = [];
		let current: number[] = [];
		for (let index = 0; index < count; index++) {
			if (layout.hasLead && index === 0) {
				rows.push([0]);
				continue;
			}
			current.push(index);
			if (current.length === layout.columns) {
				rows.push(current);
				current = [];
			}
		}
		if (current.length > 0) rows.push(current);
		return { layout, rows };
	}

	it.each([3, 4, 5, 6, 7])(
		"fills every row of %i cells without leaving one alone",
		count => {
			const { layout, rows } = rowsOfPhoneGrid(count);
			const bodyRows = layout.hasLead ? rows.slice(1) : rows;

			expect(rows.flat()).toHaveLength(count);
			expect(bodyRows.every(row => row.length === layout.columns)).toBe(
				true
			);
			if (!layout.hasLead) expect(rows.length).toBeGreaterThan(0);
		}
	);

	it.each([3, 4, 5, 6, 7])(
		"starts a row, and drops its separator, exactly where %i cells wrap",
		count => {
			const { layout, rows } = rowsOfPhoneGrid(count);
			const starts = [...Array(count).keys()].filter(index =>
				startsPhoneRow(layout, index)
			);

			expect(starts).toEqual(rows.map(row => row[0]));
		}
	);

	it("uses a lead cell only when the cells would otherwise be uneven", () => {
		expect([3, 4, 5, 6, 7].map(count => phoneLayoutFor(count))).toEqual([
			{ columns: 3, hasLead: false },
			{ columns: 2, hasLead: false },
			{ columns: 2, hasLead: true },
			{ columns: 3, hasLead: false },
			{ columns: 3, hasLead: true }
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

	it("paints every number white, with no tone left on any cell", async () => {
		stubBrowser();
		const element = (await render()).nativeElement as HTMLElement;

		const numbers = [...element.querySelectorAll<HTMLElement>("dd")];
		expect(numbers).toHaveLength(7);
		for (const number of numbers) {
			expect(number.classList).toContain("text-fg");
			expect(number.className).not.toContain("--tone");
		}
		for (const cell of element.querySelectorAll<HTMLElement>("dl > div")) {
			expect(cell.style.getPropertyValue("--tone")).toBe("");
		}
	});

	it("keeps the labels at a readable size on a phone", async () => {
		stubBrowser();
		const element = (await render()).nativeElement as HTMLElement;

		for (const label of element.querySelectorAll("dt")) {
			expect(label.classList).toContain("text-sm");
			expect(label.classList).not.toContain("text-xs");
		}
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

	function cellClasses(element: HTMLElement) {
		return [...element.querySelectorAll<HTMLElement>("dl > div")].map(
			cell => cell.className
		);
	}

	it.each([
		[
			3,
			{
				...totals,
				started: 0,
				platinums: null,
				finishRate: null,
				averageRating: null
			}
		],
		[
			4,
			{
				...totals,
				platinums: null,
				finishRate: null,
				averageRating: null
			}
		],
		[5, { ...totals, started: 0, platinums: 0 }],
		[6, { ...totals, platinums: null }],
		[7, totals]
	] as [number, RewindTotals][])(
		"lays %i cells on a phone with no stray separator",
		async (count, value) => {
			reducedMotion = true;
			stubBrowser();
			const element = (await render(value)).nativeElement as HTMLElement;
			const classes = cellClasses(element);
			const layout = phoneLayoutFor(count);
			const dl = element.querySelector("dl")!;

			expect(classes).toHaveLength(count);
			expect(dl.classList).toContain(`grid-cols-${layout.columns}`);
			classes.forEach((className, index) => {
				const hasNoSeparator = className.includes("max-lg:border-l-0");
				expect(hasNoSeparator).toBe(startsPhoneRow(layout, index));
				expect(className.includes("col-span-")).toBe(
					layout.hasLead && index === 0
				);
			});
		}
	);

	it("makes Finished a wide lead cell on a phone when seven figures would leave one alone", async () => {
		reducedMotion = true;
		stubBrowser();
		const element = (await render()).nativeElement as HTMLElement;

		const [lead, second, third] = cellClasses(element);
		expect(lead).toContain("max-lg:col-span-3");
		expect(second).not.toContain("col-span");
		expect(second).toContain("max-lg:border-l-0");
		expect(third).not.toContain("max-lg:border-l-0");
	});

	it("keeps a Rewind with almost nothing in it to a tidy row of three", async () => {
		reducedMotion = true;
		stubBrowser();
		const element = (
			await render({ ...bareTotals, finished: 1, hoursPlayed: 12 })
		).nativeElement as HTMLElement;

		const dl = element.querySelector("dl")!;
		expect(visibleNumbers(element)).toEqual(["1", "0", "12"]);
		expect(dl.classList).toContain("grid-cols-3");
		expect(dl.className).toContain("lg:auto-cols-[minmax(0,12rem)]");
		expect(dl.className).not.toContain("lg:auto-cols-fr");
		expect(
			cellClasses(element).filter(name => name.includes("col-span"))
		).toEqual([]);
	});

	it("changes the phone grid when the number of figures changes", async () => {
		reducedMotion = true;
		stubBrowser();
		const fixture = await render();
		const element = fixture.nativeElement as HTMLElement;
		expect(element.querySelector("dl")!.classList).toContain("grid-cols-3");

		fixture.componentRef.setInput("totals", {
			...totals,
			started: 0,
			platinums: 0
		});
		fixture.detectChanges();

		expect(element.querySelector("dl")!.classList).toContain("grid-cols-2");
		expect(cellClasses(element)[0]).toContain("max-lg:col-span-2");
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
