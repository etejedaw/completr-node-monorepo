import { TestBed } from "@angular/core/testing";

import {
	ODOMETER_STAGGER_MS,
	odometerReels,
	RewindYearOdometer
} from "./rewind-year-odometer";

describe("odometerReels", () => {
	it("rolls every digit from last year's to this year's, with at least one full turn", () => {
		const reels = odometerReels(2026);

		expect(reels.map(reel => reel.digits[0])).toEqual([2, 0, 2, 5]);
		expect(reels.map(reel => reel.digits.at(-1))).toEqual([2, 0, 2, 6]);
		expect(reels.map(reel => reel.digits.length)).toEqual([11, 11, 11, 12]);
	});

	it("carries across every column when the decade changes", () => {
		const reels = odometerReels(2030);

		expect(reels.map(reel => reel.digits[0])).toEqual([2, 0, 2, 9]);
		expect(reels.map(reel => reel.digits.at(-1))).toEqual([2, 0, 3, 0]);
		expect(reels[3].digits.slice(0, 3)).toEqual([9, 0, 1]);
	});

	it("works at the lower edge of the allowed years", () => {
		const reels = odometerReels(2000);

		expect(reels.map(reel => reel.digits[0])).toEqual([1, 9, 9, 9]);
		expect(reels.map(reel => reel.digits.at(-1))).toEqual([2, 0, 0, 0]);
	});

	it("staggers the reels left to right and spreads the colour fill across them", () => {
		const reels = odometerReels(2026);

		expect(reels.map(reel => reel.delayMs)).toEqual([
			0,
			ODOMETER_STAGGER_MS,
			ODOMETER_STAGGER_MS * 2,
			ODOMETER_STAGGER_MS * 3
		]);
		expect(reels.map(reel => reel.fillPosition)).toEqual([
			"0%",
			"33.33333333333333%",
			"66.66666666666666%",
			"100%"
		]);
	});

	it("keys the reels by year so a new year rebuilds them instead of reusing the old ones", () => {
		expect(odometerReels(2026)[0].key).not.toBe(odometerReels(2025)[0].key);
	});
});

describe("RewindYearOdometer", () => {
	function render(year: number) {
		const fixture = TestBed.createComponent(RewindYearOdometer);
		fixture.componentRef.setInput("year", year);
		fixture.detectChanges();
		return fixture;
	}

	function landedDigits(element: HTMLElement) {
		return [...element.querySelectorAll(":scope > span")].map(reel => {
			const strip = reel.firstElementChild as HTMLElement;
			const steps = Number(strip.style.getPropertyValue("--reel-steps"));
			return strip.children[steps]?.textContent?.trim();
		});
	}

	it("is hidden from assistive tech and parks each reel on the year's digit", () => {
		const fixture = render(2026);
		const element = fixture.nativeElement as HTMLElement;

		expect(element.getAttribute("aria-hidden")).toBe("true");
		expect(landedDigits(element)).toEqual(["2", "0", "2", "6"]);
	});

	it("replaces the reels when the year changes mid-roll", () => {
		const fixture = render(2026);
		const element = fixture.nativeElement as HTMLElement;
		const firstReel = element.querySelector(":scope > span");

		fixture.componentRef.setInput("year", 2024);
		fixture.detectChanges();

		expect(element.querySelector(":scope > span")).not.toBe(firstReel);
		expect(landedDigits(element)).toEqual(["2", "0", "2", "4"]);
		expect(element.querySelectorAll(":scope > span")).toHaveLength(4);
	});
});
