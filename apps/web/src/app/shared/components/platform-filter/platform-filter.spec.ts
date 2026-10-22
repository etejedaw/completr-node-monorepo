import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { ViewportService } from "../../../core/services/viewport";
import {
	ANY_PLATFORM_ID,
	countByPlatform,
	matchesPlatform,
	PlatformFilter
} from "./platform-filter";

interface Item {
	platform: { id: string; abbreviation: string } | null;
}

const ps5 = { id: "ps5", abbreviation: "PS5" };
const pc = { id: "pc", abbreviation: "PC" };

describe("countByPlatform", () => {
	it("counts items per platform sorted by count descending", () => {
		const items: Item[] = [
			{ platform: pc },
			{ platform: ps5 },
			{ platform: ps5 }
		];

		expect(countByPlatform(items, item => item.platform)).toEqual([
			{ id: "ps5", label: "PS5", count: 2 },
			{ id: "pc", label: "PC", count: 1 }
		]);
	});

	it("groups items without platform under Any platform", () => {
		const items: Item[] = [{ platform: null }, { platform: null }];

		expect(countByPlatform(items, item => item.platform)).toEqual([
			{ id: ANY_PLATFORM_ID, label: "Any platform", count: 2 }
		]);
	});

	it("returns an empty list for no items", () => {
		expect(countByPlatform([], () => null)).toEqual([]);
	});
});

describe("matchesPlatform", () => {
	it("matches everything when nothing is selected", () => {
		expect(matchesPlatform(ps5, "")).toBe(true);
		expect(matchesPlatform(null, "")).toBe(true);
	});

	it("matches by platform id", () => {
		expect(matchesPlatform(ps5, "ps5")).toBe(true);
		expect(matchesPlatform(pc, "ps5")).toBe(false);
	});

	it("matches a missing platform only with the any id", () => {
		expect(matchesPlatform(null, ANY_PLATFORM_ID)).toBe(true);
		expect(matchesPlatform(undefined, "ps5")).toBe(false);
	});
});

describe("PlatformFilter", () => {
	function render(selected = "") {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				{
					provide: ViewportService,
					useValue: { isMobile: signal(false) }
				}
			]
		});
		const fixture = TestBed.createComponent(PlatformFilter);
		fixture.componentRef.setInput("platforms", [
			{ id: "ps5", label: "PS5", count: 4 },
			{ id: "pc", label: "PC", count: 2 }
		]);
		fixture.componentRef.setInput("total", 6);
		fixture.componentRef.setInput("selected", selected);
		fixture.detectChanges();
		return fixture;
	}

	function pills(fixture: ReturnType<typeof render>) {
		return Array.from(
			(fixture.nativeElement as HTMLElement).querySelectorAll(
				"nav button"
			)
		) as HTMLButtonElement[];
	}

	it("renders an All pill with the total followed by each platform", () => {
		const fixture = render();

		expect(
			pills(fixture).map(pill =>
				pill.textContent?.replace(/\s+/g, " ").trim()
			)
		).toEqual(["All 6", "PS5 4", "PC 2"]);
	});

	it("presses the selected pill", () => {
		const fixture = render("pc");

		expect(pills(fixture).map(p => p.getAttribute("aria-pressed"))).toEqual(
			["false", "false", "true"]
		);
	});

	it("updates the selection when a pill is clicked", () => {
		const fixture = render();

		pills(fixture)[1].click();
		fixture.detectChanges();

		expect(fixture.componentInstance.selected()).toBe("ps5");
		expect(pills(fixture)[1].getAttribute("aria-pressed")).toBe("true");
	});

	it("feeds the mobile picker with the same options", () => {
		const fixture = render("ps5");
		const trigger = (fixture.nativeElement as HTMLElement).querySelector(
			"app-option-picker button"
		);

		expect(trigger?.getAttribute("aria-label")).toBe("Platform: PS5");
	});
});
