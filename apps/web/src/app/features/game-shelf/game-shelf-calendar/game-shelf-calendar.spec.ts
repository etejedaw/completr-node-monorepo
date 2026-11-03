import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { type GameShelfEntry } from "../../../core/models";
import { GameShelfCalendar } from "./game-shelf-calendar";

function buildEntry(
	id: string,
	title: string,
	acquiredAt?: string
): GameShelfEntry {
	return {
		id,
		gameId: `game-${id}`,
		platformId: "platform-1",
		isPublic: true,
		acquiredAt,
		game: { id: `game-${id}`, code: id, title, isDlc: false },
		platform: { id: "platform-1", abbreviation: "PC" }
	};
}

describe("GameShelfCalendar", () => {
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

	it("opens on the latest acquired month and names each chip with its game", async () => {
		const entryClick = vi.fn();
		await render(GameShelfCalendar, {
			inputs: {
				entries: [
					buildEntry("e1", "Hades", "2026-03-12"),
					buildEntry("e2", "Celeste", "2025-11-02"),
					buildEntry("e3", "Undated")
				]
			},
			on: { entryClick }
		});

		expect(await screen.findByText("1 acquired")).toBeInTheDocument();
		expect(
			screen.getByText(/1 item has no acquired date/)
		).toBeInTheDocument();

		const chips = screen.getAllByRole("button", {
			name: "Hades, added to your shelf"
		});
		await userEvent.setup().click(chips[0]);
		expect(entryClick).toHaveBeenCalledWith(
			expect.objectContaining({ id: "e1" })
		);
	});

	it("collapses the days with more than three entries into a more button", async () => {
		await render(GameShelfCalendar, {
			inputs: {
				entries: ["A", "B", "C", "D", "E"].map(title =>
					buildEntry(title, title, "2026-03-12")
				)
			}
		});

		expect(await screen.findByText("5 acquired")).toBeInTheDocument();
		expect(
			screen.getAllByRole("button", { name: "+2 more" })
		).not.toHaveLength(0);
	});
});
