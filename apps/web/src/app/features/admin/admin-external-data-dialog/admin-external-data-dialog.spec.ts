import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/angular";

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
});
