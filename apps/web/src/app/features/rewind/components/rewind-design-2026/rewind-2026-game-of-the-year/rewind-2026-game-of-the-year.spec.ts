import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";

import { type RewindRatedGame } from "../../../../../core/models/rewind.model";
import { Rewind2026GameOfTheYear } from "./rewind-2026-game-of-the-year";

function topRated(overrides: Partial<RewindRatedGame> = {}): RewindRatedGame {
	return {
		gameId: "re4",
		code: "resident-evil-4",
		title: "Resident Evil 4",
		coverUrl: "https://img.test/re4-cover.jpg",
		backgroundUrl: "https://img.test/re4-bg.jpg",
		finishedAt: "2026-03-01",
		platformAbbreviation: "PS5",
		userRating: 4.5,
		...overrides
	};
}

async function renderGame(game: RewindRatedGame, language: "en" | "es" = "en") {
	return render(Rewind2026GameOfTheYear, {
		inputs: { game, language },
		providers: [provideRouter([])]
	});
}

describe("Rewind2026GameOfTheYear", () => {
	it("names the section in English and links to the game", async () => {
		await renderGame(topRated());

		expect(
			screen.getByRole("region", { name: "Your game of the year" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /Top rated.*Resident Evil 4/ })
		).toHaveAttribute("href", "/games/resident-evil-4");
		expect(screen.getByText("Rated 4.5 out of 5")).toBeInTheDocument();
	});

	it("speaks Spanish with its decimal comma", async () => {
		await renderGame(topRated(), "es");

		expect(
			screen.getByRole("region", { name: "Tu juego del año" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", {
				name: /Mejor calificado.*Resident Evil 4/
			})
		).toBeInTheDocument();
		expect(screen.getByText("Calificado con 4,5 de 5")).toBeInTheDocument();
	});

	it("puts the landscape art behind the card and the poster in front", async () => {
		const { container } = await renderGame(topRated());

		const link = screen.getByRole("link");
		const decorative = [
			...link.querySelectorAll<HTMLElement>(
				"[aria-hidden='true'] img, img[aria-hidden='true']"
			)
		].map(image => image.getAttribute("src"));

		expect(decorative).toContain("https://img.test/re4-bg.jpg");
		expect(container.querySelector("app-game-poster img")).toHaveAttribute(
			"src",
			"https://img.test/re4-cover.jpg"
		);
	});

	it("falls back to the cover for the backdrop when the game has no landscape art", async () => {
		await renderGame(topRated({ backgroundUrl: null }));

		expect(
			screen.getByRole("link").querySelector("img[aria-hidden='true']")
		).toHaveAttribute("src", "https://img.test/re4-cover.jpg");
	});

	it("still renders the card with its title when the game has no art at all", async () => {
		const { container } = await renderGame(
			topRated({ coverUrl: null, backgroundUrl: null })
		);

		expect(
			screen.getByRole("link", { name: /Resident Evil 4/ })
		).toBeInTheDocument();
		expect(container.querySelector("img[aria-hidden='true']")).toBeNull();
	});

	it("hides the star icons and the rating from the visual order but keeps it for readers", async () => {
		await renderGame(topRated({ userRating: 5 }));

		expect(screen.getByText("Rated 5 out of 5")).toHaveClass("sr-only");
	});

	it("keeps the link focusable and straightens the poster only when motion is allowed", async () => {
		const { container } = await renderGame(topRated());

		expect(screen.getByRole("link").className).toContain(
			"focus-visible:outline-2"
		);
		expect(container.querySelector("app-game-poster")!.className).toContain(
			"motion-safe:group-hover:rotate-0"
		);
	});
});
