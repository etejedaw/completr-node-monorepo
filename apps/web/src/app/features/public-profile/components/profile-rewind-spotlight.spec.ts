import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";

import { type RewindYearSummary } from "../../../core/models/rewind.model";
import { ProfileRewindSpotlight } from "./profile-rewind-spotlight";

const cover = (id: string) => ({
	gameId: id,
	code: id,
	title: `Game ${id}`,
	coverUrl: null,
	backgroundUrl: null
});

function summary(overrides: Partial<RewindYearSummary> = {}) {
	return {
		year: 2026,
		finishedCount: 18,
		startedCount: 23,
		hoursPlayed: 212,
		covers: ["a", "b", "c", "d", "e"].map(cover),
		...overrides
	};
}

describe("ProfileRewindSpotlight", () => {
	async function renderSpotlight(
		value: RewindYearSummary,
		{ isSelf = false, hasMoreYears = false } = {}
	) {
		const result = await render(ProfileRewindSpotlight, {
			inputs: { username: "ada", summary: value, isSelf, hasMoreYears },
			providers: [provideRouter([])]
		});
		return result.container as HTMLElement;
	}

	it("shows the year, the finished count and the hours with a decorative fan of covers", async () => {
		const container = await renderSpotlight(summary());

		expect(
			screen.getByRole("heading", { name: "Rewind 2026" })
		).toBeInTheDocument();
		expect(screen.getByText("finished")).toBeInTheDocument();
		expect(screen.getByText("18")).toBeInTheDocument();
		expect(screen.getByText("h played")).toBeInTheDocument();
		expect(screen.getByText("212")).toBeInTheDocument();
		const posters = container.querySelectorAll("app-game-poster");
		expect(posters).toHaveLength(5);
		expect(posters[0].closest("[aria-hidden='true']")).not.toBeNull();
	});

	it("addresses a visitor by the owner's username and hides Past rewinds with a single year", async () => {
		await renderSpotlight(summary());

		expect(
			screen.getByRole("link", { name: "See @ada's Rewind" })
		).toHaveAttribute("href", "/user/ada/rewind/2026");
		expect(
			screen.queryByRole("link", { name: "Past rewinds" })
		).not.toBeInTheDocument();
	});

	it("addresses the owner and links past rewinds when there are more years", async () => {
		await renderSpotlight(summary(), { isSelf: true, hasMoreYears: true });

		expect(
			screen.getByRole("link", { name: "See your Rewind" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Past rewinds" })
		).toHaveAttribute("href", "/user/ada/rewind");
	});

	it("counts started games and says the year is ready when nothing was finished", async () => {
		const container = await renderSpotlight(
			summary({ finishedCount: 0, covers: [] }),
			{ isSelf: true }
		);

		expect(screen.getByText("started")).toBeInTheDocument();
		expect(screen.getByText("23")).toBeInTheDocument();
		expect(
			screen.getByText("Your year in games is ready")
		).toBeInTheDocument();
		expect(container.querySelectorAll("app-game-poster")).toHaveLength(0);
	});

	it("tells a visitor whose year is ready", async () => {
		await renderSpotlight(summary({ finishedCount: 0, covers: [] }));

		expect(
			screen.getByText("@ada's year in games is ready")
		).toBeInTheDocument();
	});
});
