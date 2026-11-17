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
const FIREWATCH = platinum("firewatch", "Firewatch", "2025-12-22");

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

	it("titles the page with the eyebrow and tells the count in English", async () => {
		await renderPlatinums([RE4, ARKHAM, FIREWATCH]);

		const page = section("Platinums");
		expect(
			within(page).getByRole("heading", { level: 2, name: "Platinums" })
		).toBeInTheDocument();
		expect(within(page).getByText("3")).toBeInTheDocument();
		expect(
			within(page).getByText("games completed to a hundred percent")
		).toBeInTheDocument();
		expect(
			within(page).getByText(
				"Every trophy on every list, in the order they came."
			)
		).toBeInTheDocument();
	});

	it("numbers the posters in order and links each one to its game", async () => {
		await renderPlatinums([RE4, ARKHAM, FIREWATCH]);

		const items = within(screen.getByRole("list")).getAllByRole("listitem");
		expect(
			items.map(item => item.textContent?.match(/\d{2}/)?.[0])
		).toEqual(["01", "02", "03"]);
		const links = screen.getAllByRole("link");
		expect(links.map(link => link.getAttribute("aria-label"))).toEqual([
			"Resident Evil 4, platinum on Mar 4",
			"Batman: Arkham Knight, platinum on May 1",
			"Firewatch, platinum on Dec 22"
		]);
		expect(links[1]).toHaveAttribute("href", "/games/arkham");
		expect(within(links[2]).getByText("Dec 22")).toBeInTheDocument();
	});

	it("speaks Spanish with its own dates and a singular headline for one platinum", async () => {
		await renderPlatinums([FIREWATCH], "es");

		const page = section("Platinos");
		expect(within(page).getByText("1")).toBeInTheDocument();
		expect(
			within(page).getByText("juego completado al cien por cien")
		).toBeInTheDocument();
		expect(
			within(page).getByText(
				"Cada trofeo de cada lista, en orden de llegada."
			)
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Firewatch, platino el 22 dic" })
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
		for (const poster of document.querySelectorAll("app-game-poster"))
			expect(poster).toHaveAttribute("aria-hidden", "true");
	});

	it("wraps many platinums with two-digit positions", async () => {
		await renderPlatinums(manyPlatinums(15));

		expect(screen.getAllByRole("link")).toHaveLength(15);
		expect(
			within(section("Platinums")).getByText("15", { selector: "p span" })
		).toBeInTheDocument();
		expect(
			screen.getByText("15", { selector: "a span" })
		).toBeInTheDocument();
	});

	it("follows the list when it changes many times in a row", async () => {
		const { rerender } = await renderPlatinums([RE4]);

		for (const games of [manyPlatinums(8), [], [FIREWATCH, RE4], [ARKHAM]])
			await rerender({ inputs: { games, language: "en" } });

		expect(screen.getAllByRole("link")).toHaveLength(1);
		expect(
			screen.getByText("game completed to a hundred percent")
		).toBeInTheDocument();
	});
});

describe("rewind2025PlatinumEntries", () => {
	it("keeps the API order and pads positions past nine", () => {
		const entries = rewind2025PlatinumEntries(manyPlatinums(11), "en");

		expect(entries.map(entry => entry.position)).toEqual([
			"01",
			"02",
			"03",
			"04",
			"05",
			"06",
			"07",
			"08",
			"09",
			"10",
			"11"
		]);
		expect(entries[10]?.title).toBe("Game 11");
	});

	it("tolerates the same game twice without dropping either entry", () => {
		const entries = rewind2025PlatinumEntries([RE4, RE4], "es");

		expect(entries.map(entry => entry.position)).toEqual(["01", "02"]);
		expect(entries[0]?.label).toBe("Resident Evil 4, platino el 4 mar");
	});
});
