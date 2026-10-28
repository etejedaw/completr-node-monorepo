import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import {
	ApplicationRef,
	ChangeDetectionStrategy,
	Component
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { RouterOutlet } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { type BacklogEntry } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { ToastContainer } from "../../../shared/components/toast-container/toast-container";
import { GameDetail } from "./game-detail";

@Component({
	selector: "app-game-detail-host",
	imports: [RouterOutlet, ToastContainer],
	template: `<router-outlet /><app-toast-container />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class GameDetailHost {}

const api = environment.apiUrl;
const viewer = {
	id: "u1",
	username: "ada",
	email: "ada@example.com",
	role: "user"
};
const platform = { id: "p1", name: "PC", abbreviation: "PC" };

const hades = {
	id: "g1",
	code: "hades",
	title: "Hades",
	isDlc: false,
	platforms: [platform],
	genres: [],
	scores: [{ source: "metacritic", score: 93 }],
	times: [{ source: "hltb", duration: 22 }],
	dlcs: [],
	parentGame: null,
	externalLinks: []
};

describe("GameDetail interaction", () => {
	let httpTesting: HttpTestingController;
	let runs: BacklogEntry[];
	let favoriteIds: string[];
	let wishlistIds: string[];
	let myLists: {
		id: string;
		name: string;
		isPublic: boolean;
		contains: boolean;
	}[];
	const createdRuns: unknown[] = [];
	const listUpdates: string[][] = [];
	const wishlistAdds: unknown[] = [];

	function gameLists() {
		return { data: { lists: [], myLists } };
	}

	function answer(req: TestRequest) {
		const { method, url, body } = req.request;
		if (url === `${api}/users/me`)
			return req.flush({ data: { user: viewer } });
		if (method === "GET" && url === `${api}/games/hades`)
			return req.flush({ data: { game: hades } });
		if (method === "PUT" && url === `${api}/games/g1/lists`) {
			const listIds = body.listIds as string[];
			listUpdates.push(listIds);
			myLists = myLists.map(list => ({
				...list,
				contains: listIds.includes(list.id)
			}));
			return req.flush(gameLists());
		}
		if (url === `${api}/games/g1/lists`) return req.flush(gameLists());
		if (url === `${api}/games/g1/reviews`)
			return req.flush({ data: { reviews: [] } });
		if (url === `${api}/score-sources`)
			return req.flush({
				data: {
					sources: [
						{ code: "metacritic", name: "Metacritic", scale: 100 }
					]
				}
			});
		if (url === `${api}/users/me/favorites/game-ids`)
			return req.flush({ data: { gameIds: favoriteIds } });
		if (method === "PUT" && url === `${api}/users/me/favorites`) {
			favoriteIds = body.gameIds;
			return req.flush({
				data: {
					favorites: favoriteIds.map((gameId, index) => ({
						id: `fav-${gameId}`,
						position: index + 1,
						game: { ...hades, id: gameId }
					}))
				}
			});
		}
		if (url === `${api}/users/me/wishlist/game-ids`)
			return req.flush({ data: { gameIds: wishlistIds } });
		if (method === "POST" && url === `${api}/users/me/wishlist`) {
			wishlistAdds.push(body);
			wishlistIds = [...wishlistIds, body.gameId];
			return req.flush({
				data: { wishlist: { id: "w1", game: hades, platform } }
			});
		}
		if (method === "GET" && url === `${api}/users/me/backlog`)
			return req.flush({ data: { backlog: runs, total: runs.length } });
		if (method === "POST" && url === `${api}/users/me/backlog`) {
			createdRuns.push(body);
			const run: BacklogEntry = {
				id: "b1",
				status: body.status,
				isPublic: true,
				score: body.score,
				duration: body.duration,
				game: {
					id: hades.id,
					code: hades.code,
					title: hades.title,
					isDlc: false
				},
				platform: {
					id: platform.id,
					abbreviation: platform.abbreviation
				}
			};
			runs = [run];
			return req.flush({ data: { backlog: run } });
		}
		if (url === `${api}/users/me/game-shelf`)
			return req.flush({ data: { gameShelf: [], total: 0 } });
		if (url === `${api}/users/me/queue`)
			return req.flush({ data: { queue: [], total: 0 } });
		if (url.endsWith("/mood-tags"))
			return req.flush({ data: { tags: [] } });
		throw new Error(`Unexpected request: ${method} ${url}`);
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = httpTesting.match(() => true);
			if (pending.length === 0) return;
			pending.forEach(answer);
		}
	}

	async function untilVisible(assertion: () => void) {
		await waitFor(() => {
			answerPending();
			assertion();
		});
	}

	function libraryActions() {
		return within(
			screen.getByRole("list", { name: "More library actions" })
		);
	}

	function heroActions() {
		const actions = libraryActions().getAllByRole("button")[0];
		return within(
			actions.closest("app-game-library-actions") as HTMLElement
		);
	}

	async function renderGame() {
		const { fixture } = await render(GameDetailHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [{ path: "games/:code", component: GameDetail }],
			initialRoute: "/games/hades"
		});
		TestBed.inject(ApplicationRef).components.push(fixture.componentRef);
		httpTesting = TestBed.inject(HttpTestingController);
		TestBed.inject(AuthService).loadUser().subscribe();
		await untilVisible(() =>
			expect(
				screen.getByRole("heading", { level: 1, name: "Hades" })
			).toBeInTheDocument()
		);
	}

	beforeEach(() => {
		localStorage.clear();
		runs = [];
		favoriteIds = [];
		wishlistIds = [];
		myLists = [
			{ id: "l1", name: "Roguelikes", isPublic: true, contains: false },
			{ id: "l2", name: "Couch co-op", isPublic: false, contains: false }
		];
		createdRuns.length = 0;
		listUpdates.length = 0;
		wishlistAdds.length = 0;
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		vi.stubGlobal(
			"IntersectionObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
	});

	afterEach(() => {
		answerPending();
		httpTesting.verify();
		vi.unstubAllGlobals();
	});

	it("adds the game to My Games and shows the new run status", async () => {
		const user = userEvent.setup();
		await renderGame();

		await user.click(
			heroActions().getByRole("button", { name: /Add to My Games/ })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Add to My Games"
		});
		await untilVisible(() =>
			expect(
				within(dialog).getByRole("button", { name: "Add" })
			).toBeEnabled()
		);

		await user.click(within(dialog).getByRole("button", { name: "Add" }));

		await untilVisible(() =>
			expect(
				heroActions().getByRole("button", { name: /Not Started/ })
			).toBeInTheDocument()
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(
			heroActions().queryByRole("button", { name: /Add to My Games/ })
		).not.toBeInTheDocument();
		expect(createdRuns).toEqual([
			expect.objectContaining({
				gameId: "g1",
				platformId: "p1",
				score: 4.65,
				duration: 22,
				status: "not_started"
			})
		]);
	});

	it("adds the game to a list from the lists dialog", async () => {
		const user = userEvent.setup();
		await renderGame();

		await user.click(
			libraryActions().getByRole("button", { name: /Lists/ })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Add to your lists"
		});
		const roguelikes = within(dialog).getByRole("checkbox", {
			name: /Roguelikes/
		});
		expect(roguelikes).not.toBeChecked();
		expect(within(dialog).getByLabelText("Private")).toBeInTheDocument();

		await user.click(roguelikes);
		expect(roguelikes).toBeChecked();
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		await untilVisible(() =>
			expect(
				libraryActions().getByRole("button", { name: /In 1 list/ })
			).toHaveAttribute("aria-pressed", "true")
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(listUpdates).toEqual([["l1"]]);
	});

	it("marks the game as favorite and unmarks it again", async () => {
		const user = userEvent.setup();
		await renderGame();

		const addFavorite = heroActions().getByRole("button", {
			name: "Add to favorites"
		});
		expect(addFavorite).toHaveAttribute("aria-pressed", "false");

		await user.click(addFavorite);
		await untilVisible(() =>
			expect(
				heroActions().getByRole("button", {
					name: "Remove from favorites"
				})
			).toHaveAttribute("aria-pressed", "true")
		);
		expect(favoriteIds).toEqual(["g1"]);

		await user.click(
			heroActions().getByRole("button", { name: "Remove from favorites" })
		);
		await untilVisible(() =>
			expect(
				heroActions().getByRole("button", { name: "Add to favorites" })
			).toHaveAttribute("aria-pressed", "false")
		);
		expect(favoriteIds).toEqual([]);
	});

	it("adds the game to Want to Get with a platform", async () => {
		const user = userEvent.setup();
		await renderGame();

		await user.click(
			libraryActions().getByRole("button", { name: /Want it/ })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Add to Want to Get"
		});
		const add = within(dialog).getByRole("button", { name: "Add" });
		expect(add).toBeDisabled();

		const pc = within(dialog).getByRole("radio", { name: "PC" });
		await user.click(pc);
		expect(pc).toBeChecked();
		expect(add).toBeEnabled();
		await user.click(add);

		await untilVisible(() =>
			expect(
				libraryActions().getByRole("button", { name: /Wanted/ })
			).toHaveAttribute("aria-pressed", "true")
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(wishlistAdds).toEqual([{ gameId: "g1", platformId: "p1" }]);
	});
});
