import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";

import {
	type RewindLanguage,
	type RewindPlatinumGame
} from "../../../../../core/models/rewind.model";
import {
	rewind2025PlatinumEntries,
	Rewind2025Platinums
} from "./rewind-2025-platinums";

function platinum(
	code: string,
	title: string,
	platinumedAt: string,
	art: Partial<RewindPlatinumGame> = {}
): RewindPlatinumGame {
	return {
		gameId: `id-${code}`,
		code,
		title,
		coverUrl: null,
		backgroundUrl: null,
		platinumedAt,
		platformAbbreviation: null,
		...art
	};
}

const RE4 = platinum("re4", "Resident Evil 4", "2025-03-04", {
	coverUrl: "https://img.test/re4.jpg",
	backgroundUrl: "https://img.test/re4-bg.jpg"
});
const ARKHAM = platinum("arkham", "Batman: Arkham Knight", "2025-05-01", {
	backgroundUrl: "https://img.test/arkham-bg.jpg"
});
const FIREWATCH = platinum("firewatch", "Firewatch", "2025-12-22", {
	platformAbbreviation: "PC"
});

function manyPlatinums(count: number): RewindPlatinumGame[] {
	return Array.from({ length: count }, (_, index) =>
		platinum(
			`game-${index + 1}`,
			`Game ${index + 1}`,
			`2025-${String((index % 12) + 1).padStart(2, "0")}-10`
		)
	);
}

describe("Rewind2025Platinums", () => {
	async function renderPlatinums(
		games: RewindPlatinumGame[],
		language: RewindLanguage = "en"
	) {
		return render(Rewind2025Platinums, {
			inputs: { games, language },
			providers: [provideRouter([])]
		});
	}

	function section(name: string): HTMLElement {
		return screen.getByRole("region", { name });
	}

	it("weaves the count into the heading sentence in English", async () => {
		await renderPlatinums([RE4, ARKHAM, FIREWATCH]);

		expect(
			within(
				section("This year you completed 3 games to a hundred percent")
			).getByRole("heading", { level: 2 })
		).toBeInTheDocument();
		expect(screen.queryByText("Platinums")).not.toBeInTheDocument();
	});

	it("shows one platinum as a horizontal card with marker, title and date with platform", async () => {
		const { container } = await renderPlatinums([FIREWATCH]);

		expect(
			section("This year you completed 1 game to a hundred percent")
		).toBeInTheDocument();
		expect(container.querySelector("[data-platinum-strip]")).toBeNull();
		const card = screen.getByRole("link", {
			name: "Firewatch, platinum on Dec 22"
		});
		expect(card).toHaveAttribute("href", "/games/firewatch");
		expect(card).toHaveAttribute("data-platinum-card");
		expect(card).toHaveTextContent("Platinum");
		expect(card).toHaveTextContent("Firewatch");
		expect(card).toHaveTextContent("Dec 22 · PC");
	});

	it("shows several platinums as a strip of posters with the date under each", async () => {
		const { container } = await renderPlatinums([RE4, ARKHAM, FIREWATCH]);

		expect(container.querySelector("[data-platinum-card]")).toBeNull();
		const strip = container.querySelector("[data-platinum-strip]");
		expect(strip?.className).toContain("overflow-x-auto");
		expect(strip?.className).toContain("snap-x");
		const items = within(screen.getByRole("list")).getAllByRole("listitem");
		expect(items).toHaveLength(3);
		const links = screen.getAllByRole("link");
		expect(links.map(link => link.getAttribute("aria-label"))).toEqual([
			"Resident Evil 4, platinum on Mar 4",
			"Batman: Arkham Knight, platinum on May 1",
			"Firewatch, platinum on Dec 22"
		]);
		expect(links[1]).toHaveAttribute("href", "/games/arkham");
		expect(within(links[0]).getByText("Mar 4")).toBeInTheDocument();
		expect(within(links[2]).getByText("Dec 22 · PC")).toBeInTheDocument();
		for (const link of links) expect(link).toHaveTextContent("Platinum");
	});

	it("speaks Spanish with its own dates and a singular heading for one platinum", async () => {
		await renderPlatinums([FIREWATCH], "es");

		expect(
			section("Este año completaste 1 juego al cien por cien")
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Firewatch, platino el 22 dic" })
		).toHaveTextContent("Platino");
	});

	it("speaks Spanish with a plural heading for several platinums", async () => {
		await renderPlatinums([RE4, ARKHAM], "es");

		expect(
			section("Este año completaste 2 juegos al cien por cien")
		).toBeInTheDocument();
	});

	it("uses the portrait art, falls back to the landscape one and draws the coloured poster without art", async () => {
		await renderPlatinums([RE4, ARKHAM, FIREWATCH]);

		const [withCover, withBackground, withoutArt] =
			screen.getAllByRole("link");
		expect(
			withCover.querySelector("app-game-poster img")?.getAttribute("src")
		).toContain("re4.jpg");
		expect(
			withBackground
				.querySelector("app-game-poster img")
				?.getAttribute("src")
		).toContain("arkham-bg.jpg");
		expect(withoutArt.querySelector("app-game-poster img")).toBeNull();
		expect(
			withoutArt.querySelector("app-game-poster [role='img']")
		).not.toBeNull();
		for (const art of document.querySelectorAll("a > span[aria-hidden]"))
			expect(art.querySelector("app-game-poster")).not.toBeNull();
	});

	it("keeps every poster reachable when there are many platinums", async () => {
		await renderPlatinums(manyPlatinums(15));

		expect(screen.getAllByRole("link")).toHaveLength(15);
		expect(
			section("This year you completed 15 games to a hundred percent")
		).toBeInTheDocument();
	});

	it("does not print an empty platform separator when the platform is missing", async () => {
		await renderPlatinums([platinum("solo", "Solo", "2025-02-02")]);

		expect(screen.getByRole("link")).not.toHaveTextContent("·");
		expect(screen.getByRole("link")).toHaveTextContent("Feb 2");
	});

	it("follows the list when it changes many times in a row", async () => {
		const { rerender, container } = await renderPlatinums([RE4]);

		for (const games of [manyPlatinums(8), [], [FIREWATCH, RE4], [ARKHAM]])
			await rerender({ inputs: { games, language: "en" } });

		expect(screen.getAllByRole("link")).toHaveLength(1);
		expect(container.querySelector("[data-platinum-card]")).not.toBeNull();
		expect(
			section("This year you completed 1 game to a hundred percent")
		).toBeInTheDocument();
	});
});

describe("rewind2025PlatinumEntries", () => {
	it("keeps the API order and builds the date and platform detail", () => {
		const entries = rewind2025PlatinumEntries([FIREWATCH, RE4], "en");

		expect(entries.map(entry => entry.title)).toEqual([
			"Firewatch",
			"Resident Evil 4"
		]);
		expect(entries.map(entry => entry.detail)).toEqual([
			"Dec 22 · PC",
			"Mar 4"
		]);
	});

	it("tolerates the same game twice without dropping either entry", () => {
		const entries = rewind2025PlatinumEntries([RE4, RE4], "es");

		expect(entries).toHaveLength(2);
		expect(entries[0]?.label).toBe("Resident Evil 4, platino el 4 mar");
	});
});
