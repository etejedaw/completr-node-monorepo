import "@testing-library/jest-dom/vitest";

import { render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { Subject } from "rxjs";

import { type Game } from "../../../core/models";
import { GamesService } from "../../../core/services/games";
import { CatalogGamePicker } from "./catalog-game-picker";

const DEBOUNCE_WAIT = { timeout: 2000 };

function game(id: string, title: string): Game {
	return {
		id,
		title,
		code: id,
		isDlc: false,
		releaseAt: "2020-01-01"
	} as Game;
}

describe("CatalogGamePicker", () => {
	let pending: { term: string; response: Subject<Game[]> }[];

	beforeEach(() => {
		pending = [];
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		}));
	});

	afterEach(() => vi.unstubAllGlobals());

	async function renderPicker(inputs: Record<string, unknown> = {}) {
		const picked = vi.fn();
		await render(CatalogGamePicker, {
			inputs: { label: "Search the catalog", ...inputs },
			on: { picked },
			providers: [
				{
					provide: GamesService,
					useValue: {
						searchLocal: (term: string) => {
							const response = new Subject<Game[]>();
							pending.push({ term, response });
							return response;
						},
						search: vi.fn()
					}
				}
			]
		});
		return {
			picked,
			searchBox: screen.getByRole("textbox", {
				name: "Search the catalog"
			})
		};
	}

	async function requestFor(term: string) {
		await waitFor(
			() => expect(pending.some(call => call.term === term)).toBe(true),
			DEBOUNCE_WAIT
		);
		return pending.filter(call => call.term === term).at(-1)!.response;
	}

	it("keeps the newest answer when an older search answers late", async () => {
		const user = userEvent.setup();
		const { searchBox } = await renderPicker();

		await user.type(searchBox, "ze");
		const stale = await requestFor("ze");
		await user.type(searchBox, "lda");
		const fresh = await requestFor("zelda");

		fresh.next([game("g2", "Zelda")]);
		stale.next([game("g1", "Zebra Quest")]);

		expect(await screen.findByText("Zelda")).toBeInTheDocument();
		expect(screen.queryByText("Zebra Quest")).not.toBeInTheDocument();
	});

	it("shows the empty state when the search fails", async () => {
		const user = userEvent.setup();
		const { searchBox } = await renderPicker();

		await user.type(searchBox, "zelda");
		const response = await requestFor("zelda");
		response.error(new Error("boom"));

		expect(await screen.findByText("No games found")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "New search" }));
		expect(searchBox).toHaveValue("");
		expect(searchBox).toHaveFocus();
	});

	it("emits the game once per click even on a double click", async () => {
		const user = userEvent.setup();
		const { searchBox, picked } = await renderPicker();

		await user.type(searchBox, "zelda");
		(await requestFor("zelda")).next([game("g2", "Zelda")]);
		await user.dblClick(
			await screen.findByRole("button", { name: "Select Zelda" })
		);

		expect(picked.mock.calls.every(([chosen]) => chosen.id === "g2")).toBe(
			true
		);
		expect(picked.mock.calls.length).toBeLessThanOrEqual(2);
	});

	it("walks the results with the arrow keys and returns with Escape", async () => {
		const user = userEvent.setup();
		const { searchBox, picked } = await renderPicker();

		await user.type(searchBox, "zelda");
		(await requestFor("zelda")).next([
			game("g1", "Zelda One"),
			game("g2", "Zelda Two")
		]);
		const first = await screen.findByRole("button", {
			name: "Select Zelda One"
		});
		const second = screen.getByRole("button", { name: "Select Zelda Two" });

		await user.keyboard("{ArrowDown}");
		expect(first).toHaveFocus();
		await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
		expect(second).toHaveFocus();
		await user.keyboard("{ArrowUp}{ArrowUp}");
		expect(searchBox).toHaveFocus();
		await user.keyboard("{ArrowDown}{Escape}");
		expect(searchBox).toHaveFocus();
		await user.keyboard("{ArrowDown}{Enter}");
		expect(picked).toHaveBeenCalledTimes(1);
		expect(picked.mock.calls[0][0].id).toBe("g1");
	});

	it("ignores arrow keys when there are no results", async () => {
		const user = userEvent.setup();
		const { searchBox } = await renderPicker();

		await user.type(searchBox, "{ArrowDown}{ArrowUp}{Escape}");

		expect(searchBox).toHaveFocus();
	});

	it("does not search for blank or one-character input and keeps garbage as plain text", async () => {
		const user = userEvent.setup();
		const { searchBox } = await renderPicker();

		await user.type(searchBox, "   ");
		await user.clear(searchBox);
		await user.type(searchBox, "a");
		await new Promise(resolve => setTimeout(resolve, 600));
		expect(pending).toHaveLength(0);

		const garbage = "<img src=x onerror=alert(1)> %00 ✨ ' OR 1=1 --";
		await user.clear(searchBox);
		await user.type(searchBox, garbage);
		const response = await requestFor(garbage.trim());
		response.next([]);

		expect(await screen.findByText("No games found")).toBeInTheDocument();
		expect(document.querySelector("img")).toBeNull();
	});

	it("hides excluded games and caps the list", async () => {
		const user = userEvent.setup();
		const { searchBox } = await renderPicker({ excludedIds: ["g0"] });

		await user.type(searchBox, "game");
		(await requestFor("game")).next(
			Array.from({ length: 12 }, (_, index) =>
				game(`g${index}`, `Game ${index}`)
			)
		);

		await screen.findByRole("button", { name: "Select Game 1" });
		expect(
			screen.queryByRole("button", { name: "Select Game 0" })
		).not.toBeInTheDocument();
		expect(
			screen.getAllByRole("button", { name: /^Select / })
		).toHaveLength(8);
	});
});
