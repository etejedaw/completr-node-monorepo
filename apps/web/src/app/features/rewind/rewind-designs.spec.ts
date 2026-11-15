import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";

import { type Rewind } from "../../core/models/rewind.model";
import { RewindDesign2026 } from "./components/rewind-design-2026/rewind-design-2026";
import { RewindDesignOutlet } from "./components/rewind-design-outlet/rewind-design-outlet";
import {
	LATEST_REWIND_DESIGN,
	resolveRewindDesign,
	REWIND_DESIGN_REGISTRY
} from "./rewind-designs";

function rewindFixture(overrides: Partial<Rewind> = {}): Rewind {
	return {
		year: 2026,
		persona: "finisher",
		user: { username: "ada", name: "Ada", avatarUrl: null, role: "user" },
		isSpotlight: true,
		otherYears: [],
		totals: {
			finished: 3,
			abandoned: 0,
			started: 4,
			hoursPlayed: 40,
			platinums: null,
			finishRate: null,
			averageRating: null,
			genresPlayed: 2,
			platformsPlayed: 1
		},
		finishedGames: [],
		highlights: {
			topRated: null,
			bestRatio: null,
			longest: null,
			fastest: null,
			favoriteGenre: null,
			topPlatform: null,
			busiestMonth: null,
			firstFinished: null,
			lastFinished: null,
			topGenres: [],
			topPlatforms: [],
			longestStreak: null
		},
		yearMix: {
			lengthMix: [],
			releaseDecades: [],
			gamesWithoutHours: 0,
			gamesWithoutRelease: 0
		},
		language: "en",
		generatedAt: "2026-12-02T10:00:00.000Z",
		design: "2026",
		frozenAt: null,
		aiRecap: null,
		premiumStats: null,
		premiumAccessKind: null,
		ownerControls: null,
		premiumAccess: null,
		...overrides
	};
}

@Component({
	imports: [RewindDesignOutlet],
	template: `<app-rewind-design
		[rewind]="rewind()"
		username="ada"
		[isOwner]="isOwner()"
		(rewindChange)="changes.push($event)"
	/>`
})
class Host {
	readonly rewind = signal(rewindFixture());
	readonly isOwner = signal(false);
	readonly changes: Rewind[] = [];
}

describe("rewind design registry", () => {
	it("resolves every registered design by its key", () => {
		for (const design of REWIND_DESIGN_REGISTRY)
			expect(resolveRewindDesign(design.key)).toBe(design);
		expect(resolveRewindDesign("2026").component).toBe(RewindDesign2026);
	});

	it("falls back to the latest design for unknown, empty or missing keys", () => {
		for (const key of ["1999", "", " 2026", "../2026", null, undefined])
			expect(resolveRewindDesign(key)).toBe(LATEST_REWIND_DESIGN);
	});
});

describe("RewindDesignOutlet", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: true,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		vi.stubGlobal(
			"IntersectionObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
	});

	afterEach(() => {
		TestBed.inject(HttpTestingController)
			.match(() => true)
			.forEach(req => req.flush(new Blob()));
		vi.unstubAllGlobals();
	});

	async function renderOutlet() {
		const result = await render(Host, {
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting()
			]
		});
		return result;
	}

	function designs(
		fixture: Awaited<ReturnType<typeof renderOutlet>>["fixture"]
	) {
		return fixture.debugElement.queryAll(By.directive(RewindDesign2026));
	}

	it("draws a Rewind with the design named by the API", async () => {
		const { fixture } = await renderOutlet();

		expect(designs(fixture)).toHaveLength(1);
		expect(
			screen.getByRole("heading", { level: 1, name: /2026/ })
		).toBeInTheDocument();
	});

	it("draws an unknown design with the latest one instead of leaving the page empty", async () => {
		const { fixture } = await renderOutlet();
		const host = fixture.componentInstance;

		host.rewind.set(rewindFixture({ design: "2099" }));
		fixture.detectChanges();

		expect(designs(fixture)).toHaveLength(1);
		expect(
			screen.getByRole("heading", { level: 1, name: /2026/ })
		).toBeInTheDocument();
	});

	it("keeps the same design instance while the Rewind changes many times in a row", async () => {
		const { fixture } = await renderOutlet();
		const host = fixture.componentInstance;
		const first = designs(fixture)[0].componentInstance;

		for (const year of [2025, 2024, 2026]) {
			host.rewind.set(rewindFixture({ year, design: "2026" }));
			host.isOwner.set(year === 2024);
			fixture.detectChanges();
		}
		host.rewind.set(rewindFixture({ design: "unknown" }));
		fixture.detectChanges();

		expect(designs(fixture)).toHaveLength(1);
		expect(designs(fixture)[0].componentInstance).toBe(first);
		expect(
			screen.getByRole("heading", { level: 1, name: /2026/ })
		).toBeInTheDocument();
	});

	it("passes up the Rewind the design replaces", async () => {
		const { fixture } = await renderOutlet();
		const design = designs(fixture)[0]
			.componentInstance as RewindDesign2026;
		const regenerated = rewindFixture({ language: "es" });

		design.rewindChange.emit(regenerated);

		expect(fixture.componentInstance.changes).toEqual([regenerated]);
	});

	it("removes the design when the outlet is destroyed", async () => {
		const { fixture } = await renderOutlet();

		fixture.destroy();

		expect(document.querySelector("app-rewind-design-2026")).toBeNull();
	});
});
