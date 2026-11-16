import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { signal } from "@angular/core";
import {
	type ComponentFixture,
	DeferBlockState,
	TestBed
} from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { screen, within } from "@testing-library/angular";

import {
	type Rewind,
	type RewindAiRecap,
	type RewindFinishedGame,
	type RewindOwnerControls,
	type RewindPremiumStats
} from "../../../../core/models/rewind.model";
import { AuthService } from "../../../../core/services/auth";
import { ToastService } from "../../../../core/services/toast";
import { recapPullQuote } from "./rewind-2025-recap-article/rewind-2025-recap-article";
import { rewindQuarterShelves } from "./rewind-2025-shelves/rewind-2025-shelves";
import {
	COLLAGE_TILES,
	collageCovers,
	RewindDesign2025
} from "./rewind-design-2025";

function finished(
	gameId: string,
	title: string,
	finishedAt: string,
	art: { coverUrl?: string | null; backgroundUrl?: string | null } = {}
): RewindFinishedGame {
	return {
		gameId,
		code: gameId,
		title,
		coverUrl:
			art.coverUrl === undefined
				? `https://img/${gameId}.jpg`
				: art.coverUrl,
		backgroundUrl: art.backgroundUrl ?? null,
		finishedAt,
		platformAbbreviation: "PC"
	};
}

const FINISHED_GAMES: RewindFinishedGame[] = [
	finished("re4", "Resident Evil 4", "2025-11-20T10:00:00.000Z"),
	finished("celeste", "Celeste", "2025-02-14T10:00:00.000Z"),
	finished("hades", "Hades", "2025-01-03T10:00:00.000Z"),
	finished("outer-wilds", "Outer Wilds", "2025-08-09T10:00:00.000Z", {
		coverUrl: null,
		backgroundUrl: "https://img/outer-wilds-bg.jpg"
	})
];

function aiRecap(overrides: Partial<RewindAiRecap> = {}): RewindAiRecap {
	return {
		headline: "Resident Evil was your home",
		summary:
			"You finish what grabs you by the story.\n\nJuly was your cleanup month.",
		insights: [
			{
				kind: "genre-pattern",
				title: "Your best ratings went to games that scared you",
				body: "Survival horror took every top spot."
			},
			{
				kind: "seasonal-rhythm",
				title: "Summer was slow",
				body: "You barely played in June."
			}
		],
		funFact: "You finished Celeste on Valentine's Day.",
		nextYearChallenge: "Finish one game released before 2000.",
		...overrides
	};
}

function premiumStats(): RewindPremiumStats {
	return {
		hoursByMonth: [
			{ month: 1, hours: 20 },
			{ month: 11, hours: 40 }
		],
		tasteVsCritics: [],
		backlogFlow: [],
		genreShare: []
	};
}

function ownerControls(): RewindOwnerControls {
	return {
		includesPrivateRuns: false,
		includesNotes: false,
		regenerationsLeft: 0,
		graceEndsAt: null,
		canRegenerate: false,
		regenerationBlockedBy: "period-closed",
		aiRecapState: "ready",
		periodOpen: false,
		periodStatus: "closed",
		closesAt: null,
		frozenAt: "2026-01-31T00:00:00.000Z"
	};
}

function rewindFixture(overrides: Partial<Rewind> = {}): Rewind {
	return {
		year: 2025,
		persona: "genre-explorer",
		user: { username: "ada", name: "Ada", avatarUrl: null, role: "user" },
		isSpotlight: false,
		otherYears: [],
		totals: {
			finished: 4,
			abandoned: 2,
			started: 7,
			hoursPlayed: 120,
			platinums: 3,
			finishRate: 66,
			averageRating: 4.2,
			genresPlayed: 5,
			platformsPlayed: 2
		},
		finishedGames: FINISHED_GAMES,
		abandonedGames: [],
		highlights: {
			topRated: {
				...FINISHED_GAMES[0],
				userRating: 4.5
			},
			bestRatio: null,
			longest: null,
			fastest: null,
			favoriteGenre: null,
			topPlatform: null,
			busiestMonth: { month: 2, count: 2 },
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
		generatedAt: "2026-01-10T10:00:00.000Z",
		design: "2025",
		frozenAt: "2026-01-31T00:00:00.000Z",
		aiRecap: aiRecap(),
		premiumStats: premiumStats(),
		premiumAccessKind: "gift",
		ownerControls: null,
		premiumAccess: null,
		...overrides
	};
}

describe("RewindDesign2025", () => {
	let fixture: ComponentFixture<RewindDesign2025>;

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
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: AuthService,
					useValue: { isPremium: signal(false) }
				},
				{
					provide: ToastService,
					useValue: {
						pending: vi.fn(),
						error: vi.fn(),
						premium: vi.fn()
					}
				}
			]
		});
	});

	afterEach(() => {
		TestBed.inject(HttpTestingController)
			.match(() => true)
			.forEach(request => request.flush(null));
		vi.unstubAllGlobals();
	});

	async function renderDesign(
		rewind: Rewind,
		options: { isOwner?: boolean; username?: string } = {}
	) {
		fixture = TestBed.createComponent(RewindDesign2025);
		fixture.componentRef.setInput("rewind", rewind);
		fixture.componentRef.setInput("username", options.username ?? "ada");
		fixture.componentRef.setInput("isOwner", options.isOwner ?? false);
		fixture.detectChanges();
		await fixture.whenStable();
		return fixture.nativeElement as HTMLElement;
	}

	async function renderDeferred() {
		for (const block of await fixture.getDeferBlocks())
			await block.render(DeferBlockState.Complete);
		fixture.detectChanges();
	}

	it("draws its own tally, persona and premium stats instead of the shared ones", async () => {
		const root = await renderDesign(rewindFixture());

		expect(root.querySelector("app-rewind-2025-tally")).not.toBeNull();
		expect(
			root.querySelector("app-rewind-2025-persona-rank")
		).not.toBeNull();
		expect(
			root.querySelector("app-rewind-2025-premium-stats")
		).not.toBeNull();
		expect(root.querySelector("app-rewind-tally")).toBeNull();
		expect(root.querySelector("app-rewind-persona-rank")).toBeNull();
		expect(root.querySelector("app-rewind-premium-stats")).toBeNull();
	});

	describe("more of your year", () => {
		const yearMix = {
			lengthMix: [
				{ range: "under-5" as const, count: 2 },
				{ range: "5-15" as const, count: 5 }
			],
			releaseDecades: [{ decade: 2010, count: 4 }],
			gamesWithoutHours: 0,
			gamesWithoutRelease: 0
		};

		it("adds its own section between the premium stats and the shelves", async () => {
			const root = await renderDesign(rewindFixture({ yearMix }));

			const section = screen.getByRole("region", {
				name: "More of your year"
			});
			expect(
				within(section).getByRole("figure", {
					name: "How long were your games?"
				})
			).toBeInTheDocument();
			expect(
				within(section).getByRole("figure", { name: "Release decades" })
			).toBeInTheDocument();
			expect(
				root.querySelector("app-rewind-2025-year-mix")
			).not.toBeNull();
			expect(root.querySelector("app-rewind-year-mix")).toBeNull();
			const order = [
				"app-rewind-2025-premium-stats",
				"app-rewind-2025-year-mix",
				"[aria-labelledby='rewind-2025-finished-heading']"
			].map(selector => root.querySelector(selector)!);
			expect(
				order[0].compareDocumentPosition(order[1]) &
					Node.DOCUMENT_POSITION_FOLLOWING
			).toBeTruthy();
			expect(
				order[1].compareDocumentPosition(order[2]) &
					Node.DOCUMENT_POSITION_FOLLOWING
			).toBeTruthy();
		});

		it("writes the section in Spanish", async () => {
			await renderDesign(rewindFixture({ yearMix, language: "es" }));

			const section = screen.getByRole("region", {
				name: "Más de tu año"
			});
			expect(
				within(section).getByRole("figure", {
					name: "¿Cuánto duraron tus juegos?"
				})
			).toBeInTheDocument();
		});

		it("leaves the section out when there is nothing to chart", async () => {
			const root = await renderDesign(rewindFixture());

			expect(root.querySelector("app-rewind-2025-year-mix")).toBeNull();
			expect(
				screen.queryByRole("region", { name: "More of your year" })
			).toBeNull();
		});

		it("follows a Rewind that gains and loses its mix", async () => {
			const root = await renderDesign(rewindFixture());
			for (const next of [yearMix, rewindFixture().yearMix, yearMix]) {
				fixture.componentRef.setInput(
					"rewind",
					rewindFixture({ yearMix: next })
				);
				fixture.detectChanges();
			}
			await fixture.whenStable();

			expect(
				root.querySelector("app-rewind-2025-year-mix")
			).not.toBeNull();
		});
	});

	it("never shows the backlog chart and keeps the other premium charts", async () => {
		await renderDesign(
			rewindFixture({
				premiumStats: {
					...premiumStats(),
					backlogFlow: [{ month: 3, added: 4, finished: 1 }]
				}
			})
		);

		const section = screen.getByRole("region", { name: "Premium stats" });
		expect(
			within(section).queryByRole("figure", { name: /backlog/i })
		).toBeNull();
		expect(within(section).getAllByRole("figure").length).toBeGreaterThan(
			0
		);
	});

	it("leaves the premium stats out when the backlog chart is the only one with data", async () => {
		const root = await renderDesign(
			rewindFixture({
				premiumStats: {
					hoursByMonth: [],
					tasteVsCritics: [],
					genreShare: [],
					backlogFlow: [{ month: 3, added: 4, finished: 1 }]
				}
			})
		);

		expect(root.querySelector("app-rewind-2025-premium-stats")).toBeNull();
		expect(
			screen.queryByRole("region", { name: "Premium stats" })
		).toBeNull();
	});

	function shelfQuarters(root: HTMLElement): string[] {
		return [...root.querySelectorAll("[data-quarter]")].map(
			shelf => shelf.getAttribute("data-quarter") ?? ""
		);
	}

	it("draws every section of the magazine from a full Rewind", async () => {
		const root = await renderDesign(rewindFixture());

		expect(
			screen.getByRole("heading", {
				level: 1,
				name: "@ada's Rewind 2025"
			})
		).toBeInTheDocument();
		expect(screen.getByText("Genre Explorer")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { level: 2, name: "Results" })
		).toBeInTheDocument();
		expect(screen.getByText("Finished")).toBeInTheDocument();
		expect(screen.getByText("Left behind")).toBeInTheDocument();
		expect(screen.getByText("Hours played")).toBeInTheDocument();
		expect(screen.getByText("Average rating")).toBeInTheDocument();
		expect(screen.queryByText("Platinums")).not.toBeInTheDocument();
		expect(screen.queryByText("Started")).not.toBeInTheDocument();
		expect(screen.queryByText("Finish rate")).not.toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Resident Evil 4" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Resident Evil was your home" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Highlights" })
		).toBeInTheDocument();
		expect(root.querySelector("app-rewind-2025-awards")).not.toBeNull();
		expect(root.querySelector("app-rewind-highlights")).toBeNull();
		expect(
			screen.getByRole("heading", { name: "Premium stats" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Finished in 2025" })
		).toBeInTheDocument();
		expect(
			root
				.querySelector("[data-hero-collage]")
				?.getAttribute("aria-hidden")
		).toBe("true");
		expect(root.querySelectorAll("[data-hero-collage] img")).toHaveLength(
			COLLAGE_TILES
		);
	});

	it("never offers a way to share the Rewind", async () => {
		const root = await renderDesign(
			rewindFixture({ ownerControls: ownerControls() }),
			{ isOwner: true }
		);
		await renderDeferred();

		expect(
			screen.queryByRole("button", { name: /share|compartir/i })
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: /share|compartir/i })
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: /share|compartir/i })
		).not.toBeInTheDocument();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(root.querySelector("app-rewind-share-actions")).toBeNull();
		const requests = TestBed.inject(HttpTestingController).match(request =>
			/story|share|image/i.test(request.url)
		);
		expect(requests).toHaveLength(0);
	});

	it("shelves the finished games by quarter in calendar order and skips empty quarters", async () => {
		const root = await renderDesign(rewindFixture());
		await renderDeferred();

		expect(shelfQuarters(root)).toEqual(["1", "3", "4"]);
		const firstQuarter =
			root.querySelector<HTMLElement>("[data-quarter='1']")!;
		expect(
			within(firstQuarter).getByRole("heading", { level: 3 })
		).toHaveTextContent("Q1");
		expect(within(firstQuarter).getByText("2 games")).toBeInTheDocument();
		const firstQuarterGames = within(firstQuarter)
			.getAllByRole("link")
			.map(link => link.getAttribute("href"));
		expect(firstQuarterGames).toEqual(["/games/hades", "/games/celeste"]);
		const summerShelf =
			root.querySelector<HTMLElement>("[data-quarter='3']")!;
		expect(
			within(summerShelf).getByRole("img", { name: "Outer Wilds" })
		).toHaveAttribute("src", "https://img/outer-wilds-bg.jpg");
	});

	describe("what the player left behind", () => {
		const ABANDONED_GAMES: RewindFinishedGame[] = [
			finished("tunic", "Tunic", "2025-09-30T10:00:00.000Z"),
			finished("inside", "Inside", "2025-01-02T10:00:00.000Z", {
				coverUrl: null,
				backgroundUrl: "https://img/inside-bg.jpg"
			}),
			finished("limbo", "Limbo", "2025-05-05T10:00:00.000Z")
		];

		function leftBehind(root: HTMLElement) {
			return root.querySelector<HTMLElement>("[data-left-behind]");
		}

		it("adds the section after the shelves with the abandoned games by date and keeps them off the shelves", async () => {
			const root = await renderDesign(
				rewindFixture({ abandonedGames: ABANDONED_GAMES })
			);
			await renderDeferred();

			const section = leftBehind(root)!;
			expect(
				within(section).getByRole("heading", {
					level: 2,
					name: "What you left behind"
				})
			).toBeInTheDocument();
			expect(section).toHaveAccessibleDescription(
				"3 games you left halfway this year"
			);
			expect(
				within(section)
					.getAllByRole("link")
					.map(link => link.getAttribute("href"))
			).toEqual(["/games/inside", "/games/limbo", "/games/tunic"]);
			expect(
				within(section).getByRole("link", {
					name: "Limbo, May 5, abandoned"
				})
			).toHaveTextContent("May 5");
			expect(section).not.toHaveTextContent(/abandoned/);
			expect(section.querySelector("[data-abandoned-badge]")).toBeNull();
			for (const poster of section.querySelectorAll("app-game-poster"))
				expect(poster).toHaveClass(
					"grayscale",
					"opacity-60",
					"group-hover:grayscale-0",
					"group-focus-visible:grayscale-0"
				);

			const shelves = root.querySelector("app-rewind-2025-shelves")!;
			expect(
				shelves.compareDocumentPosition(section) &
					Node.DOCUMENT_POSITION_FOLLOWING
			).toBeTruthy();
			const shelvedGames = [...shelves.querySelectorAll("a")].map(link =>
				link.getAttribute("href")
			);
			expect(shelvedGames).toHaveLength(FINISHED_GAMES.length);
			for (const game of ABANDONED_GAMES)
				expect(shelvedGames).not.toContain(`/games/${game.code}`);
			expect(
				screen.getByRole("heading", { name: "Finished in 2025" })
			).toBeInTheDocument();
		});

		it("omits the section when nothing was abandoned", async () => {
			const root = await renderDesign(rewindFixture());
			await renderDeferred();

			expect(leftBehind(root)).toBeNull();
			expect(
				screen.queryByRole("heading", { name: "What you left behind" })
			).not.toBeInTheDocument();
		});

		it("shows the section even in a year without finished games", async () => {
			const root = await renderDesign(
				rewindFixture({
					finishedGames: [],
					highlights: {
						...rewindFixture().highlights,
						topRated: null
					},
					abandonedGames: [ABANDONED_GAMES[0]]
				})
			);
			await renderDeferred();

			expect(root.querySelector("app-rewind-2025-shelves")).toBeNull();
			expect(leftBehind(root)).toHaveAccessibleDescription(
				"1 game you left halfway this year"
			);
		});

		it("writes the section in Spanish", async () => {
			const root = await renderDesign(
				rewindFixture({
					language: "es",
					abandonedGames: ABANDONED_GAMES
				})
			);
			await renderDeferred();

			const section = leftBehind(root)!;
			expect(
				within(section).getByRole("heading", {
					name: "Los que soltaste"
				})
			).toBeInTheDocument();
			expect(section).toHaveAccessibleDescription(
				"3 juegos que dejaste a medias este año"
			);
			expect(
				within(section).getByRole("link", {
					name: /^Tunic, 30 sept?\.?, abandonado$/
				})
			).toBeInTheDocument();
		});

		it("follows a Rewind that gains and loses its abandoned games", async () => {
			const root = await renderDesign(rewindFixture());
			for (const abandonedGames of [
				ABANDONED_GAMES,
				[],
				ABANDONED_GAMES.slice(1)
			]) {
				fixture.componentRef.setInput(
					"rewind",
					rewindFixture({ abandonedGames })
				);
				fixture.detectChanges();
			}
			await renderDeferred();

			expect(within(leftBehind(root)!).getAllByRole("link")).toHaveLength(
				2
			);
		});
	});

	it("features the best rated game as the cover of the year", async () => {
		await renderDesign(rewindFixture());

		const cover = screen.getByRole("article", { name: "Resident Evil 4" });
		expect(
			within(cover).getByText("Cover of the year")
		).toBeInTheDocument();
		expect(
			within(cover).getByRole("link", { name: "Resident Evil 4" })
		).toHaveAttribute("href", "/games/re4");
		expect(
			within(cover).getByText(
				"Your highest rating of the year, 4.5 out of 5. Finished on Nov 20."
			)
		).toBeInTheDocument();
	});

	it("lays the AI recap out as a two column article with a pull quote", async () => {
		const root = await renderDesign(rewindFixture());

		const article = screen.getByRole("article", {
			name: "Resident Evil was your home"
		});
		const body = article.querySelector<HTMLElement>("[data-recap-body]")!;
		expect(body.className).toContain("@3xl/page:columns-2");
		expect(body.className).toContain("columns-1");
		expect(
			within(body).getByText("You finish what grabs you by the story.")
		).toBeInTheDocument();
		expect(
			within(body).getByText("July was your cleanup month.")
		).toBeInTheDocument();
		const quote = body.querySelector("[data-pull-quote]")!;
		expect(quote).toHaveAttribute("aria-hidden", "true");
		expect(quote).toHaveTextContent(
			"Your best ratings went to games that scared you"
		);
		expect(
			within(body)
				.getAllByRole("heading", { level: 4 })
				.map(h => h.textContent?.trim())
		).toEqual([
			"Your best ratings went to games that scared you",
			"Summer was slow"
		]);
		expect(
			within(article).getByText("Your 2026 challenge")
		).toBeInTheDocument();
		expect(
			within(article).getByText(
				"You finished Celeste on Valentine's Day."
			)
		).toBeInTheDocument();
		expect(
			within(article).getByRole("button", { name: "Gift" })
		).toBeInTheDocument();
		expect(root.querySelector("app-rewind-ai-recap")).toBeNull();
	});

	it("shows the owner panel only when the Rewind carries owner controls", async () => {
		const visitorRoot = await renderDesign(rewindFixture());
		expect(visitorRoot.querySelector("app-rewind-owner-panel")).toBeNull();
		expect(
			screen.getByRole("heading", {
				level: 1,
				name: "@ada's Rewind 2025"
			})
		).toBeInTheDocument();

		fixture.destroy();
		const ownerRoot = await renderDesign(
			rewindFixture({ ownerControls: ownerControls() }),
			{ isOwner: true }
		);
		expect(
			ownerRoot.querySelector("app-rewind-owner-panel")
		).not.toBeNull();
		expect(
			screen.getByRole("heading", { level: 1, name: "Your Rewind 2025" })
		).toBeInTheDocument();
	});

	it("writes the Rewind content in Spanish while the app chrome stays in English", async () => {
		const root = await renderDesign(
			rewindFixture({
				language: "es",
				ownerControls: ownerControls(),
				otherYears: [2026]
			}),
			{ isOwner: true }
		);
		await renderDeferred();

		expect(
			screen.getByRole("heading", { level: 1, name: "Tu Rewind 2025" })
		).toBeInTheDocument();
		expect(screen.getByText("Explorador de géneros")).toBeInTheDocument();
		expect(screen.getByText("La portada del año")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Tu nota más alta del año, 4,5 de 5. Terminado el 20 de noviembre."
			)
		).toBeInTheDocument();
		expect(screen.getByText("Resumen con IA")).toBeInTheDocument();
		expect(screen.getByText("Tu reto para 2026")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Terminados en 2025" })
		).toBeInTheDocument();
		expect(
			within(
				root.querySelector<HTMLElement>("[data-quarter='1']")!
			).getByText("2 juegos")
		).toBeInTheDocument();
		expect(screen.getByText("T1")).toBeInTheDocument();
		expect(screen.getByText("Abandonados")).toBeInTheDocument();
		expect(screen.getByText("Only you")).toBeInTheDocument();
	});

	it("leaves out every section whose data is missing", async () => {
		const root = await renderDesign(
			rewindFixture({
				finishedGames: [],
				aiRecap: null,
				premiumStats: null,
				totals: {
					finished: 0,
					abandoned: 1,
					started: 1,
					hoursPlayed: 0,
					platinums: null,
					finishRate: null,
					averageRating: null,
					genresPlayed: 0,
					platformsPlayed: 0
				},
				highlights: {
					...rewindFixture().highlights,
					topRated: null,
					busiestMonth: null
				}
			})
		);
		await renderDeferred();

		expect(
			screen.getByRole("heading", { level: 1, name: /2025/ })
		).toBeInTheDocument();
		expect(screen.queryByText("Average rating")).not.toBeInTheDocument();
		expect(root.querySelector("[data-hero-collage]")).toBeNull();
		expect(screen.queryByText("Cover of the year")).not.toBeInTheDocument();
		expect(root.querySelector("app-rewind-2025-recap-article")).toBeNull();
		expect(root.querySelector("app-rewind-2025-premium-stats")).toBeNull();
		expect(
			screen.queryByRole("heading", { name: "Highlights" })
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "Finished in 2025" })
		).not.toBeInTheDocument();
		expect(shelfQuarters(root)).toEqual([]);
	});

	it("drops the highlights when the cover of the year is all there is", async () => {
		const root = await renderDesign(
			rewindFixture({
				highlights: {
					...rewindFixture().highlights,
					busiestMonth: null
				}
			})
		);

		expect(screen.getByText("Cover of the year")).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "Highlights" })
		).not.toBeInTheDocument();
		expect(root.querySelector("app-rewind-2025-awards")).toBeNull();
	});

	it("hides premium stats that come back with no chart to draw", async () => {
		const root = await renderDesign(
			rewindFixture({
				premiumStats: {
					hoursByMonth: [{ month: 3, hours: 0 }],
					tasteVsCritics: [],
					backlogFlow: [],
					genreShare: []
				}
			})
		);

		expect(root.querySelector("app-rewind-2025-premium-stats")).toBeNull();
	});

	it("keeps up with a Rewind that changes many times in a row", async () => {
		const root = await renderDesign(rewindFixture());

		for (const language of ["es", "en", "es"] as const) {
			fixture.componentRef.setInput(
				"rewind",
				rewindFixture({ language, aiRecap: null })
			);
			fixture.detectChanges();
		}
		fixture.componentRef.setInput(
			"rewind",
			rewindFixture({
				language: "en",
				finishedGames: [FINISHED_GAMES[1]],
				highlights: { ...rewindFixture().highlights, topRated: null }
			})
		);
		fixture.detectChanges();
		await renderDeferred();

		expect(
			screen.getByText("Resident Evil was your home")
		).toBeInTheDocument();
		expect(
			screen.queryByText("La portada del año")
		).not.toBeInTheDocument();
		expect(screen.queryByText("Cover of the year")).not.toBeInTheDocument();
		expect(shelfQuarters(root)).toEqual(["1"]);
		expect(root.querySelectorAll("[data-hero-collage] img")).toHaveLength(
			COLLAGE_TILES
		);
	});

	it("passes up the Rewind the owner panel replaces", async () => {
		await renderDesign(rewindFixture({ ownerControls: ownerControls() }), {
			isOwner: true
		});
		const changes: Rewind[] = [];
		fixture.componentInstance.rewindChange.subscribe(change =>
			changes.push(change)
		);
		const replaced = rewindFixture({ language: "es" });

		fixture.componentInstance.rewindChange.emit(replaced);

		expect(changes).toEqual([replaced]);
	});
});

describe("rewindQuarterShelves", () => {
	it("drops games with a broken date instead of breaking the shelves", () => {
		const shelves = rewindQuarterShelves(
			[
				finished("broken", "Broken", "not a date"),
				finished("empty", "Empty", ""),
				finished("hades", "Hades", "2025-12-31T23:59:59.000Z")
			],
			"en"
		);

		expect(shelves.map(shelf => shelf.quarter)).toEqual([4]);
		expect(shelves[0].games.map(game => game.gameId)).toEqual(["hades"]);
	});

	it("keeps every run of a game finished twice in the same quarter", () => {
		const shelves = rewindQuarterShelves(
			[
				finished("hades", "Hades", "2025-03-01T10:00:00.000Z"),
				finished("hades", "Hades", "2025-01-15T10:00:00.000Z")
			],
			"es"
		);

		expect(shelves).toHaveLength(1);
		expect(shelves[0].label).toBe("T1");
		expect(shelves[0].countLabel).toBe("2 juegos");
		expect(shelves[0].games.map(game => game.finishedAt)).toEqual([
			"2025-01-15T10:00:00.000Z",
			"2025-03-01T10:00:00.000Z"
		]);
	});
});

describe("collageCovers", () => {
	it("repeats the few covers there are to fill the collage", () => {
		const covers = collageCovers([FINISHED_GAMES[1], FINISHED_GAMES[2]]);

		expect(covers).toHaveLength(COLLAGE_TILES);
		expect(new Set(covers)).toEqual(
			new Set(["https://img/celeste.jpg", "https://img/hades.jpg"])
		);
	});

	it("draws no collage when no game has art", () => {
		expect(
			collageCovers([
				finished("blank", "Blank", "2025-01-01T00:00:00.000Z", {
					coverUrl: null,
					backgroundUrl: null
				})
			])
		).toEqual([]);
	});
});

describe("recapPullQuote", () => {
	it("falls back to the fun fact when the AI wrote no insight titles", () => {
		expect(
			recapPullQuote(
				aiRecap({
					insights: [
						{ kind: "genre-pattern", title: "   ", body: "x" }
					]
				})
			)
		).toBe("You finished Celeste on Valentine's Day.");
	});

	it("has no pull quote when the AI left both empty", () => {
		expect(
			recapPullQuote(aiRecap({ insights: [], funFact: "" }))
		).toBeNull();
	});
});
