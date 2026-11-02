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
	language: RewindLanguage = "en"
) {
	return render(RewindFinishedGames, {
		inputs: { games, language },
		providers: [provideRouter([])]
	});
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

	it("renders nothing but the rail for a year without finished games", async () => {
		await renderTimeline([]);

		expect(screen.queryAllByRole("heading")).toHaveLength(0);
	});
});
