import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";

import {
	type RewindFinishedGame,
	type RewindLanguage,
	type RewindPlatinumGame
} from "../../../../../core/models/rewind.model";
import { Rewind2026ClosedGames } from "./rewind-2026-closed-games";

function game(
	code: string,
	finishedAt: string,
	art: Partial<RewindFinishedGame> = {}
): RewindFinishedGame {
	return {
		gameId: `id-${code}`,
		code,
		title: code.toUpperCase(),
		coverUrl: null,
		backgroundUrl: null,
		finishedAt,
		platformAbbreviation: "PS5",
		...art
	};
}

function withArt(code: string, finishedAt: string): RewindFinishedGame {
	return game(code, finishedAt, {
		coverUrl: `https://img.test/${code}-cover.jpg`,
		backgroundUrl: `https://img.test/${code}-background.jpg`
	});
}

async function renderClosed(
	games: RewindFinishedGame[],
	language: RewindLanguage = "en",
	abandonedGames?: RewindFinishedGame[],
	platinumGames?: RewindPlatinumGame[] | null
) {
	return render(Rewind2026ClosedGames, {
		inputs: {
			games,
			language,
			...(abandonedGames && { abandonedGames }),
			...(platinumGames !== undefined && { platinumGames })
		},
		providers: [provideRouter([])]
	});
}

function monthHeadings() {
	return screen
		.queryAllByRole("heading", { level: 3 })
		.map(heading => heading.textContent?.replace(/\s+/g, " ").trim());
}

function monthRow(name: RegExp) {
	return screen.getByRole("listitem", { name });
}

function backgroundOf(row: HTMLElement) {
	return row.querySelector("[data-month-art]")?.getAttribute("src") ?? null;
}

describe("Rewind2026ClosedGames", () => {
	describe("platinum marker", () => {
		function platinumOf(game: RewindFinishedGame): RewindPlatinumGame {
			return {
				gameId: game.gameId,
				code: game.code,
				title: game.title,
				coverUrl: game.coverUrl,
				backgroundUrl: game.backgroundUrl,
				platinumedAt: "2026-06-30",
				platformAbbreviation: "PS5"
			};
		}

		it("marks only the finished games that were platinumed, with a badge hidden from screen readers", async () => {
			const platinumed = withArt("plat", "2026-06-10");
			const plain = withArt("plain", "2026-06-12");
			const { container } = await renderClosed(
				[platinumed, plain],
				"en",
				[],
				[platinumOf(platinumed)]
			);

			const badges = container.querySelectorAll("[data-platinum-badge]");
			expect(badges).toHaveLength(1);
			expect(badges[0]).toHaveAttribute("aria-hidden", "true");
			expect(badges[0]).toHaveAttribute("title", "Platinum");
			expect(badges[0].className).toContain("text-platinum");
			expect(badges[0].closest("a")).toHaveAttribute(
				"aria-label",
				"PLAT, Jun 10, platinum"
			);
			expect(
				screen.getByRole("link", { name: "PLAIN, Jun 12" })
			).toBeInTheDocument();
		});

		it("never marks an abandoned run as platinum, even for a platinumed game", async () => {
			const game = withArt("both", "2026-06-10");
			const { container } = await renderClosed(
				[],
				"en",
				[game],
				[platinumOf(game)]
			);

			expect(container.querySelector("[data-platinum-badge]")).toBeNull();
			expect(
				container.querySelector("[data-abandoned-badge]")
			).not.toBeNull();
		});

		it("shows no marker when the viewer cannot see platinums", async () => {
			const { container } = await renderClosed(
				[withArt("a", "2026-06-10")],
				"en",
				[],
				null
			);

			expect(container.querySelector("[data-platinum-badge]")).toBeNull();
		});

		it("shows no marker in a year without platinums", async () => {
			const { container } = await renderClosed(
				[withArt("a", "2026-06-10")],
				"en",
				[],
				[]
			);

			expect(container.querySelector("[data-platinum-badge]")).toBeNull();
		});

		it("speaks the marker in Spanish", async () => {
			const game = withArt("plat", "2026-06-10");
			const { container } = await renderClosed(
				[game],
				"es",
				[],
				[platinumOf(game)]
			);

			expect(
				container.querySelector("[data-platinum-badge]")
			).toHaveAttribute("title", "Platino");
			expect(
				container.querySelector("[data-platinum-badge]")?.closest("a")
			).toHaveAttribute("aria-label", "PLAT, 10 jun, platinado");
		});
	});

	it("lists only the months that have closed games, in calendar order", async () => {
		await renderClosed(
			[
				game("late", "2026-11-20"),
				game("early-a", "2026-02-03"),
				game("early-b", "2026-02-28")
			],
			"en",
			[game("dropped", "2026-08-09")]
		);

		expect(monthHeadings()).toEqual([
			"February, 2 games",
			"August, 1 abandoned",
			"November, 1 game"
		]);
	});

	it("renders nothing for a year without closed games", async () => {
		const { container } = await renderClosed([]);

		expect(monthHeadings()).toEqual([]);
		expect(container.querySelectorAll("li")).toHaveLength(0);
	});

	it("puts the posters of a month in date order, whatever order they arrive in", async () => {
		await renderClosed([
			game("third", "2026-04-28"),
			game("first", "2026-04-01"),
			game("second", "2026-04-10")
		]);

		const links = within(monthRow(/April/)).getAllByRole("link");
		expect(links.map(link => link.getAttribute("href"))).toEqual([
			"/games/first",
			"/games/second",
			"/games/third"
		]);
	});

	it("links every poster to its game and names it with the title and the date", async () => {
		await renderClosed([game("hades", "2026-04-02")]);

		const link = within(monthRow(/April/)).getByRole("link", {
			name: "HADES, Apr 2"
		});
		expect(link).toHaveAttribute("href", "/games/hades");
	});

	describe("counts", () => {
		it("writes the singular and the plural of finished games in English", async () => {
			await renderClosed([
				game("one", "2026-01-03"),
				game("a", "2026-03-01"),
				game("b", "2026-03-09")
			]);

			expect(monthHeadings()).toEqual([
				"January, 1 game",
				"March, 2 games"
			]);
		});

		it("writes the month and the counts in Spanish", async () => {
			await renderClosed(
				[game("a", "2026-03-01"), game("b", "2026-03-09")],
				"es",
				[game("x", "2026-03-20")]
			);

			expect(monthHeadings()).toEqual(["Marzo, 2 juegos·, 1 abandonado"]);
		});

		it("uses the Spanish plural for several abandoned games and the singular for one", async () => {
			await renderClosed([], "es", [
				game("a", "2026-06-01"),
				game("b", "2026-06-02"),
				game("c", "2026-07-02")
			]);

			expect(monthHeadings()).toEqual([
				"Junio, 2 abandonados",
				"Julio, 1 abandonado"
			]);
		});

		it("shows the abandoned count alone for a month that only has abandoned games", async () => {
			const { container } = await renderClosed(
				[game("kept", "2026-03-03")],
				"en",
				[
					game("one", "2026-01-01"),
					game("two", "2026-01-02"),
					game("three", "2026-01-03"),
					game("four", "2026-01-31")
				]
			);

			expect(monthHeadings()).toEqual([
				"January, 4 abandoned",
				"March, 1 game"
			]);
			expect(
				container.querySelectorAll("[data-abandoned-count]")
			).toHaveLength(1);
		});

		it("counts finished and abandoned games of the same month separately", async () => {
			await renderClosed(
				[
					game("a", "2026-02-01"),
					game("b", "2026-02-02"),
					game("c", "2026-02-03"),
					game("d", "2026-02-04"),
					game("e", "2026-02-05"),
					game("f", "2026-05-05")
				],
				"en",
				[
					game("x", "2026-02-10"),
					game("y", "2026-02-11"),
					game("z", "2026-05-20")
				]
			);

			expect(monthHeadings()).toEqual([
				"February, 5 games·, 2 abandoned",
				"May, 1 game·, 1 abandoned"
			]);
		});
	});

	describe("abandoned games", () => {
		it("interleaves them by date with the finished ones, finished first on the same day", async () => {
			await renderClosed(
				[
					game("late", "2026-04-28"),
					game("same-day", "2026-04-10"),
					game("early", "2026-04-01")
				],
				"en",
				[
					game("dropped-mid", "2026-04-15"),
					game("dropped-same-day", "2026-04-10")
				]
			);

			const hrefs = within(monthRow(/April/))
				.getAllByRole("link")
				.map(link => link.getAttribute("href"));
			expect(hrefs).toEqual([
				"/games/early",
				"/games/same-day",
				"/games/dropped-same-day",
				"/games/dropped-mid",
				"/games/late"
			]);
		});

		it("says in the link name that the game was abandoned", async () => {
			await renderClosed([game("hades", "2026-04-02")], "en", [
				game("tunic", "2026-04-09")
			]);
			expect(
				screen.getByRole("link", { name: "TUNIC, Apr 9, abandoned" })
			).toHaveAttribute("href", "/games/tunic");
			expect(
				screen.getByRole("link", { name: "HADES, Apr 2" })
			).toBeInTheDocument();
		});

		it("names an abandoned game in Spanish", async () => {
			await renderClosed([], "es", [game("tunic", "2026-03-09")]);

			expect(
				screen.getByRole("link", { name: "TUNIC, 9 mar, abandonado" })
			).toBeInTheDocument();
		});

		it("dims only the abandoned posters and gives them their colour back on hover and focus", async () => {
			const { container } = await renderClosed(
				[withArt("hades", "2026-04-02")],
				"en",
				[withArt("tunic", "2026-04-09")]
			);

			const [kept, dropped] = [
				...container.querySelectorAll("app-game-poster")
			];
			expect(kept).not.toHaveClass("grayscale");
			expect(kept?.closest("li")).not.toHaveAttribute("data-abandoned");
			expect(dropped).toHaveClass(
				"grayscale",
				"opacity-60",
				"group-hover:grayscale-0",
				"group-hover:opacity-100",
				"group-focus-visible:grayscale-0",
				"group-focus-visible:opacity-100",
				"motion-reduce:transition-none",
				"aspect-[2/3]"
			);
			expect(dropped?.closest("li")).toHaveAttribute(
				"data-abandoned",
				"true"
			);
		});

		it("shows a game abandoned and then finished in the same month twice without clashing", async () => {
			await renderClosed([game("tunic", "2026-07-25")], "en", [
				game("tunic", "2026-07-02")
			]);

			const names = within(monthRow(/July/))
				.getAllByRole("link")
				.map(link => link.getAttribute("aria-label"));
			expect(names).toEqual(["TUNIC, Jul 2, abandoned", "TUNIC, Jul 25"]);
		});

		it("renders the same rows when the abandoned list is explicitly empty", async () => {
			const games = [
				game("a", "2026-01-10"),
				game("b", "2026-01-12"),
				game("c", "2026-09-01")
			];
			const { container, fixture } = await renderClosed(games);
			const before = container.innerHTML;

			fixture.componentRef.setInput("abandonedGames", []);
			fixture.detectChanges();

			expect(container.innerHTML).toBe(before);
			expect(container.querySelector("[data-abandoned]")).toBeNull();
			expect(screen.queryByText(/abandoned/)).toBeNull();
		});
	});

	describe("month art", () => {
		it("uses the landscape art of the first finished game of the month, in date order", async () => {
			await renderClosed([
				withArt("second", "2026-05-20"),
				withArt("first", "2026-05-02")
			]);

			expect(backgroundOf(monthRow(/May/))).toContain("first-background");
		});

		it("prefers the first finished game over an earlier abandoned one", async () => {
			await renderClosed([withArt("kept", "2026-05-20")], "en", [
				withArt("dropped", "2026-05-02")
			]);

			expect(backgroundOf(monthRow(/May/))).toContain("kept-background");
		});

		it("falls back to the art of the first abandoned game when the month has no finished ones", async () => {
			await renderClosed([], "en", [
				withArt("later", "2026-01-20"),
				withArt("sooner", "2026-01-05")
			]);

			expect(backgroundOf(monthRow(/January/))).toContain(
				"sooner-background"
			);
		});

		it("falls back to the cover when the first game has no landscape art", async () => {
			await renderClosed([
				game("only-cover", "2026-05-02", {
					coverUrl: "https://img.test/only-cover-cover.jpg"
				})
			]);

			expect(backgroundOf(monthRow(/May/))).toContain("only-cover-cover");
		});

		it("skips a first game without any art and uses the next one that has some", async () => {
			await renderClosed([
				game("bare", "2026-05-02"),
				withArt("pretty", "2026-05-10")
			]);

			expect(backgroundOf(monthRow(/May/))).toContain(
				"pretty-background"
			);
		});

		it("draws no background and no broken image for a month without any art", async () => {
			const { container } = await renderClosed([
				game("bare-a", "2026-05-02"),
				game("bare-b", "2026-05-03")
			]);

			expect(container.querySelector("[data-month-art]")).toBeNull();
			expect(container.querySelectorAll("img")).toHaveLength(0);
		});

		it("keeps the background decorative and out of the accessibility tree", async () => {
			const { container } = await renderClosed([
				withArt("hades", "2026-05-02")
			]);

			const art = container.querySelector("[data-month-art]");
			expect(art).toHaveAttribute("alt", "");
			expect(art).toHaveAttribute("aria-hidden", "true");
			expect(art).toHaveClass("opacity-18", "grayscale-30");
		});
	});

	describe("posters", () => {
		it("uses the cover for the poster and the background only when there is no cover", async () => {
			const { container } = await renderClosed([
				game("buckshot", "2026-06-12", {
					backgroundUrl: "https://img.test/buckshot-background.jpg"
				}),
				withArt("watch-dogs", "2026-06-17")
			]);

			const posterSources = [
				...container.querySelectorAll("app-game-poster img")
			].map(image => image.getAttribute("src"));
			expect(
				posterSources.some(src => src?.includes("buckshot-background"))
			).toBe(true);
			expect(
				posterSources.some(src => src?.includes("watch-dogs-cover"))
			).toBe(true);
			expect(
				posterSources.some(src =>
					src?.includes("watch-dogs-background")
				)
			).toBe(false);
		});

		it("shows the coloured fallback poster with the title for a game without any art, and keeps it a link", async () => {
			const { container } = await renderClosed([
				game("no-art", "2026-06-20")
			]);

			const poster = container.querySelector("app-game-poster");
			expect(poster).not.toBeNull();
			expect(poster?.querySelector("img")).toBeNull();
			expect(poster?.querySelector("[role='img']")).toHaveAttribute(
				"aria-label",
				"NO-ART"
			);
			expect(poster).toHaveTextContent("NO-ART");
			expect(poster?.closest("a")).toHaveAttribute(
				"href",
				"/games/no-art"
			);
			expect(
				container.querySelector("[data-poster-placeholder]")
			).toBeNull();
		});

		it("dims an abandoned game without art like the rest and marks it with the badge", async () => {
			const { container } = await renderClosed([], "en", [
				game("no-art", "2026-06-20")
			]);

			const poster = container.querySelector("app-game-poster");
			expect(poster?.className).toContain("grayscale");
			expect(
				poster?.closest("a")?.querySelector("[data-abandoned-badge]")
			).not.toBeNull();
		});

		it("marks only abandoned posters with a red badge hidden from screen readers, titled in the Rewind language", async () => {
			const { container } = await renderClosed(
				[withArt("done", "2026-06-10")],
				"es",
				[withArt("left", "2026-06-20")]
			);

			const links = [...container.querySelectorAll("a")];
			const badges = links.map(link =>
				link.querySelector("[data-abandoned-badge]")
			);
			expect(badges.filter(Boolean)).toHaveLength(1);
			const badge = container.querySelector("[data-abandoned-badge]")!;
			expect(badge.closest("li")).toHaveAttribute("data-abandoned");
			expect(badge).toHaveAttribute("aria-hidden", "true");
			expect(badge).toHaveAttribute("title", "Abandonado");
			expect(badge.className).toContain("text-danger");
			expect(
				container
					.querySelector("li:not([data-abandoned]) a")
					?.querySelector("[data-abandoned-badge]")
			).toBeNull();
		});

		it("stacks the month over a horizontal snap row on a phone and wraps on a wide screen", async () => {
			const { container } = await renderClosed([
				withArt("a", "2026-06-20")
			]);

			const row = monthRow(/June/);
			expect(row).toHaveClass(
				"grid",
				"md:grid-cols-[170px_minmax(0,1fr)]"
			);
			const posters = container.querySelector("[data-posters]");
			expect(posters).toHaveClass(
				"flex",
				"overflow-x-auto",
				"snap-x",
				"snap-mandatory",
				"md:flex-wrap",
				"md:overflow-visible"
			);
			expect(posters?.querySelector("li")).toHaveClass(
				"w-[84px]",
				"shrink-0",
				"snap-start"
			);
			expect(row).toHaveClass("min-w-0");
		});

		it("has no per-month tones, timeline rail or date captions left from the old timeline", async () => {
			const { container } = await renderClosed(
				[withArt("a", "2026-01-10"), withArt("b", "2026-07-10")],
				"en",
				[withArt("c", "2026-12-10")]
			);

			expect(container.querySelector("[style*='--tone']")).toBeNull();
			const icons = [...container.querySelectorAll(".material-icons")];
			expect(icons).toHaveLength(1);
			expect(icons[0].closest("[data-abandoned-badge]")).not.toBeNull();
			expect(
				container.querySelector("li > span.rounded-full")
			).toBeNull();
			expect(screen.queryByText("Jan 10")).toBeNull();
		});
	});

	describe("a sparse year", () => {
		it("shows a year with a single month and a single poster as one complete row", async () => {
			const { container } = await renderClosed([
				withArt("solo", "2026-09-14")
			]);

			expect(monthHeadings()).toEqual(["September, 1 game"]);
			const row = monthRow(/September/);
			expect(row).toHaveClass("rounded-card", "overflow-hidden");
			expect(backgroundOf(row)).toBe(
				"https://img.test/solo-background.jpg"
			);
			expect(row.querySelector("[data-month-veil]")).not.toBeNull();
			expect(row).not.toHaveClass("bg-surface");
			const posters = container.querySelectorAll("[data-posters] > li");
			expect(posters).toHaveLength(1);
			expect(within(row).getByRole("link")).toHaveAttribute(
				"href",
				"/games/solo"
			);
			expect(row.querySelector("[data-abandoned-count]")).toBeNull();
		});

		it("gives a month without any art its own surface instead of a veil over nothing", async () => {
			await renderClosed([game("bare", "2026-04-02")]);

			const row = monthRow(/April/);
			expect(row).toHaveClass("bg-surface", "rounded-card");
			expect(row.querySelector("[data-month-art]")).toBeNull();
			expect(row.querySelector("[data-month-veil]")).toBeNull();
		});

		it("keeps the surface only on the bare months when art comes and goes", async () => {
			const { fixture } = await renderClosed([
				withArt("lit", "2026-02-02"),
				game("bare", "2026-03-02")
			]);

			expect(monthRow(/February/)).not.toHaveClass("bg-surface");
			expect(monthRow(/March/)).toHaveClass("bg-surface");

			fixture.componentRef.setInput("games", [
				game("lit", "2026-02-02"),
				withArt("bare", "2026-03-02")
			]);
			fixture.detectChanges();

			expect(monthRow(/February/)).toHaveClass("bg-surface");
			expect(monthRow(/March/)).not.toHaveClass("bg-surface");
			expect(
				monthRow(/March/).querySelector("[data-month-veil]")
			).not.toBeNull();
		});

		it("shows a year of only abandoned games with their counts, badges and month art", async () => {
			const { container } = await renderClosed([], "en", [
				withArt("quit-a", "2026-01-20"),
				withArt("quit-b", "2026-01-25"),
				game("quit-c", "2026-08-03")
			]);

			expect(monthHeadings()).toEqual([
				"January, 2 abandoned",
				"August, 1 abandoned"
			]);
			const january = monthRow(/January/);
			expect(backgroundOf(january)).toBe(
				"https://img.test/quit-a-background.jpg"
			);
			expect(monthRow(/August/)).toHaveClass("bg-surface");
			expect(container.querySelectorAll("[data-abandoned]")).toHaveLength(
				3
			);
			expect(
				container.querySelectorAll("[data-abandoned-badge]")
			).toHaveLength(3);
			expect(
				container.querySelectorAll(
					"[data-posters] > li:not([data-abandoned])"
				)
			).toHaveLength(0);
		});

		it("writes the title on a fallback poster one step above the old caption size", async () => {
			const { container } = await renderClosed([
				game("no-art", "2026-06-20")
			]);

			const title = container.querySelector<HTMLElement>(
				"app-game-poster [role='img'] span:last-child"
			);
			expect(title).toHaveTextContent("NO-ART");
			expect(title?.style.fontSize).toBe("0.75rem");
		});
	});
});
