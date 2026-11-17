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
import { render, screen, within } from "@testing-library/angular";

import { type Rewind } from "../../core/models/rewind.model";
import { RewindDesign2025 } from "./components/rewind-design-2025/rewind-design-2025";
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
		abandonedGames: [],
		platinumGames: null,
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
			longestStreak: null,
			classic: null
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
		expect(resolveRewindDesign("2025").component).toBe(RewindDesign2025);
	});

	it("keeps 2026 as the latest design after registering 2025", () => {
		expect(REWIND_DESIGN_REGISTRY.map(design => design.key)).toEqual([
			"2025",
			"2026"
		]);
		expect(LATEST_REWIND_DESIGN.component).toBe(RewindDesign2026);
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

	it("draws a 2025 Rewind with the magazine design and a link-only Share button", async () => {
		const { fixture } = await renderOutlet();
		const host = fixture.componentInstance;

		host.rewind.set(rewindFixture({ year: 2025, design: "2025" }));
		fixture.detectChanges();

		expect(designs(fixture)).toHaveLength(0);
		expect(
			fixture.debugElement.queryAll(By.directive(RewindDesign2025))
		).toHaveLength(1);
		expect(
			screen.getByRole("heading", { level: 1, name: /2025/ })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Share" })
		).not.toHaveAttribute("aria-haspopup");
		expect(
			screen.queryByRole("heading", { name: "Share" })
		).not.toBeInTheDocument();
	});

	describe("the summary under the persona of the 2026 design", () => {
		function heroSummary(sentence: string) {
			return screen.getByText(sentence, { selector: "header p" });
		}

		async function renderWith(overrides: Partial<Rewind>) {
			const result = await renderOutlet();
			result.fixture.componentInstance.rewind.set(
				rewindFixture(overrides)
			);
			result.fixture.detectChanges();
			return result;
		}

		it("tells what was finished, left behind and started, in both languages", async () => {
			const totals = rewindFixture().totals;
			const { fixture } = await renderWith({
				totals: { ...totals, finished: 29, abandoned: 13, started: 0 }
			});
			expect(
				heroSummary("29 games finished and 13 left behind.")
			).toBeInTheDocument();

			fixture.componentInstance.rewind.set(
				rewindFixture({
					language: "es",
					totals: {
						...totals,
						finished: 29,
						abandoned: 13,
						started: 0
					}
				})
			);
			fixture.detectChanges();

			expect(
				heroSummary("29 juegos terminados y 13 abandonados.")
			).toBeInTheDocument();
		});

		it("follows the totals when the Rewind is swapped many times in a row", async () => {
			const totals = rewindFixture().totals;
			const { fixture } = await renderWith({});

			for (const finished of [1, 0, 7, 0, 2]) {
				fixture.componentInstance.rewind.set(
					rewindFixture({
						totals: {
							...totals,
							finished,
							abandoned: 0,
							started: 0
						}
					})
				);
				fixture.detectChanges();
			}

			expect(heroSummary("2 games finished.")).toBeInTheDocument();
			expect(
				screen.queryByText(/7 games finished/)
			).not.toBeInTheDocument();
		});

		it("says the year is empty instead of leaving a blank line", async () => {
			const totals = rewindFixture().totals;
			await renderWith({
				totals: { ...totals, finished: 0, abandoned: 0, started: 0 }
			});

			expect(heroSummary("No games this year.")).toBeInTheDocument();
		});

		it("keeps the summary the same for an owner and a visitor", async () => {
			const { fixture } = await renderOutlet();
			expect(
				heroSummary("3 games finished and 4 started.")
			).toBeVisible();

			fixture.componentInstance.isOwner.set(true);
			fixture.detectChanges();

			expect(
				heroSummary("3 games finished and 4 started.")
			).toBeVisible();
		});
	});

	describe("the platinums section of each design", () => {
		const finished = {
			gameId: "id-hades",
			code: "hades",
			title: "Hades",
			coverUrl: null,
			backgroundUrl: null,
			finishedAt: "2026-03-10",
			platformAbbreviation: "PC",
			isPlatinumRun: false
		};
		const platinumGame = {
			gameId: "id-hades",
			code: "hades",
			title: "Hades",
			coverUrl: null,
			backgroundUrl: null,
			platinumedAt: "2026-04-02",
			platformAbbreviation: "PS5"
		};
		const abandoned = {
			...finished,
			gameId: "id-tunic",
			code: "tunic",
			title: "Tunic"
		};

		async function renderWith(overrides: Partial<Rewind>) {
			const result = await renderOutlet();
			result.fixture.componentInstance.rewind.set(
				rewindFixture(overrides)
			);
			result.fixture.detectChanges();
			return result;
		}

		function isBefore(first: HTMLElement, second: HTMLElement): boolean {
			return !!(
				first.compareDocumentPosition(second) &
				Node.DOCUMENT_POSITION_FOLLOWING
			);
		}

		it.each([
			["2026", "no access", null],
			["2026", "an empty year", []],
			["2025", "no access", null],
			["2025", "an empty year", []]
		])(
			"hides the %s platinums with %s",
			async (design, _case, platinumGames) => {
				await renderWith({
					year: Number(design),
					design,
					finishedGames: [finished],
					platinumGames
				});

				expect(
					screen.queryByRole("heading", { name: /^Platinums$/ })
				).not.toBeInTheDocument();
				expect(
					screen.queryByRole("link", { name: /platinum on/ })
				).not.toBeInTheDocument();
				expect(
					screen.queryByText("Platinums this year")
				).not.toBeInTheDocument();
			}
		);

		it("puts the 2026 platinums inside the highlights grid, in the Rewind language, with no section of their own", async () => {
			const { fixture } = await renderWith({
				platinumGames: [platinumGame],
				highlights: {
					...rewindFixture().highlights,
					firstFinished: finished,
					lastFinished: finished
				}
			});

			const highlights = screen
				.getByRole("heading", { level: 2, name: "Highlights" })
				.closest("section") as HTMLElement;
			expect(
				screen.queryByRole("heading", { name: "Platinums" })
			).not.toBeInTheDocument();
			expect(
				within(highlights).getByRole("link", {
					name: "Hades, platinum on Apr 2"
				})
			).toBeInTheDocument();
			expect(
				within(highlights).getByText("Platinums this year")
			).toBeInTheDocument();

			fixture.componentInstance.rewind.set(
				rewindFixture({ language: "es", platinumGames: [platinumGame] })
			);
			fixture.detectChanges();

			expect(screen.getByText("Platinos del año")).toBeInTheDocument();
		});

		it("puts the 2025 page right after the highlights and before the finished shelves, like the 2026 section", async () => {
			await renderWith({
				year: 2025,
				design: "2025",
				finishedGames: [finished],
				abandonedGames: [abandoned],
				platinumGames: [platinumGame],
				highlights: {
					...rewindFixture().highlights,
					firstFinished: finished,
					lastFinished: finished
				}
			});

			const heading = screen.getByRole("heading", {
				level: 2,
				name: "Platinums"
			});
			expect(
				isBefore(
					screen.getByRole("heading", {
						level: 2,
						name: "Highlights"
					}),
					heading
				)
			).toBe(true);
			expect(
				isBefore(
					heading,
					screen.getByRole("heading", { name: "Finished in 2025" })
				)
			).toBe(true);
			expect(
				isBefore(
					heading,
					screen.getByRole("heading", {
						name: "What you left behind"
					})
				)
			).toBe(true);
			expect(
				screen.getByRole("link", { name: "Hades, platinum on Apr 2" })
			).toBeInTheDocument();
		});

		it("shows and hides the section as the viewer's access flips back and forth", async () => {
			const { fixture } = await renderWith({});

			for (const platinumGames of [
				[platinumGame],
				null,
				[],
				[platinumGame],
				null
			]) {
				fixture.componentInstance.rewind.set(
					rewindFixture({ platinumGames })
				);
				fixture.detectChanges();
			}

			expect(
				screen.queryByRole("heading", { name: "Platinums" })
			).not.toBeInTheDocument();
		});
	});

	describe("the closed games of the 2026 design", () => {
		const hades = {
			gameId: "id-hades",
			code: "hades",
			title: "Hades",
			coverUrl: null,
			backgroundUrl: null,
			finishedAt: "2026-03-10",
			platformAbbreviation: "PC",
			isPlatinumRun: false
		};
		const tunic = {
			...hades,
			gameId: "id-tunic",
			code: "tunic",
			title: "Tunic"
		};

		async function renderWith(overrides: Partial<Rewind>) {
			const result = await renderOutlet();
			result.fixture.componentInstance.rewind.set(
				rewindFixture(overrides)
			);
			result.fixture.detectChanges();
			return result;
		}

		it("keeps the Finished title when nothing was abandoned", async () => {
			await renderWith({ finishedGames: [hades] });

			expect(
				screen.getByRole("heading", {
					level: 2,
					name: "Finished in 2026"
				})
			).toBeInTheDocument();
			expect(
				screen.queryByRole("heading", { name: /Closed in/ })
			).not.toBeInTheDocument();
		});

		it("calls the section Closed once a game was abandoned, in both languages", async () => {
			const { fixture } = await renderWith({
				finishedGames: [hades],
				abandonedGames: [tunic]
			});
			expect(
				screen.getByRole("heading", {
					level: 2,
					name: "Closed in 2026"
				})
			).toBeInTheDocument();

			fixture.componentInstance.rewind.set(
				rewindFixture({
					language: "es",
					finishedGames: [hades],
					abandonedGames: [tunic]
				})
			);
			fixture.detectChanges();

			expect(
				screen.getByRole("heading", {
					level: 2,
					name: "Cerrados en 2026"
				})
			).toBeInTheDocument();
		});

		it("shows the section for a year with only abandoned games and hides it with none", async () => {
			const { fixture } = await renderWith({ abandonedGames: [tunic] });
			expect(
				screen.getByRole("heading", {
					level: 2,
					name: "Closed in 2026"
				})
			).toBeInTheDocument();

			fixture.componentInstance.rewind.set(rewindFixture());
			fixture.detectChanges();

			expect(
				screen.queryByRole("heading", { name: /in 2026/ })
			).not.toBeInTheDocument();
		});
	});

	it("removes the design when the outlet is destroyed", async () => {
		const { fixture } = await renderOutlet();

		fixture.destroy();

		expect(document.querySelector("app-rewind-design-2026")).toBeNull();
	});
});
