import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import {
	ActivatedRoute,
	convertToParamMap,
	provideRouter,
	Router
} from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { BehaviorSubject, of, Subject, throwError } from "rxjs";

import {
	type Game,
	type Genre,
	type List,
	type Platform
} from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { ViewportService } from "../../../core/services/viewport";
import { ListsService } from "../../lists/lists";
import { GamesService } from "../games";
import { GamesBrowse } from "./games-browse";

const game = (id: string, overrides: Partial<Game> = {}) =>
	({
		id,
		code: id,
		title: `Game ${id}`,
		isDlc: false,
		backgroundUrl: `https://img.test/${id}.jpg`,
		coverUrl: `https://img.test/${id}-cover.jpg`,
		genres: [],
		platforms: [],
		...overrides
	}) as Game;

const list = (id: string): List =>
	({
		id,
		name: `List ${id}`,
		items: [],
		previewItems: [],
		isPublic: true,
		userId: "u1",
		scoreSource: "completr",
		durationSource: "completr"
	}) as unknown as List;

const genres: Genre[] = [
	{ id: "1", code: "rpg", name: "RPG" },
	{ id: "2", code: "action", name: "Action" }
];

const platforms: Platform[] = [
	{ id: "1", code: "pc", name: "PC", abbreviation: "PC" }
];

const latestGames = [game("a"), game("b"), game("c")];

describe("GamesBrowse", () => {
	const isMobile = signal(false);
	const user = signal<{ role: string } | null>(null);
	const queryParams = new BehaviorSubject(convertToParamMap({}));
	const getGames = vi.fn();
	const search = vi.fn();
	const searchLocal = vi.fn();
	const getGenres = vi.fn();
	const getPlatforms = vi.fn();
	const getLatestReviewed = vi.fn();
	const getOfficial = vi.fn();
	const getRecent = vi.fn();
	let navigate: ReturnType<typeof vi.spyOn>;
	let filtered: { games: Game[]; total: number };

	function filteredCalls() {
		return getGames.mock.calls
			.map(([query]) => query as Record<string, unknown>)
			.filter(query => query["limit"] === 50);
	}

	function lastFiltered() {
		return filteredCalls().at(-1);
	}

	function lastNavigation() {
		return navigate.mock.lastCall?.[1] as {
			queryParams: Record<string, string | null>;
			queryParamsHandling: string;
			replaceUrl: boolean;
		};
	}

	async function renderBrowse(initialParams: Record<string, string> = {}) {
		queryParams.next(convertToParamMap(initialParams));
		const view = await render(GamesBrowse, {
			providers: [
				provideRouter([]),
				{
					provide: GamesService,
					useValue: {
						getGames,
						search,
						searchLocal,
						getGenres,
						getPlatforms,
						getLatestReviewed
					}
				},
				{
					provide: ListsService,
					useValue: { getOfficial, getRecent }
				},
				{ provide: AuthService, useValue: { user } },
				{ provide: ViewportService, useValue: { isMobile } },
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: { queryParamMap: queryParams.value },
						queryParamMap: queryParams.asObservable()
					}
				}
			]
		});
		return view;
	}

	async function typeSearch(text: string) {
		await userEvent.type(
			screen.getByRole("textbox", { name: "Search the catalog" }),
			text
		);
	}

	function chip(name: string) {
		return screen.getByRole("button", { name, pressed: false });
	}

	async function openFilters() {
		await userEvent.click(screen.getByRole("button", { name: /Filters/ }));
	}

	beforeEach(() => {
		isMobile.set(false);
		user.set(null);
		filtered = { games: [game("f1"), game("f2")], total: 2 };
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
		vi.spyOn(Math, "random").mockReturnValue(0);
		navigate = vi
			.spyOn(Router.prototype, "navigate")
			.mockResolvedValue(true);
		getGames
			.mockReset()
			.mockImplementation((query: Record<string, unknown>) => {
				if (query["limit"] === 50)
					return of({ data: { ...filtered, limit: 50, offset: 0 } });
				if (query["genre"])
					return of({
						data: {
							games: [game("spot1")],
							total: 1,
							limit: 16,
							offset: 0
						}
					});
				return of({
					data: { games: latestGames, total: 3, limit: 16, offset: 0 }
				});
			});
		search.mockReset().mockReturnValue(of([]));
		searchLocal.mockReset().mockReturnValue(of([]));
		getGenres.mockReset().mockReturnValue(of(genres));
		getPlatforms.mockReset().mockReturnValue(of(platforms));
		getLatestReviewed.mockReset().mockReturnValue(of([game("rev1")]));
		getOfficial.mockReset().mockReturnValue(of([list("official1")]));
		getRecent.mockReset().mockReturnValue(of([list("recent1")]));
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	describe("discover", () => {
		it("loads every shelf on init", async () => {
			await renderBrowse();

			expect(getGames).toHaveBeenCalledWith({
				limit: 16,
				sort_by: "createdAt",
				sort_order: "desc"
			});
			expect(getLatestReviewed).toHaveBeenCalledWith(16);
			expect(getOfficial).toHaveBeenCalledWith(12);
			expect(getRecent).toHaveBeenCalledWith(12);
			expect(
				screen.getByRole("heading", { name: "Just added" })
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { name: "Recently reviewed" })
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { name: "Completr Official" })
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { name: "Community lists" })
			).toBeInTheDocument();
		});

		it("features the games that have a background in the hero", async () => {
			getGames.mockImplementation(() =>
				of({
					data: {
						games: [
							game("nobg", { backgroundUrl: undefined }),
							game("with")
						],
						total: 2,
						limit: 16,
						offset: 0
					}
				})
			);

			await renderBrowse();

			const hero = screen.getByRole("region", { name: "Featured games" });
			expect(
				within(hero).getByRole("heading", { level: 1 })
			).toHaveTextContent("Game with");
		});

		it("skips the hero when no game has a background", async () => {
			getGames.mockImplementation(() =>
				of({
					data: {
						games: [game("nobg", { backgroundUrl: undefined })],
						total: 1,
						limit: 16,
						offset: 0
					}
				})
			);

			await renderBrowse();

			expect(
				screen.queryByRole("region", { name: "Featured games" })
			).not.toBeInTheDocument();
		});

		it("shows loading skeletons until the latest games arrive", async () => {
			const latest = new Subject<unknown>();
			getGames.mockReturnValue(latest);

			const view = await renderBrowse();

			expect(screen.getByLabelText("Loading")).toHaveAttribute(
				"aria-busy",
				"true"
			);
			expect(
				screen.queryByRole("heading", { name: "Just added" })
			).not.toBeInTheDocument();
			latest.next({
				data: { games: latestGames, total: 3, limit: 16, offset: 0 }
			});
			view.detectChanges();
			expect(screen.queryByLabelText("Loading")).not.toBeInTheDocument();
			expect(
				screen.getByRole("heading", { name: "Just added" })
			).toBeInTheDocument();
		});

		it("drops the skeleton and the shelf when the latest games fail", async () => {
			getGames.mockImplementation((query: Record<string, unknown>) =>
				query["sort_by"] === "createdAt"
					? throwError(() => new Error("boom"))
					: of({
							data: { games: [], total: 0, limit: 16, offset: 0 }
						})
			);

			await renderBrowse();

			expect(screen.queryByLabelText("Loading")).not.toBeInTheDocument();
			expect(
				screen.queryByRole("heading", { name: "Just added" })
			).not.toBeInTheDocument();
			expect(
				screen.getByRole("heading", { name: "Recently reviewed" })
			).toBeInTheDocument();
		});

		it("omits shelves with no content", async () => {
			getLatestReviewed.mockReturnValue(of([]));
			getOfficial.mockReturnValue(of([]));
			getRecent.mockReturnValue(of([]));

			await renderBrowse();

			expect(
				screen.queryByRole("heading", { name: "Recently reviewed" })
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("heading", { name: "Completr Official" })
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("heading", { name: "Community lists" })
			).not.toBeInTheDocument();
		});

		it("spotlights a random genre and opens it from See all", async () => {
			await renderBrowse();

			expect(getGames).toHaveBeenCalledWith({
				limit: 16,
				genre: "rpg",
				sort_by: "random"
			});
			expect(
				screen.getByRole("heading", { name: "RPG" })
			).toBeInTheDocument();

			await userEvent.click(
				screen.getByRole("button", { name: /See all/ })
			);

			expect(
				await screen.findByRole("heading", { name: "RPG games" })
			).toBeInTheDocument();
			expect(lastFiltered()).toMatchObject({ genres: "rpg" });
		});

		it("tries another genre when the first one has no games", async () => {
			getGames.mockImplementation((query: Record<string, unknown>) => {
				if (query["limit"] === 50)
					return of({ data: { ...filtered, limit: 50, offset: 0 } });
				if (query["genre"] === "rpg")
					return of({
						data: { games: [], total: 0, limit: 16, offset: 0 }
					});
				if (query["genre"])
					return of({
						data: {
							games: [game("act1")],
							total: 1,
							limit: 16,
							offset: 0
						}
					});
				return of({
					data: { games: latestGames, total: 3, limit: 16, offset: 0 }
				});
			});

			await renderBrowse();

			expect(
				screen.getByRole("heading", { name: "Action" })
			).toBeInTheDocument();
		});

		it.todo(
			"survives a failing spotlight request: loadRandomGenre subscribes without an error handler, so the error is unhandled"
		);

		it("gives up on the spotlight after five empty genres", async () => {
			const many = Array.from({ length: 8 }, (_, i) => ({
				id: String(i),
				code: `g${i}`,
				name: `Genre ${i}`
			}));
			getGenres.mockReturnValue(of(many));
			getGames.mockImplementation((query: Record<string, unknown>) => {
				if (query["genre"])
					return of({
						data: { games: [], total: 0, limit: 16, offset: 0 }
					});
				return of({
					data: { games: latestGames, total: 3, limit: 16, offset: 0 }
				});
			});

			await renderBrowse();

			const spotlightCalls = getGames.mock.calls.filter(
				([query]) => query.genre
			);
			expect(spotlightCalls).toHaveLength(5);
			expect(
				screen.queryByText("Genre spotlight")
			).not.toBeInTheDocument();
		});
	});

	describe("search", () => {
		it("stays in discover until two characters are typed", async () => {
			await renderBrowse();

			await typeSearch("z");

			expect(
				screen.queryByRole("heading", { name: /Results for/ })
			).not.toBeInTheDocument();
			expect(
				screen.getByRole("heading", { name: "Just added" })
			).toBeInTheDocument();
		});

		it("shows the term and skeletons while searching, then waits for the debounce", async () => {
			await renderBrowse();

			await typeSearch("ze");

			expect(
				screen.getByRole("heading", { name: 'Results for "ze"' })
			).toBeInTheDocument();
			expect(screen.getByLabelText("Loading games")).toBeInTheDocument();
			expect(searchLocal).not.toHaveBeenCalled();
			await waitFor(() => expect(searchLocal).toHaveBeenCalledWith("ze"));
		});

		it("lists the local results with a count", async () => {
			searchLocal.mockReturnValue(of([game("z1"), game("z2")]));
			await renderBrowse();

			await typeSearch("ze");

			expect(await screen.findByRole("status")).toHaveTextContent(
				"2 games found"
			);
			expect(screen.getByText("Game z1")).toBeInTheDocument();
			expect(screen.getByText("Game z2")).toBeInTheDocument();
			expect(search).not.toHaveBeenCalled();
		});

		it("uses the singular for a single result", async () => {
			searchLocal.mockReturnValue(of([game("z1")]));
			await renderBrowse();

			await typeSearch("ze");

			expect(await screen.findByRole("status")).toHaveTextContent(
				"1 game found"
			);
		});

		it("falls back to RAWG when the catalog has no match and says so while waiting", async () => {
			const online = new Subject<Game[]>();
			search.mockReturnValue(online);
			const view = await renderBrowse();

			await typeSearch("ze");

			expect(
				await screen.findByText(/Not in Completr yet — searching RAWG/)
			).toBeInTheDocument();
			expect(search).toHaveBeenCalledWith("ze");
			online.next([game("imported", { justImported: true })]);
			view.detectChanges();
			expect(
				await screen.findByText("Game imported")
			).toBeInTheDocument();
			expect(screen.getByText("New from RAWG")).toBeInTheDocument();
			expect(
				screen.queryByText(/Not in Completr yet/)
			).not.toBeInTheDocument();
		});

		it("shows an empty state with a hint when nothing is found", async () => {
			await renderBrowse();

			await typeSearch("zzz");

			expect(
				await screen.findByText("No games found")
			).toBeInTheDocument();
			expect(
				screen.getByText(/search RAWG to import it/)
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Reset filters" })
			).not.toBeInTheDocument();
		});

		it("searches RAWG on demand and replaces the results", async () => {
			searchLocal.mockReturnValue(of([game("z1")]));
			const online = new Subject<Game[]>();
			search.mockReturnValue(online);
			const view = await renderBrowse();
			await typeSearch("ze");
			await screen.findByText("Game z1");

			await userEvent.click(
				screen.getByRole("button", { name: "Not here? Search RAWG" })
			);

			expect(search).toHaveBeenCalledWith("ze", true);
			expect(
				screen.getByRole("button", { name: "Searching RAWG..." })
			).toBeDisabled();
			online.next([game("rawg1")]);
			view.detectChanges();
			expect(screen.getByText("Game rawg1")).toBeInTheDocument();
			expect(screen.queryByText("Game z1")).not.toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Not here? Search RAWG" })
			).toBeEnabled();
		});

		it("returns to discover when the search is cleared", async () => {
			await renderBrowse();
			await typeSearch("ze");

			await userEvent.click(
				screen.getByRole("button", { name: "Clear search" })
			);

			expect(
				await screen.findByRole("heading", { name: "Just added" })
			).toBeInTheDocument();
		});

		it("runs the search from the q query param", async () => {
			searchLocal.mockReturnValue(of([game("z1")]));

			await renderBrowse({ q: "zelda" });

			expect(
				screen.getByRole("heading", { name: 'Results for "zelda"' })
			).toBeInTheDocument();
			await waitFor(() =>
				expect(searchLocal).toHaveBeenCalledWith("zelda")
			);
			expect(await screen.findByText("Game z1")).toBeInTheDocument();
		});

		it("keeps the term in the URL only when it is searchable", async () => {
			await renderBrowse();

			await typeSearch("z");
			expect(lastNavigation().queryParams["q"]).toBeNull();
			await typeSearch("e");
			expect(lastNavigation().queryParams["q"]).toBe("ze");
		});
	});

	describe("filters", () => {
		it("toggles the filters panel", async () => {
			await renderBrowse();
			const toggle = screen.getByRole("button", { name: /Filters/ });
			expect(toggle).toHaveAttribute("aria-expanded", "false");

			await userEvent.click(toggle);

			expect(toggle).toHaveAttribute("aria-expanded", "true");
			expect(
				screen.getByRole("region", { name: "Filters" })
			).toBeInTheDocument();
			await userEvent.click(toggle);
			expect(
				screen.queryByRole("region", { name: "Filters" })
			).not.toBeInTheDocument();
		});

		it("switches to the filtered view and queries with the selected genre", async () => {
			await renderBrowse();
			await openFilters();

			await userEvent.click(chip("RPG"));

			expect(
				await screen.findByRole("heading", { name: "RPG games" })
			).toBeInTheDocument();
			expect(lastFiltered()).toEqual({
				limit: 50,
				offset: 0,
				sort_by: "createdAt",
				sort_order: "desc",
				genres: "rpg"
			});
			expect(screen.getByText("Game f1")).toBeInTheDocument();
			expect(screen.getByRole("status")).toHaveTextContent(
				"2 games · sorted by recently added"
			);
		});

		it("titles the view Filtered games when several genres are selected", async () => {
			await renderBrowse();
			await openFilters();

			await userEvent.click(chip("RPG"));
			await userEvent.click(chip("Action"));

			expect(
				await screen.findByRole("heading", { name: "Filtered games" })
			).toBeInTheDocument();
			expect(lastFiltered()).toMatchObject({ genres: "rpg,action" });
		});

		it("sends platform, year, rating, duration and type filters", async () => {
			await renderBrowse();
			await openFilters();

			await userEvent.click(chip("PC"));
			await userEvent.type(
				screen.getByLabelText("Release year, From"),
				"1990"
			);
			await userEvent.type(
				screen.getByLabelText("Release year, To"),
				"2005"
			);
			await userEvent.type(
				screen.getByLabelText("Hours to beat, Min"),
				"2"
			);
			await userEvent.type(
				screen.getByLabelText("Hours to beat, Max"),
				"30"
			);
			const [minimum, maximum] = screen.getAllByRole("slider");
			minimum.focus();
			await userEvent.keyboard("{Home}");
			maximum.focus();
			await userEvent.keyboard("{End}");
			await userEvent.click(screen.getByRole("radio", { name: "DLC" }));

			await waitFor(() =>
				expect(lastFiltered()).toEqual({
					limit: 50,
					offset: 0,
					sort_by: "createdAt",
					sort_order: "desc",
					platforms: "pc",
					release_year_from: 1990,
					release_year_to: 2005,
					min_score: 0.5,
					max_score: 5,
					min_duration: 2,
					max_duration: 30,
					is_dlc: true
				})
			);
		});

		it("counts each active filter group once in the badge", async () => {
			await renderBrowse();
			await openFilters();

			await userEvent.click(chip("RPG"));
			await userEvent.click(chip("Action"));
			await userEvent.type(
				screen.getByLabelText("Release year, From"),
				"1990"
			);
			await userEvent.type(
				screen.getByLabelText("Release year, To"),
				"2005"
			);

			expect(
				within(
					screen.getByRole("button", { name: /Filters/ })
				).getByText("2")
			).toBeInTheDocument();
		});

		it("mirrors the filters in the URL and drops the ones left at default", async () => {
			await renderBrowse();
			await openFilters();

			await userEvent.click(chip("RPG"));

			await waitFor(() =>
				expect(lastNavigation().queryParams["genres"]).toBe("rpg")
			);
			expect(lastNavigation()).toMatchObject({
				queryParamsHandling: "merge",
				replaceUrl: true
			});
			expect(lastNavigation().queryParams).toMatchObject({
				q: null,
				platforms: null,
				year_from: null,
				year_to: null,
				min_score: null,
				max_score: null,
				min_duration: null,
				max_duration: null,
				is_dlc: null,
				sort_by: null,
				sort_order: null
			});
		});

		it("shows a loading state while the filtered games load", async () => {
			const pending = new Subject<unknown>();
			await renderBrowse();
			getGames.mockReturnValue(pending);
			await openFilters();

			await userEvent.click(chip("RPG"));

			expect(screen.getByRole("status")).toHaveTextContent("Loading...");
			expect(screen.getByLabelText("Loading games")).toBeInTheDocument();
			pending.next({
				data: { games: [game("f1")], total: 1, limit: 50, offset: 0 }
			});
			expect(await screen.findByText("Game f1")).toBeInTheDocument();
			expect(screen.getByRole("status")).toHaveTextContent("1 game ·");
		});

		it("shows the empty state and resets from it", async () => {
			filtered = { games: [], total: 0 };
			await renderBrowse();
			await openFilters();
			await userEvent.click(chip("RPG"));

			expect(
				await screen.findByText("No games match these filters")
			).toBeInTheDocument();
			await userEvent.click(
				screen.getByRole("button", { name: "Reset filters" })
			);

			expect(
				await screen.findByRole("heading", { name: "Just added" })
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /Filters/ })
			).not.toHaveTextContent("1");
		});

		it("shows the empty state when the filtered request fails", async () => {
			await renderBrowse();
			getGames.mockReturnValue(throwError(() => new Error("boom")));
			await openFilters();

			await userEvent.click(chip("RPG"));

			expect(
				await screen.findByText("No games match these filters")
			).toBeInTheDocument();
			expect(screen.getByRole("status")).not.toHaveTextContent(
				"Loading..."
			);
		});

		it("resets every filter and the sort from the Reset button", async () => {
			await renderBrowse();
			await openFilters();
			await userEvent.click(chip("RPG"));
			await screen.findByRole("heading", { name: "RPG games" });

			await userEvent.click(
				screen.getByRole("button", { name: "Reset" })
			);

			expect(
				await screen.findByRole("heading", { name: "Just added" })
			).toBeInTheDocument();
			await waitFor(() =>
				expect(lastNavigation().queryParams["genres"]).toBeNull()
			);
		});

		it("resets from the Clear all filters button", async () => {
			await renderBrowse();
			await openFilters();
			await userEvent.click(chip("RPG"));

			await userEvent.click(
				screen.getByRole("button", { name: /Clear all filters/ })
			);

			expect(
				await screen.findByRole("heading", { name: "Just added" })
			).toBeInTheDocument();
		});

		it("follows genre changes in the URL", async () => {
			await renderBrowse();

			queryParams.next(convertToParamMap({ genres: "action" }));

			expect(
				await screen.findByRole("heading", { name: "Action games" })
			).toBeInTheDocument();
			expect(lastFiltered()).toMatchObject({ genres: "action" });
		});
	});

	describe("sorting", () => {
		it("stays in discover with the default sort", async () => {
			await renderBrowse();

			expect(
				screen.getAllByRole("button", { name: /Sort: Recently added/ })
			).toHaveLength(2);
			expect(
				screen.getByRole("heading", { name: "Just added" })
			).toBeInTheDocument();
		});

		it("applies the default order of the chosen sort and shows the filtered view", async () => {
			isMobile.set(true);
			await renderBrowse();

			await userEvent.click(
				screen.getAllByRole("button", {
					name: /Sort: Recently added/
				})[0]
			);
			await userEvent.click(
				await screen.findByRole("button", { name: /^Title/ })
			);

			expect(
				await screen.findByRole("heading", { name: "Filtered games" })
			).toBeInTheDocument();
			expect(lastFiltered()).toMatchObject({
				sort_by: "title",
				sort_order: "asc"
			});
			expect(screen.getByRole("status")).toHaveTextContent(
				"sorted by title"
			);
			await waitFor(() =>
				expect(lastNavigation().queryParams).toMatchObject({
					sort_by: "title",
					sort_order: "asc"
				})
			);
		});
	});

	describe("pagination", () => {
		beforeEach(() => {
			filtered = { games: [game("f1")], total: 120 };
		});

		it("shows the pager with the range of the current page", async () => {
			await renderBrowse();
			await openFilters();

			await userEvent.click(chip("RPG"));

			await screen.findByRole("heading", { name: "RPG games" });
			expect(screen.getByText("1–50 of 120")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Previous page" })
			).toBeDisabled();
			expect(
				screen.getByRole("button", { name: "Next page" })
			).toBeEnabled();
		});

		it("requests the next page with the active filters", async () => {
			await renderBrowse();
			await openFilters();
			await userEvent.click(chip("RPG"));
			await screen.findByRole("heading", { name: "RPG games" });

			await userEvent.click(
				screen.getByRole("button", { name: "Next page" })
			);

			expect(filteredCalls()).toContainEqual(
				expect.objectContaining({ offset: 50, genres: "rpg" })
			);
		});

		it.todo(
			"stays on page 2 after Next page: filtersEffect also tracks the signals read by loadFiltered (filteredOffset, searchQuery), so it fires again and resets the offset to 0"
		);

		it.todo(
			"does not reload the filtered games when only the page changes"
		);

		it("has no pager when everything fits in one page", async () => {
			filtered = { games: [game("f1")], total: 10 };
			await renderBrowse();
			await openFilters();

			await userEvent.click(chip("RPG"));

			await screen.findByRole("heading", { name: "RPG games" });
			expect(
				screen.queryByRole("button", { name: "Next page" })
			).not.toBeInTheDocument();
		});
	});

	describe("initial URL params", () => {
		it("restores every filter and the sort from the URL", async () => {
			await renderBrowse({
				genres: "rpg",
				platforms: "pc",
				year_from: "1990",
				year_to: "2005",
				min_score: "2",
				max_score: "4.5",
				min_duration: "1",
				max_duration: "20",
				is_dlc: "false",
				sort_by: "title",
				sort_order: "asc"
			});

			expect(lastFiltered()).toEqual({
				limit: 50,
				offset: 0,
				sort_by: "title",
				sort_order: "asc",
				genres: "rpg",
				platforms: "pc",
				release_year_from: 1990,
				release_year_to: 2005,
				min_score: 2,
				max_score: 4.5,
				min_duration: 1,
				max_duration: 20,
				is_dlc: false
			});
			expect(
				await screen.findByRole("heading", { name: "RPG games" })
			).toBeInTheDocument();
		});

		it("opens the filters panel when a non genre filter comes from the URL", async () => {
			await renderBrowse({ year_from: "1990" });

			expect(
				screen.getByRole("region", { name: "Filters" })
			).toBeInTheDocument();
			expect(screen.getByLabelText("Release year, From")).toHaveValue(
				1990
			);
		});

		it("keeps the panel closed when only genres come from the URL", async () => {
			await renderBrowse({ genres: "rpg" });

			expect(
				screen.queryByRole("region", { name: "Filters" })
			).not.toBeInTheDocument();
		});

		it("ignores an unknown sort field and a bad order", async () => {
			await renderBrowse({
				genres: "rpg",
				sort_by: "bogus",
				sort_order: "sideways"
			});

			expect(lastFiltered()).toMatchObject({
				sort_by: "createdAt",
				sort_order: "desc"
			});
		});

		it("treats an is_dlc value that is not true or false as unset", async () => {
			await renderBrowse({ genres: "rpg", is_dlc: "maybe" });

			expect(lastFiltered()).not.toHaveProperty("is_dlc");
		});

		it("stays in discover without params", async () => {
			await renderBrowse();

			expect(filteredCalls()).toHaveLength(0);
		});
	});

	describe("mobile filters sheet", () => {
		beforeEach(() => {
			isMobile.set(true);
		});

		it("opens as a dialog with the active filter count and a disabled Clear", async () => {
			await renderBrowse();

			await openFilters();

			const sheet = screen.getByRole("dialog", { name: "Filters" });
			expect(
				within(sheet).getByText(/Narrow the catalog/)
			).toBeInTheDocument();
			expect(
				within(sheet).getByRole("button", { name: /Clear/ })
			).toBeDisabled();
			expect(
				within(sheet).getByRole("button", { name: "Show results" })
			).toBeInTheDocument();
			expect(
				within(sheet).queryByRole("button", {
					name: /Clear all filters/
				})
			).not.toBeInTheDocument();
		});

		it("reports the result count and clears from the footer", async () => {
			filtered = { games: [game("f1")], total: 1 };
			await renderBrowse();
			await openFilters();
			const sheet = screen.getByRole("dialog", { name: "Filters" });

			await userEvent.click(
				within(sheet).getByRole("button", { name: "RPG" })
			);

			expect(
				within(sheet).getByText("1 filter active")
			).toBeInTheDocument();
			expect(
				await within(sheet).findByRole("button", {
					name: "Show 1 result"
				})
			).toBeInTheDocument();
			await userEvent.click(
				within(sheet).getByRole("button", { name: /Clear/ })
			);
			expect(
				within(sheet).getByText(/Narrow the catalog/)
			).toBeInTheDocument();
		});

		it("closes with the Show results button", async () => {
			await renderBrowse();
			await openFilters();

			await userEvent.click(
				screen.getByRole("button", { name: "Show results" })
			);

			expect(
				screen.queryByRole("dialog", { name: "Filters" })
			).not.toBeInTheDocument();
		});
	});

	describe("admin", () => {
		it.each(["moderator", "admin"])(
			"offers Add game to a %s",
			async role => {
				user.set({ role });

				await renderBrowse();

				expect(
					screen.getByRole("button", { name: "Add game" })
				).toBeInTheDocument();
			}
		);

		it("hides Add game from regular users and guests", async () => {
			user.set({ role: "user" });
			const view = await renderBrowse();
			expect(
				screen.queryByRole("button", { name: "Add game" })
			).not.toBeInTheDocument();

			user.set(null);
			view.detectChanges();
			expect(
				screen.queryByRole("button", { name: "Add game" })
			).not.toBeInTheDocument();
		});
	});
});
