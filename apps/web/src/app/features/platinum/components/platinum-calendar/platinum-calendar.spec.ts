import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { type PlatinumEntry } from "../../../../core/models";
import { PlatinumCalendar } from "./platinum-calendar";

function buildPlatinum(
	id: string,
	title: string,
	platinumedAt: string | null
): PlatinumEntry {
	return {
		id,
		backlogId: null,
		platformId: null,
		platinumedAt,
		platform: null,
		game: { id: `game-${id}`, code: id, title, isDlc: false }
	};
}

describe("PlatinumCalendar", () => {
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

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("opens on the month of the latest platinum and counts the undated ones apart", async () => {
		const platinumClick = vi.fn();
		await render(PlatinumCalendar, {
			inputs: {
				platinums: [
					buildPlatinum("p1", "Astro Bot", "2026-03-12"),
					buildPlatinum("p2", "Hades", "2025-11-02"),
					buildPlatinum("p3", "Bloodborne", null)
				]
			},
			on: { platinumClick }
		});

		expect(await screen.findByText("1 platinumed")).toBeInTheDocument();
		expect(
			screen.getByText(/1 platinum has no date and isn't shown here/)
		).toBeInTheDocument();

		await userEvent
			.setup()
			.click(screen.getAllByRole("button", { name: /Astro Bot/ })[0]);
		expect(platinumClick).toHaveBeenCalledWith(
			expect.objectContaining({ id: "p1" })
		);
	});
});
