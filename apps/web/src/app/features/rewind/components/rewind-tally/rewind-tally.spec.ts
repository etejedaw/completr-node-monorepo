import { TestBed } from "@angular/core/testing";

import {
	RewindTally,
	type RewindTallyRow,
	TALLY_DURATION_MS,
	TALLY_STAGGER_MS
} from "./rewind-tally";

const rows: RewindTallyRow[] = [
	{ label: "Finished", value: 18, tone: "success" },
	{ label: "Hours played", value: 212.5, tone: "neutral" }
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
		return [...element.querySelectorAll("dd [aria-hidden='true']")].map(
			node => node.textContent?.trim()
		);
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

	it("stops the animation when the page is left mid-count", async () => {
		stubBrowser();
		const fixture = await render();
		observerCallback([{ isIntersecting: true }]);

		const countingFrame = nextFrame - 1;

		fixture.destroy();

		expect(cancelAnimationFrame).toHaveBeenCalledWith(countingFrame);
	});
});
