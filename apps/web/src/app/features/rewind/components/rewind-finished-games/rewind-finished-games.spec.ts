import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";

import {
	type RewindFinishedGame,
	type RewindLanguage
} from "../../../../core/models/rewind.model";
import { RewindFinishedGames } from "./rewind-finished-games";

function finished(code: string, finishedAt: string): RewindFinishedGame {
	return {
		gameId: `id-${code}`,
		code,
		title: code.toUpperCase(),
		coverUrl: null,
		backgroundUrl: null,
		finishedAt,
		platformAbbreviation: "PS5"
	};
}

async function renderTimeline(
	games: RewindFinishedGame[],
	language: RewindLanguage = "en",
	abandonedGames?: RewindFinishedGame[]
) {
	return render(RewindFinishedGames, {
		inputs: {
			games,
			language,
			...(abandonedGames && { abandonedGames })
		},
		providers: [provideRouter([])]
	});
}

function monthHeadings() {
	return screen
		.getAllByRole("heading", { level: 3 })
		.map(heading => heading.textContent?.replace(/\s+/g, " ").trim());
}

function expectLinksInOrder(
	container: HTMLElement,
	names: (string | RegExp)[]
) {
	const links = within(container).getAllByRole("link");
	expect(links).toHaveLength(names.length);
	names.forEach((name, index) =>
		expect(within(container).getByRole("link", { name })).toBe(links[index])
	);
}

describe("RewindFinishedGames", () => {
	it("lists the months in order with how many games each one closed", async () => {
		await renderTimeline([
			finished("late", "2026-11-20"),
			finished("early-a", "2026-02-03"),
			finished("early-b", "2026-02-28")
		]);

		const months = screen
			.getAllByRole("heading", { level: 3 })
			.map(heading => heading.textContent?.replace(/\s+/g, " ").trim());
		expect(months).toEqual(["February, 2 games", "November, 1 game"]);
	});

	it("writes the month and the count in Spanish", async () => {
		await renderTimeline(
			[finished("a", "2026-03-01"), finished("b", "2026-03-09")],
			"es"
		);

		const heading = screen.getByRole("heading", { level: 3 });
		expect(heading).toHaveTextContent("Marzo");
		expect(heading).toHaveTextContent("2 juegos");
	});

	it("keeps the calendar icons and the rail out of the accessibility tree", async () => {
		const { container } = await renderTimeline([
			finished("a", "2026-05-05")
		]);

		const icon = container.querySelector(".material-icons");
		expect(icon).toHaveTextContent("calendar_month");
		expect(icon?.closest("[aria-hidden='true']")).not.toBeNull();
		expect(container.querySelector(":scope ol > span")).toHaveAttribute(
			"aria-hidden",
			"true"
		);
	});

	it("tints each month with the tone of its part of the year", async () => {
		const { container } = await renderTimeline([
			finished("winter", "2026-01-10"),
			finished("summer", "2026-07-10"),
			finished("autumn", "2026-12-10")
		]);

		const tones = [
			...container.querySelectorAll<HTMLElement>(
				"ol > li[aria-labelledby]"
			)
		].map(month => month.style.getPropertyValue("--tone"));
		expect(tones).toEqual([
			"var(--color-brand)",
			"var(--color-nav-queue)",
			"var(--color-nav-shelf)"
		]);
	});

	it("links every cover to its game and shows its date", async () => {
		await renderTimeline([finished("hades", "2026-04-02")]);

		const month = screen.getByRole("listitem", { name: /April/ });
		const link = within(month).getByRole("link");
		expect(link).toHaveAttribute("href", "/games/hades");
		expect(link).toHaveTextContent("Apr 2");
	});

	it("falls back to the background art of a game without a cover and keeps the real cover first", async () => {
		const { container } = await renderTimeline([
			{
				...finished("buckshot", "2026-06-12"),
				backgroundUrl: "https://img.test/buckshot-background.jpg"
			},
			{
				...finished("watch-dogs", "2026-06-17"),
				coverUrl: "https://img.test/watch-dogs-cover.jpg",
				backgroundUrl: "https://img.test/watch-dogs-background.jpg"
			},
			finished("no-art", "2026-06-20")
		]);

		const sources = [...container.querySelectorAll("img")].map(image =>
			image.getAttribute("src")
		);
		expect(sources.some(src => src?.includes("buckshot-background"))).toBe(
			true
		);
		expect(sources.some(src => src?.includes("watch-dogs-cover"))).toBe(
			true
		);
		expect(
			sources.some(src => src?.includes("watch-dogs-background"))
		).toBe(false);
		expect(container.querySelectorAll("img")).toHaveLength(2);
	});

	describe("with abandoned games", () => {
		it("interleaves them by date inside their month, finished first on the same day", async () => {
			const { container } = await renderTimeline(
				[
					finished("late", "2026-04-28"),
					finished("same-day", "2026-04-10"),
					finished("early", "2026-04-01")
				],
				"en",
				[
					finished("dropped-mid", "2026-04-15"),
					finished("dropped-same-day", "2026-04-10")
				]
			);

			const codes = [
				...container.querySelectorAll<HTMLAnchorElement>("li a")
			].map(link => link.getAttribute("href"));
			expect(codes).toEqual([
				"/games/early",
				"/games/same-day",
				"/games/dropped-same-day",
				"/games/dropped-mid",
				"/games/late"
			]);
		});

		it("counts the finished and the abandoned games of each month", async () => {
			await renderTimeline(
				[
					finished("a", "2026-02-01"),
					finished("b", "2026-02-02"),
					finished("c", "2026-02-03"),
					finished("d", "2026-02-04"),
					finished("e", "2026-02-05"),
					finished("f", "2026-05-05")
				],
				"en",
				[
					finished("x", "2026-02-10"),
					finished("y", "2026-02-11"),
					finished("z", "2026-05-20")
				]
			);

			expect(monthHeadings()).toEqual([
				"February, 5 games·, 2 abandoned",
				"May, 1 game·, 1 abandoned"
			]);
		});

		it("still shows a month that only has abandoned games, with the abandoned count alone", async () => {
			const { container } = await renderTimeline(
				[finished("kept", "2026-03-03")],
				"en",
				[
					finished("one", "2026-01-01"),
					finished("two", "2026-01-02"),
					finished("three", "2026-01-03"),
					finished("four", "2026-01-31")
				]
			);

			expect(monthHeadings()).toEqual([
				"January, 4 abandoned",
				"March, 1 game"
			]);
			const january = screen.getByRole("listitem", { name: /January/ });
			expect(within(january).getAllByRole("link")).toHaveLength(4);
			expect(
				container.querySelectorAll("[data-abandoned-count]")
			).toHaveLength(1);
		});

		it("says in the link and next to the date that the game was abandoned, and hides the badge", async () => {
			await renderTimeline([finished("hades", "2026-04-02")], "en", [
				finished("tunic", "2026-04-09")
			]);

			const april = screen.getByRole("listitem", { name: /April/ });
			expectLinksInOrder(april, [
				/^HADES\s*Apr 2$/,
				"TUNIC, Apr 9, abandoned"
			]);
			const dropped = within(april).getByRole("link", {
				name: "TUNIC, Apr 9, abandoned"
			});
			expect(dropped).toHaveAttribute("href", "/games/tunic");
			expect(dropped).toHaveTextContent("Apr 9 · abandoned");
			const badge = dropped.querySelector("[data-abandoned-badge]");
			expect(badge).toHaveAttribute("aria-hidden", "true");
			expect(badge).toHaveTextContent("close");
		});

		it("grays out only the abandoned posters and gives them their colour back on hover and focus", async () => {
			const { container } = await renderTimeline(
				[finished("hades", "2026-04-02")],
				"en",
				[finished("tunic", "2026-04-09")]
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
				"aspect-[2/3]",
				"ring-1"
			);
			expect(dropped?.closest("li")).toHaveAttribute(
				"data-abandoned",
				"true"
			);
		});

		it("writes the counts, the date suffix and the link in Spanish", async () => {
			await renderTimeline([finished("hades", "2026-03-02")], "es", [
				finished("tunic", "2026-03-09"),
				finished("inside", "2026-03-20")
			]);

			expect(monthHeadings()).toEqual(["Marzo, 1 juego·, 2 abandonados"]);
			const link = screen.getByRole("link", {
				name: "TUNIC, 9 mar, abandonado"
			});
			expect(link).toHaveTextContent("9 mar · abandonado");
		});

		it("uses the singular for one abandoned game in Spanish", async () => {
			await renderTimeline([], "es", [finished("tunic", "2026-06-09")]);

			expect(monthHeadings()).toEqual(["Junio, 1 abandonado"]);
		});

		it("shows a game abandoned and then finished in the same month twice without clashing", async () => {
			await renderTimeline([finished("tunic", "2026-07-25")], "en", [
				finished("tunic", "2026-07-02")
			]);

			const july = screen.getByRole("listitem", { name: /July/ });
			expectLinksInOrder(july, [
				"TUNIC, Jul 2, abandoned",
				/^TUNIC\s*Jul 25$/
			]);
		});

		it("renders the same timeline as before when nothing was abandoned", async () => {
			const games = [
				finished("a", "2026-01-10"),
				finished("b", "2026-01-12"),
				finished("c", "2026-09-01")
			];
			const { container, fixture } = await renderTimeline(games);
			const before = container.innerHTML;

			fixture.componentRef.setInput("abandonedGames", []);
			fixture.detectChanges();

			expect(container.innerHTML).toBe(before);
			expect(monthHeadings()).toEqual([
				"January, 2 games",
				"September, 1 game"
			]);
			expect(container.querySelector("[data-abandoned]")).toBeNull();
			expect(screen.queryByText(/abandoned/)).toBeNull();
		});
	});

	it("renders nothing but the rail for a year without finished games", async () => {
		await renderTimeline([]);

		expect(screen.queryAllByRole("heading")).toHaveLength(0);
	});
});
