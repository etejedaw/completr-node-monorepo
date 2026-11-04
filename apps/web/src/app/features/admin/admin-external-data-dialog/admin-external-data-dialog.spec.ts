import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { type Game } from "../../../core/models";
import { type ExternalDataRefreshResult } from "../../games/games.model";
import { AdminExternalDataDialog } from "./admin-external-data-dialog";

const game = {
	id: "g1",
	code: "hades",
	title: "Hades",
	isDlc: false,
	platforms: [],
	genres: [],
	scores: [],
	times: [],
	externalLinks: []
} as unknown as Game;

describe("AdminExternalDataDialog results", () => {
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

	async function renderResults(results: ExternalDataRefreshResult[]) {
		await render(AdminExternalDataDialog, {
			inputs: { game, state: { status: "done", results } }
		});
		return screen.getByRole("region", { name: "Results" });
	}

	function resultOf(region: HTMLElement, sourceName: string) {
		return within(region)
			.getByText(sourceName)
			.closest("li") as HTMLElement;
	}

	it("says the HLTB ID was not found automatically and points to the game editor to add it by hand", async () => {
		const region = await renderResults([
			{ source: "hltb", status: "not_found", errorCode: null }
		]);

		const hltb = resultOf(region, "HowLongToBeat");
		expect(within(hltb).getByText("Not found")).toBeInTheDocument();
		expect(hltb).toHaveTextContent(
			"The HowLongToBeat ID of this game couldn't be found automatically. Add it by hand from the game editor and refresh again."
		);
		expect(hltb).not.toHaveTextContent(/Metacritic slug/);
	});

	it("explains a refresh that ran out of time instead of showing the raw error code", async () => {
		const region = await renderResults([
			{ source: "metacritic", status: "updated", score: 88 },
			{
				source: "hltb",
				status: "failed",
				errorCode: "EXTERNAL_DATA_DEADLINE_EXCEEDED"
			}
		]);

		const hltb = resultOf(region, "HowLongToBeat");
		expect(within(hltb).getByText("Failed")).toBeInTheDocument();
		expect(hltb).toHaveTextContent(
			/Ran out of time: the source was busy, probably with a running job\. Nothing was saved for it; try again in a moment\./
		);
		expect(hltb).not.toHaveTextContent("EXTERNAL_DATA_DEADLINE_EXCEEDED");
		expect(resultOf(region, "Metacritic")).toHaveTextContent(/Score 88/);
	});

	it("keeps showing the error code for other failures", async () => {
		const region = await renderResults([
			{ source: "hltb", status: "failed", errorCode: "HLTB_BLOCKED" }
		]);

		expect(resultOf(region, "HowLongToBeat")).toHaveTextContent(
			"Error code: HLTB_BLOCKED"
		);
	});

	it("suggests setting the Metacritic slug from the game editor when no page is found", async () => {
		const region = await renderResults([
			{ source: "metacritic", status: "not_found" }
		]);

		const metacritic = resultOf(region, "Metacritic");
		expect(metacritic).toHaveTextContent(
			/No Metacritic page was found for this game\. If its slug differs from the title, set the Metacritic slug from the game editor/
		);
	});

	it("suggests setting the Metacritic slug when the match is ambiguous and keeps the raw scores", async () => {
		const region = await renderResults([
			{
				source: "metacritic",
				status: "ambiguous",
				metaScore: 71,
				userScore: 6.2
			}
		]);

		const metacritic = resultOf(region, "Metacritic");
		expect(
			within(metacritic).getByText("Ambiguous match")
		).toBeInTheDocument();
		expect(metacritic).toHaveTextContent(
			/Set the Metacritic slug from the game editor to point to the right page/
		);
		expect(
			within(metacritic).getByText("Metascore 71 · User score 6.2")
		).toBeInTheDocument();
	});

	it("asks for the HLTB ID by hand when the HLTB match is ambiguous", async () => {
		const region = await renderResults([
			{ source: "hltb", status: "ambiguous" }
		]);

		expect(resultOf(region, "HowLongToBeat")).toHaveTextContent(
			/Add the HowLongToBeat ID by hand from the game editor/
		);
	});

	it("does not suggest the editor when a source was updated", async () => {
		const region = await renderResults([
			{ source: "hltb", status: "updated", duration: 21 },
			{ source: "metacritic", status: "updated", score: 93 }
		]);

		expect(region).not.toHaveTextContent(/game editor/);
	});

	it("explains that no IGDB entry was found without sending the admin to the game editor", async () => {
		const region = await renderResults([
			{ source: "igdb", status: "not_found" }
		]);

		const igdb = resultOf(region, "IGDB");
		expect(within(igdb).getByText("Not found")).toBeInTheDocument();
		expect(igdb).toHaveTextContent(
			/No IGDB entry was found for this game by its title/
		);
		expect(igdb).not.toHaveTextContent(/game editor/);
	});

	it("says the IGDB match is ambiguous and that nothing was saved", async () => {
		const region = await renderResults([
			{ source: "igdb", status: "ambiguous" }
		]);

		const igdb = resultOf(region, "IGDB");
		expect(within(igdb).getByText("Ambiguous match")).toBeInTheDocument();
		expect(igdb).toHaveTextContent(/nothing was saved/);
		expect(igdb).toHaveTextContent(/generic title can match several/);
		expect(igdb).not.toHaveTextContent(/game editor/);
	});

	it("says the game is on IGDB but has no user score yet", async () => {
		const region = await renderResults([
			{ source: "igdb", status: "no_data" }
		]);

		const igdb = resultOf(region, "IGDB");
		expect(within(igdb).getByText("No data")).toBeInTheDocument();
		expect(igdb).toHaveTextContent(
			/on IGDB but doesn't have a user score yet/
		);
	});

	it("shows the saved IGDB score and ignores a duration the source never sends", async () => {
		const region = await renderResults([
			{ source: "igdb", status: "updated", score: 74, duration: 12 }
		]);

		const igdb = resultOf(region, "IGDB");
		expect(within(igdb).getByText("Updated: Score 74")).toBeInTheDocument();
		expect(igdb).not.toHaveTextContent(/ h$/);
	});

	it("falls back to a plain Updated label when IGDB sends a garbage score", async () => {
		const region = await renderResults([
			{
				source: "igdb",
				status: "updated",
				score: "74" as unknown as number
			}
		]);

		expect(
			within(resultOf(region, "IGDB")).getByText("Updated")
		).toBeInTheDocument();
	});

	it("keeps each source in its own row when the results arrive out of order and mixed", async () => {
		const region = await renderResults([
			{ source: "igdb", status: "failed", errorCode: "IGDB_UNAVAILABLE" },
			{ source: "hltb", status: "updated", duration: 21 },
			{ source: "metacritic", status: "not_found" }
		]);

		const rows = within(region).getAllByRole("listitem");
		expect(rows).toHaveLength(3);
		expect(rows[0]).toHaveTextContent("IGDB");
		expect(rows[0]).toHaveTextContent("Error code: IGDB_UNAVAILABLE");
		expect(rows[1]).toHaveTextContent("Updated: 21 h");
		expect(rows[2]).toHaveTextContent("No Metacritic page was found");
	});

	it("explains a deadline failure for IGDB with the same wording as the other sources", async () => {
		const region = await renderResults([
			{
				source: "igdb",
				status: "failed",
				errorCode: "EXTERNAL_DATA_DEADLINE_EXCEEDED"
			}
		]);

		expect(resultOf(region, "IGDB")).toHaveTextContent(
			/Ran out of time: the source was busy/
		);
	});
});

describe("AdminExternalDataDialog sources", () => {
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

	function gameWith(overrides: Partial<Record<"scores" | "times", unknown>>) {
		return { ...game, ...overrides } as unknown as Game;
	}

	it("offers IGDB as a user score source and preselects it when the game has no IGDB score", async () => {
		await render(AdminExternalDataDialog, {
			inputs: { game, state: { status: "idle" } }
		});

		expect(
			screen.getByRole("checkbox", { name: "IGDB — user score" })
		).toBeChecked();
	});

	it("does not preselect IGDB and shows its current score when the game already has one", async () => {
		await render(AdminExternalDataDialog, {
			inputs: {
				game: gameWith({ scores: [{ source: "igdb", score: 74 }] }),
				state: { status: "idle" }
			}
		});

		expect(
			screen.getByRole("checkbox", { name: "IGDB — user score" })
		).not.toBeChecked();
		expect(screen.getByText("Current: 74")).toBeInTheDocument();
	});

	it("does not mistake a Metacritic score for an IGDB one", async () => {
		await render(AdminExternalDataDialog, {
			inputs: {
				game: gameWith({
					scores: [{ source: "metacritic", score: 90 }]
				}),
				state: { status: "idle" }
			}
		});

		expect(
			screen.getByRole("checkbox", { name: "IGDB — user score" })
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "Metacritic — score" })
		).not.toBeChecked();
	});

	it("submits IGDB together with the other missing sources in catalog order", async () => {
		const user = userEvent.setup();
		const submitted = vi.fn();
		await render(AdminExternalDataDialog, {
			inputs: { game, state: { status: "idle" } },
			on: { submitted }
		});

		await user.click(
			screen.getByRole("checkbox", { name: "IGDB — user score" })
		);
		await user.click(
			screen.getByRole("checkbox", { name: "IGDB — user score" })
		);
		await user.click(
			screen.getByRole("button", { name: "Refresh selected" })
		);

		expect(submitted).toHaveBeenCalledTimes(1);
		expect(submitted).toHaveBeenCalledWith(["metacritic", "hltb", "igdb"]);
	});
});
