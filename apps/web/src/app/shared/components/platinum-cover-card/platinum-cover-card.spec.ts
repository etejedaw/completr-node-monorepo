import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { type PlatinumEntry } from "../../../core/models";
import { PlatinumCoverCard } from "./platinum-cover-card";

function buildPlatinum(overrides: Partial<PlatinumEntry> = {}): PlatinumEntry {
	return {
		id: "p1",
		backlogId: null,
		platformId: "ps5",
		platinumedAt: "2026-03-12",
		platform: { id: "ps5", name: "PlayStation 5", abbreviation: "PS5" },
		game: { id: "g1", code: "astro-bot", title: "Astro Bot", isDlc: false },
		...overrides
	};
}

describe("PlatinumCoverCard", () => {
	function render(platinum: PlatinumEntry) {
		const fixture = TestBed.createComponent(PlatinumCoverCard);
		fixture.componentRef.setInput("platinum", platinum);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [PlatinumCoverCard],
			providers: [provideRouter([])]
		});
	});

	it("links the cover to the game and names it after the title", () => {
		const element = render(buildPlatinum());

		const cover = element.querySelector('a[aria-label="Astro Bot"]');
		expect(cover?.getAttribute("href")).toBe("/games/astro-bot");
	});

	it("shows the platform abbreviation with its full name and the platinum date", () => {
		const element = render(buildPlatinum());

		const platform = element.querySelector('[title="PlayStation 5"]');
		expect(platform?.textContent?.trim()).toBe("PS5");
		const date = element.querySelector("time");
		expect(date?.getAttribute("datetime")).toBe("2026-03-12");
		expect(date?.textContent?.trim()).toBe("Mar 12, 2026");
	});

	it("omits the platform and the date when the platinum has none", () => {
		const element = render(
			buildPlatinum({
				platform: null,
				platformId: null,
				platinumedAt: null
			})
		);

		expect(element.querySelector("[title]")).toBeNull();
		expect(element.querySelector("time")).toBeNull();
	});

	it("keeps the trophy medallion decorative", () => {
		const element = render(buildPlatinum());

		const trophy = [...element.querySelectorAll(".material-icons")].find(
			icon => icon.textContent?.trim() === "emoji_events"
		);
		expect(trophy?.closest('[aria-hidden="true"]')).not.toBeNull();
	});
});
