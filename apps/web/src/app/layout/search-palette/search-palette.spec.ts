import "@testing-library/jest-dom/vitest";

import { provideRouter, Router } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { type Observable, of, Subject } from "rxjs";

import { type BacklogEntry } from "../../core/models";
import { GlobalSearchService } from "../../core/services/global-search";
import { type SearchResults } from "../../core/services/global-search.model";
import { type UserResult } from "../../core/services/users.model";
import { SearchPalette } from "./search-palette";

function libraryEntry(id: string, title: string, platform: string) {
	return {
		id,
		status: "not_started",
		isPublic: true,
		game: { id: `g-${id}`, code: title.toLowerCase(), title, isDlc: false },
		platform: { id: `p-${platform}`, abbreviation: platform }
	} as unknown as BacklogEntry;
}

function player(id: string, username: string) {
	return {
		id,
		username,
		name: username,
		avatarUrl: null,
		role: "user",
		hasPremium: false,
		profileVisibility: "public"
	} as unknown as UserResult;
}

const CASTLE_RESULTS: SearchResults = {
	library: {
		entries: [
			libraryEntry("b1", "Castlevania Rebirth", "Wii"),
			libraryEntry("b2", "Castlevania SOTN", "PS1"),
			libraryEntry("b3", "Castle of Illusion", "MD"),
			libraryEntry("b4", "Castle Crashers", "X360")
		],
		total: 4
	},
	games: [{ id: "g9", title: "Castlevania: Rondo of Blood", code: "rondo" }],
	users: [player("u1", "castlemaster")],
	lists: [{ id: "l1", name: "Every Castlevania ranked" }]
};

const EMPTY_RESULTS: SearchResults = {
	library: { entries: [], total: 0 },
	games: [],
	users: [],
	lists: []
};

describe("SearchPalette", () => {
	let search: ReturnType<
		typeof vi.fn<(query: string) => Observable<SearchResults>>
	>;

	async function renderPalette(
		answer: (query: string) => Observable<SearchResults> = () =>
			of(CASTLE_RESULTS)
	) {
		search = vi.fn(answer);
		const closed = vi.fn();
		const view = await render(SearchPalette, {
			providers: [
				provideRouter([]),
				{ provide: GlobalSearchService, useValue: { search } }
			],
			on: { closed }
		});
		const router = view.fixture.debugElement.injector.get(Router);
		const navigate = vi.spyOn(router, "navigate").mockResolvedValue(true);
		return { ...view, closed, navigate };
	}

	const field = () =>
		screen.getByRole("combobox", {
			name: "Search Completr"
		}) as HTMLInputElement;
	const options = () => screen.queryAllByRole("option");
	const activeOption = () =>
		document.getElementById(
			field().getAttribute("aria-activedescendant") ?? ""
		);

	it("opens with the focus in the field and asks for 2 characters before searching", async () => {
		await renderPalette();

		expect(
			screen.getByRole("dialog", { name: "Search Completr" })
		).toBeInTheDocument();
		await vi.waitFor(() => expect(field()).toHaveFocus());
		expect(
			screen.getByText(/Type at least 2 characters/)
		).toBeInTheDocument();

		await userEvent.setup().type(field(), "c");

		await new Promise(resolve => setTimeout(resolve, 350));
		expect(search).not.toHaveBeenCalled();
		expect(options()).toHaveLength(0);
	});

	it("lists your library first, then games, players and lists, with the catalog last", async () => {
		const user = userEvent.setup();
		await renderPalette();

		await user.type(field(), "castle");

		await screen.findByText("castlemaster");
		expect(
			screen
				.getAllByRole("heading", { level: 3 })
				.map(heading => heading.textContent?.trim())
		).toEqual(["In your library", "Games", "Players", "Lists"]);
		expect(options().at(-1)).toHaveTextContent(
			'Search the full catalog for "castle"'
		);
		expect(search).toHaveBeenCalledTimes(1);
		expect(search).toHaveBeenLastCalledWith("castle");

		const library = screen.getByRole("group", { name: "In your library" });
		expect(within(library).getAllByRole("option")).toHaveLength(4);
		expect(within(library).getByText("Your run · Wii")).toBeInTheDocument();
		expect(
			within(library).getByRole("option", {
				name: /See all 4 in My Games/
			})
		).toHaveAttribute("href", "/backlog?search=castle");
		expect(
			within(library).getAllByText("Castle", { selector: "mark" })
		).toHaveLength(3);
		expect(
			screen.getByRole("option", {
				name: /Search the full catalog for "castle"/
			})
		).toHaveAttribute("href", "/games?q=castle");
	});

	it("narrows the results to one scope without leaving the palette", async () => {
		const user = userEvent.setup();
		await renderPalette();
		await user.type(field(), "castle");
		await screen.findByText("castlemaster");

		await user.click(screen.getByRole("radio", { name: /Players/ }));

		expect(
			screen.getByRole("heading", { name: "Players" })
		).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "In your library" })
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("option", { name: /full catalog/ })
		).not.toBeInTheDocument();
		expect(search).toHaveBeenCalledTimes(1);

		await user.click(screen.getByRole("radio", { name: /My library/ }));

		expect(
			screen
				.getAllByRole("option")
				.map(option => option.textContent?.trim())
		).toEqual(
			expect.arrayContaining([expect.stringContaining("Castle Crashers")])
		);
		expect(
			screen.queryByRole("option", { name: /See all/ })
		).not.toBeInTheDocument();
	});

	it("moves through every result with the arrows, wraps around and opens the active one with Enter", async () => {
		const user = userEvent.setup();
		const { navigate, closed } = await renderPalette();
		await user.type(field(), "castle");
		await screen.findByText("castlemaster");

		expect(activeOption()).toHaveTextContent("Castlevania Rebirth");

		await user.keyboard("{ArrowUp}");
		expect(activeOption()).toHaveTextContent(
			'Search the full catalog for "castle"'
		);

		await user.keyboard("{ArrowDown}{ArrowDown}");
		expect(activeOption()).toHaveTextContent("Castlevania SOTN");
		expect(activeOption()).toHaveAttribute("aria-selected", "true");

		await user.keyboard("{Enter}");

		expect(navigate).toHaveBeenCalledWith(["/games/castlevania sotn"], {
			queryParams: undefined
		});
		expect(closed).toHaveBeenCalledTimes(1);
	});

	it("opens Browse with the query when Enter lands on the catalog row", async () => {
		const user = userEvent.setup();
		const { navigate } = await renderPalette(() => of(EMPTY_RESULTS));

		await user.type(field(), "zzzz");
		expect(
			await screen.findByText(/No matches for "zzzz"/)
		).toBeInTheDocument();
		await user.keyboard("{Enter}");

		expect(navigate).toHaveBeenCalledWith(["/games"], {
			queryParams: { q: "zzzz" }
		});
	});

	it("only searches the last query when the user types fast and ignores a late answer", async () => {
		const answers = new Map<string, Subject<SearchResults>>();
		await renderPalette(query => {
			const answer = new Subject<SearchResults>();
			answers.set(query, answer);
			return answer;
		});

		for (const value of ["c", "ca", "cas", "cast"]) {
			field().value = value;
			field().dispatchEvent(new Event("input"));
		}
		await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(1));
		expect(search).toHaveBeenLastCalledWith("cast");

		field().value = "castle";
		field().dispatchEvent(new Event("input"));
		await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(2));

		answers.get("cast")?.next({
			...EMPTY_RESULTS,
			games: [{ id: "stale", title: "Stale result", code: "stale" }]
		});
		answers.get("castle")?.next(CASTLE_RESULTS);

		expect(await screen.findByText("castlemaster")).toBeInTheDocument();
		expect(screen.queryByText("Stale result")).not.toBeInTheDocument();
	});

	it("clears the text on the first Escape and closes on the second", async () => {
		const user = userEvent.setup();
		const { closed } = await renderPalette();
		await user.type(field(), "castle");

		await user.keyboard("{Escape}");
		expect(field()).toHaveValue("");
		expect(closed).not.toHaveBeenCalled();

		await user.keyboard("{Escape}");
		expect(closed).toHaveBeenCalledTimes(1);
	});

	it("closes only once when Cancel is clicked repeatedly", async () => {
		const user = userEvent.setup();
		const { closed } = await renderPalette();

		await user.dblClick(screen.getByRole("button", { name: "Cancel" }));
		await user.click(screen.getByRole("button", { name: "Cancel" }));

		expect(closed).toHaveBeenCalledTimes(1);
	});

	it("drops the results when the text goes back under 2 characters", async () => {
		const user = userEvent.setup();
		await renderPalette();
		await user.type(field(), "castle");
		await screen.findByText("castlemaster");

		await user.clear(field());
		await user.type(field(), "c");

		expect(options()).toHaveLength(0);
		expect(
			screen.getByText(/Type at least 2 characters/)
		).toBeInTheDocument();
	});
});
