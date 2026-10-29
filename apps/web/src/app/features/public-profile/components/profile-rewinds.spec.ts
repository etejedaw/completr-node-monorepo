import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";

import { type RewindYearSummary } from "../../../core/models/rewind.model";
import { ProfileRewinds } from "./profile-rewinds";

const year = (value: number): RewindYearSummary => ({
	year: value,
	isGenerated: true,
	finishedCount: 3,
	startedCount: 4,
	hoursPlayed: 20,
	persona: "steady-player" as const,
	covers: []
});

describe("ProfileRewinds", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
	});

	afterEach(() => vi.unstubAllGlobals());

	async function renderRow(years: RewindYearSummary[]) {
		return render(ProfileRewinds, {
			inputs: { username: "ada", years },
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting()
			]
		});
	}

	it("shows up to four years and links to the archive when there are more", async () => {
		await renderRow([2025, 2024, 2023, 2022, 2021].map(year));

		const section = screen.getByRole("region", { name: "Rewind" });
		expect(within(section).getByText("Year in review")).toBeInTheDocument();
		expect(within(section).getAllByRole("listitem")).toHaveLength(4);
		expect(
			within(section).getByRole("link", { name: /See all/ })
		).toHaveAttribute("href", "/user/ada/rewind");
		expect(
			within(section).queryByRole("link", { name: /2021/ })
		).not.toBeInTheDocument();
	});

	it("does not offer See all with four years or fewer", async () => {
		await renderRow([2025, 2024].map(year));

		expect(
			screen.queryByRole("link", { name: /See all/ })
		).not.toBeInTheDocument();
		expect(screen.getByRole("link", { name: /2024/ })).toHaveAttribute(
			"href",
			"/user/ada/rewind/2024"
		);
	});

	it("renders nothing without years", async () => {
		await renderRow([]);

		expect(screen.queryByRole("region")).not.toBeInTheDocument();
	});
});
