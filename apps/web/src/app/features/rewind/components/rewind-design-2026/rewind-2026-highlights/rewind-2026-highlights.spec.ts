import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";

import { type RewindHighlights as RewindHighlightsData } from "../../../../../core/models/rewind.model";
import {
	hasRewind2026Highlights,
	Rewind2026Highlights
} from "./rewind-2026-highlights";

const game = (code: string, title: string, finishedAt = "2026-03-04") => ({
	gameId: code,
	code,
	title,
	coverUrl: null,
	backgroundUrl: null,
	finishedAt: `${finishedAt}T00:00:00.000Z`,
	platformAbbreviation: "PS5"
});

const nothing: RewindHighlightsData = {
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
};

const fullHighlights: RewindHighlightsData = {
	topRated: { ...game("florence", "Florence"), userRating: 5 },
	bestRatio: { ...game("celeste", "Celeste"), personalRatio: 4.2 },
	longest: {
		...game("elden-ring", "Elden Ring"),
		hours: 120,
		isEstimate: false
	},
	fastest: { ...game("gris", "Gris"), hours: 3.5, isEstimate: true },
	favoriteGenre: { code: "survival", name: "Survival", count: 7 },
	topPlatform: { name: "PlayStation 5", abbreviation: "PS5", count: 12 },
	busiestMonth: { month: 3, count: 5 },
	firstFinished: game("hades", "Hades", "2026-01-04"),
	lastFinished: game("tunic", "Tunic", "2026-12-28"),
	topGenres: [
		{ code: "survival", name: "Survival", count: 7 },
		{ code: "platformer", name: "Platformer", count: 4 },
		{ code: "puzzle", name: "Puzzle", count: 1 }
	],
	topPlatforms: [
		{ name: "PlayStation 5", abbreviation: "PS5", count: 12 },
		{ name: "Switch", abbreviation: "NS", count: 1 }
	],
	longestStreak: { months: 5, fromMonth: 3, toMonth: 7 },
	classic: { ...game("doom", "Doom", "2026-06-10"), releaseYear: 1993 }
};

const withArt = (code: string) => ({
	backgroundUrl: `https://img.test/${code}-bg.jpg`,
	coverUrl: `https://img.test/${code}.jpg`
});

describe("Rewind2026Highlights", () => {
	async function renderHighlights(
		highlights: RewindHighlightsData,
		language: "en" | "es" = "en"
	) {
		return render(Rewind2026Highlights, {
			inputs: { highlights, language },
			providers: [provideRouter([])]
		});
	}

	const records = () => screen.queryAllByRole("listitem");
	const stats = (container: HTMLElement) =>
		Array.from(container.querySelectorAll("dl > div"));
	const recordOf = (label: string) =>
		screen.getByText(label).closest("li") as HTMLElement;
	const statOf = (label: string) =>
		screen.getByText(label).closest("div") as HTMLElement;

	describe("in English", () => {
		it("shows the six records with a big number, a label and the game as a link", async () => {
			await renderHighlights(fullHighlights);

			expect(records()).toHaveLength(6);
			const expected: [string, string, string, string][] = [
				["Best value", "4.2", "Celeste", "/games/celeste"],
				["Longest", "120 h", "Elden Ring", "/games/elden-ring"],
				["Fastest", "3.5 h est.", "Gris", "/games/gris"],
				["First of the year", "Jan 4", "Hades", "/games/hades"],
				["Last of the year", "Dec 28", "Tunic", "/games/tunic"],
				["The classic", "1993", "Doom", "/games/doom"]
			];
			for (const [label, value, title, href] of expected) {
				const link = within(recordOf(label)).getByRole("link", {
					name: new RegExp(`${label}.*${title}`)
				});
				expect(link).toHaveAttribute("href", href);
				expect(link).toHaveTextContent(value);
			}
		});

		it("reads each record as label, value and game", async () => {
			await renderHighlights(fullHighlights);

			const link = within(recordOf("Longest")).getByRole("link");

			expect(link.textContent?.replace(/\s+/g, " ").trim()).toBe(
				"Longest120 hElden Ring"
			);
			expect(link).toHaveAccessibleName(/Longest.*120 h.*Elden Ring/);
		});

		it("lists the four stats with their detail line", async () => {
			const { container } = await renderHighlights(fullHighlights);

			expect(stats(container)).toHaveLength(4);
			const streak = statOf("Longest streak");
			expect(streak).toHaveTextContent("5 months in a row");
			expect(within(streak).getByText("Mar–Jul")).toHaveAttribute(
				"aria-hidden",
				"true"
			);
			expect(within(streak).getByText("March to July")).toHaveClass(
				"sr-only"
			);
			const month = statOf("Busiest month");
			expect(month).toHaveTextContent("March");
			expect(month).toHaveTextContent("5 games finished");
			const genres = statOf("Top genres");
			expect(genres).toHaveTextContent("Survival");
			expect(
				within(genres).getByText("7 · Platformer 4 · Puzzle 1")
			).toHaveAttribute("aria-hidden", "true");
			expect(
				within(genres).getByText(
					"7 games, Platformer 4 games, Puzzle 1 game"
				)
			).toHaveClass("sr-only");
			const platforms = statOf("Platforms");
			expect(platforms).toHaveTextContent("PlayStation 5");
			expect(within(platforms).getByText("12 · NS 1")).toBeVisible();
			expect(
				within(platforms).getByText("12 runs, Switch 1 run")
			).toHaveClass("sr-only");
		});

		it("never offers Top rated, which has its own section", async () => {
			await renderHighlights(fullHighlights);

			expect(screen.queryByText("Top rated")).not.toBeInTheDocument();
			expect(screen.queryByText("Florence")).not.toBeInTheDocument();
		});

		it("shows a single genre or platform without a detail line of the others", async () => {
			const { container } = await renderHighlights({
				...nothing,
				topGenres: [{ code: "rpg", name: "RPG", count: 1 }],
				topPlatforms: [{ name: "Switch", abbreviation: "NS", count: 2 }]
			});

			expect(statOf("Top genres")).toHaveTextContent("RPG");
			expect(screen.getByText("1 game")).toHaveClass("sr-only");
			expect(screen.getByText("2 runs")).toHaveClass("sr-only");
			expect(stats(container)).toHaveLength(2);
		});
	});

	describe("platform abbreviations", () => {
		it("falls back to the platform name when the abbreviation is blank", async () => {
			await render(Rewind2026Highlights, {
				inputs: {
					highlights: {
						...nothing,
						topPlatforms: [
							{ name: "Steam", abbreviation: "", count: 3 },
							{
								name: "Game Boy Advance",
								abbreviation: "",
								count: 2
							},
							{
								name: "PlayStation Portable",
								abbreviation: "PSP",
								count: 1
							}
						]
					}
				},
				providers: [provideRouter([])]
			});

			expect(
				screen.getByText("3 · Game Boy Advance 2 · PSP 1")
			).toHaveAttribute("aria-hidden", "true");
		});
	});

	describe("in Spanish", () => {
		it("speaks Spanish with Spanish months, dates and decimals", async () => {
			await renderHighlights(fullHighlights, "es");

			expect(
				screen.queryByText("Mejor calificado")
			).not.toBeInTheDocument();
			expect(
				within(recordOf("Mejor ratio")).getByRole("link")
			).toHaveTextContent("4,2");
			expect(
				within(recordOf("El más corto")).getByRole("link")
			).toHaveTextContent("3,5 h aprox.");
			expect(
				within(recordOf("El primero del año")).getByRole("link")
			).toHaveTextContent("4 ene");
			expect(
				within(recordOf("El último del año")).getByRole("link")
			).toHaveTextContent("28 dic");
			expect(
				within(recordOf("El más clásico")).getByRole("link", {
					name: /El más clásico.*1993.*Doom/
				})
			).toHaveAttribute("href", "/games/doom");
			expect(statOf("Mes más intenso")).toHaveTextContent("Marzo");
			expect(statOf("Mes más intenso")).toHaveTextContent(
				"5 juegos terminados"
			);
			expect(statOf("Racha más larga")).toHaveTextContent(
				"5 meses seguidos"
			);
			expect(screen.getByText("Mar–Jul")).toBeInTheDocument();
			expect(screen.getByText("Marzo a julio")).toHaveClass("sr-only");
			expect(statOf("Géneros favoritos")).toBeInTheDocument();
			expect(statOf("Plataformas")).toBeInTheDocument();
			expect(
				screen.getByText("12 partidas, Switch 1 partida")
			).toBeInTheDocument();
		});
	});

	describe("with missing highlights", () => {
		const recordLabels = [
			"Best value",
			"Longest",
			"Fastest",
			"First of the year",
			"Last of the year",
			"The classic"
		];
		const omissions: [string, Partial<RewindHighlightsData>, string][] = [
			["Best value", { bestRatio: null }, "bestRatio"],
			["Longest", { longest: null }, "longest"],
			["Fastest", { fastest: null }, "fastest"],
			["First of the year", { firstFinished: null }, "firstFinished"],
			["Last of the year", { lastFinished: null }, "lastFinished"],
			["The classic", { classic: null }, "classic"]
		];

		it.each(omissions)(
			"omits %s when it is null and keeps the other records",
			async (missing, overrides) => {
				await renderHighlights({ ...fullHighlights, ...overrides });

				expect(screen.queryByText(missing)).not.toBeInTheDocument();
				expect(records()).toHaveLength(5);
				for (const label of recordLabels.filter(l => l !== missing)) {
					expect(screen.getByText(label)).toBeInTheDocument();
				}
				expect(screen.getByText("Longest streak")).toBeInTheDocument();
			}
		);

		const statOmissions: [string, Partial<RewindHighlightsData>][] = [
			["Longest streak", { longestStreak: null }],
			["Busiest month", { busiestMonth: null }],
			["Top genres", { topGenres: [] }],
			["Platforms", { topPlatforms: [] }]
		];

		it.each(statOmissions)(
			"omits the %s stat when it is empty and keeps the other three",
			async (missing, overrides) => {
				const { container } = await renderHighlights({
					...fullHighlights,
					...overrides
				});

				expect(screen.queryByText(missing)).not.toBeInTheDocument();
				expect(stats(container)).toHaveLength(3);
				expect(records()).toHaveLength(6);
			}
		);

		it("renders only the stats row when there are no records", async () => {
			const { container } = await renderHighlights({
				...nothing,
				longestStreak: fullHighlights.longestStreak,
				busiestMonth: fullHighlights.busiestMonth
			});

			expect(container.querySelector("ul")).toBeNull();
			expect(stats(container)).toHaveLength(2);
			expect(container.querySelector("dl")?.className).not.toContain(
				"mt-9"
			);
		});

		it("renders only the records when there are no stats", async () => {
			const { container } = await renderHighlights({
				...nothing,
				bestRatio: fullHighlights.bestRatio,
				classic: fullHighlights.classic
			});

			expect(records()).toHaveLength(2);
			expect(container.querySelector("dl")).toBeNull();
		});

		it("renders nothing at all when no highlight has data", async () => {
			const { container } = await renderHighlights(nothing);

			expect(container.querySelector("ul")).toBeNull();
			expect(container.querySelector("dl")).toBeNull();
			expect(container).toHaveTextContent("");
			expect(hasRewind2026Highlights(nothing)).toBe(false);
			expect(hasRewind2026Highlights(fullHighlights)).toBe(true);
			expect(
				hasRewind2026Highlights({
					...nothing,
					topRated: fullHighlights.topRated
				})
			).toBe(false);
		});

		it("shows the first game only once when it is also the last", async () => {
			await renderHighlights({
				...fullHighlights,
				lastFinished: fullHighlights.firstFinished
			});

			expect(screen.getByText("First of the year")).toBeInTheDocument();
			expect(
				screen.queryByText("Last of the year")
			).not.toBeInTheDocument();
			expect(records()).toHaveLength(5);
		});
	});

	describe("game art", () => {
		it("puts the landscape art behind each record, decorative and tinted down", async () => {
			await renderHighlights({
				...fullHighlights,
				bestRatio: {
					...fullHighlights.bestRatio!,
					...withArt("celeste")
				},
				longest: {
					...fullHighlights.longest!,
					...withArt("elden-ring")
				},
				fastest: { ...fullHighlights.fastest!, ...withArt("gris") },
				firstFinished: {
					...fullHighlights.firstFinished!,
					...withArt("hades")
				},
				lastFinished: {
					...fullHighlights.lastFinished!,
					coverUrl: "https://img.test/tunic.jpg"
				},
				classic: { ...fullHighlights.classic!, ...withArt("doom") }
			});

			const artOf = (label: string) => {
				const image = recordOf(label).querySelector("img")!;
				expect(image).toHaveAttribute("alt", "");
				expect(image).toHaveAttribute("aria-hidden", "true");
				expect(image.className).toContain("opacity-12");
				expect(image.className).toContain("grayscale-40");
				return image.getAttribute("src");
			};

			expect(artOf("Best value")).toBe("https://img.test/celeste-bg.jpg");
			expect(artOf("Longest")).toBe("https://img.test/elden-ring-bg.jpg");
			expect(artOf("Fastest")).toBe("https://img.test/gris-bg.jpg");
			expect(artOf("First of the year")).toBe(
				"https://img.test/hades-bg.jpg"
			);
			expect(artOf("Last of the year")).toBe(
				"https://img.test/tunic.jpg"
			);
			expect(artOf("The classic")).toBe("https://img.test/doom-bg.jpg");
			expect(screen.queryAllByRole("img")).toHaveLength(0);
		});

		it("leaves a record without a picture when the game has no art or only blank urls", async () => {
			await renderHighlights({
				...fullHighlights,
				bestRatio: {
					...fullHighlights.bestRatio!,
					backgroundUrl: "   ",
					coverUrl: ""
				}
			});

			expect(recordOf("Best value").querySelector("img")).toBeNull();
			expect(
				recordOf("First of the year").querySelector("img")
			).toBeNull();
			expect(
				within(recordOf("Best value")).getByRole("link", {
					name: /Celeste/
				})
			).toBeInTheDocument();
		});

		it("never puts art behind the stats", async () => {
			const { container } = await renderHighlights(fullHighlights);

			expect(container.querySelector("dl img")).toBeNull();
		});
	});

	describe("when the data changes under the user", () => {
		it("follows the language and the data as they flip back and forth", async () => {
			const { fixture } = await renderHighlights(fullHighlights);

			for (let round = 0; round < 3; round++) {
				fixture.componentRef.setInput("language", "es");
				fixture.componentRef.setInput("highlights", nothing);
				fixture.detectChanges();
				expect(records()).toHaveLength(0);
				expect(
					screen.queryByText("Mejor ratio")
				).not.toBeInTheDocument();

				fixture.componentRef.setInput("highlights", fullHighlights);
				fixture.detectChanges();
				expect(records()).toHaveLength(6);
				expect(screen.getByText("Mejor ratio")).toBeInTheDocument();

				fixture.componentRef.setInput("language", "en");
				fixture.detectChanges();
				expect(screen.getByText("Best value")).toBeInTheDocument();
				expect(
					screen.queryByText("Mejor ratio")
				).not.toBeInTheDocument();
			}
		});

		it("survives garbage numbers without breaking the grid", async () => {
			await renderHighlights({
				...fullHighlights,
				bestRatio: { ...fullHighlights.bestRatio!, personalRatio: 0 },
				longest: {
					...fullHighlights.longest!,
					hours: 1234567.89,
					title: ""
				},
				busiestMonth: { month: 12, count: 0 }
			});

			expect(records()).toHaveLength(6);
			expect(
				within(recordOf("Best value")).getByRole("link")
			).toHaveTextContent("0");
			expect(
				within(recordOf("Longest")).getByRole("link")
			).toHaveTextContent("1,234,567.9 h");
			expect(statOf("Busiest month")).toHaveTextContent("December");
		});
	});
});
